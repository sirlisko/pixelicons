import type { Layer, PixelResult } from "./core.ts";

type Rgb = [number, number, number];
type Lab = [number, number, number];

const fromHex = (hex: string): Rgb => {
	const h = hex.replace("#", "");
	return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb;
};

const toLinear = (c: number) => {
	const v = c / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Perceptual lightness and hue axes, so "nearest" matches what the eye sees rather than RGB distance. */
export const oklab = ([r, g, b]: Rgb): Lab => {
	const [lr, lg, lb] = [r, g, b].map(toLinear);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
};

// Below this chroma a colour is a grey, and its hue is noise.
const GREY = 0.03;
// How tightly the hues must agree (1 = identical) for the palette to count as one hue.
const ONE_HUE = 0.9;

/**
 * True when the palette is shades of a single hue, like the Game Boy's greens. Matching those by hue would send
 * every colour to the same shade, so they're matched by lightness instead.
 */
export const isRamp = (colors: string[]) => {
	const hues = colors
		.map((c) => oklab(fromHex(c)))
		.filter(([, a, b]) => Math.hypot(a, b) > GREY)
		.map(([, a, b]) => Math.atan2(b, a));
	if (hues.length < 2) return true;
	const x = hues.reduce((sum, h) => sum + Math.cos(h), 0) / hues.length;
	const y = hues.reduce((sum, h) => sum + Math.sin(h), 0) / hues.length;
	return Math.hypot(x, y) > ONE_HUE;
};

/** Returns a function that maps a hex colour to the nearest palette colour. */
export const nearestIn = (colors: string[]) => {
	const labs = colors.map((c) => oklab(fromHex(c)));
	if (isRamp(colors)) {
		const levels = labs.map(([l]) => l);
		const min = Math.min(...levels);
		const max = Math.max(...levels);
		return (hex: string) => {
			// Spread black-to-white across the ramp, so black lands on its darkest shade and white on its lightest.
			const l = min + oklab(fromHex(hex))[0] * (max - min);
			let best = 0;
			for (let i = 1; i < levels.length; i++) if (Math.abs(levels[i] - l) < Math.abs(levels[best] - l)) best = i;
			return colors[best];
		};
	}
	return (hex: string) => {
		const [l, a, b] = oklab(fromHex(hex));
		let best = 0;
		let bestDist = Number.POSITIVE_INFINITY;
		labs.forEach(([pl, pa, pb], i) => {
			const dist = (l - pl) ** 2 + (a - pa) ** 2 + (b - pb) ** 2;
			if (dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		});
		return colors[best];
	};
};

/**
 * Repaints a colour sprite with the palette: each of the icon's own colours becomes its nearest palette colour, and
 * colours that land on the same one merge. Single-colour sprites are returned as they are, since they take their
 * colour from wherever they're used.
 */
export const snapToPalette = (result: PixelResult, colors: string[]): PixelResult => {
	if (!result.layers || !colors.length) return result;
	const nearest = nearestIn(colors);
	const merged = new Map<string, string>();
	for (const { fill, d } of result.layers) {
		const target = fill === "currentColor" ? fill : nearest(fill);
		merged.set(target, (merged.get(target) ?? "") + d);
	}
	const layers: Layer[] = [...merged].map(([fill, d]) => ({ fill, d }));
	return { ...result, layers };
};
