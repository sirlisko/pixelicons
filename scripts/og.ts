import { mkdirSync, writeFileSync } from "node:fs";
import type { IconifyJSON } from "@iconify/types";
import { Resvg } from "@resvg/resvg-js";
import { PALETTES } from "../demo/palettes.ts";
import { iconSvg, pixelSvg, snapToPalette } from "../src/index.ts";

const W = 1200;
const H = 630;
const PAD = 80;
const BG = "#f6f5f0";
const FG = "#1b1b19";
const MUTED = "#6f6c64";
const ACCENT = "#d9480f";
const TILE_BG = "#ebe9e1";

const ICON = "fluent-emoji-flat:rocket";
const TILE = 300;
const TILE_Y = 250;
const GAP = (W - 2 * PAD - 3 * TILE) / 2;

// 5×9 lowercase glyphs: two ascender rows, five x-height rows, two descender rows.
const GLYPHS: Record<string, string[]> = {
	p: ["", "", "####", "#   #", "#   #", "#   #", "####", "#", "#"],
	i: ["  #", "", " ##", "  #", "  #", "  #", " ###"],
	x: ["", "", "#   #", " # #", "  #", " # #", "#   #"],
	e: ["", "", " ###", "#   #", "#####", "#", " ####"],
	l: [" ##", "  #", "  #", "  #", "  #", "  #", " ###"],
	c: ["", "", " ####", "#", "#", "#", " ####"],
	o: ["", "", " ###", "#   #", "#   #", "#   #", " ###"],
	n: ["", "", "####", "#   #", "#   #", "#   #", "#   #"],
	s: ["", "", " ####", "#", " ###", "    #", "####"],
};

const pixelText = (text: string) => {
	let d = "";
	[...text].forEach((ch, i) => {
		GLYPHS[ch]?.forEach((row, y) => {
			for (let x = 0; x < row.length; x++) if (row[x] === "#") d += `M${i * 6 + x} ${y}h1v1h-1z`;
		});
	});
	return d;
};

// Colour sets are big, so take the one icon from the API, as the page does, rather than install the set.
const [prefix, name] = ICON.split(":");
const res = await fetch(`https://api.iconify.design/${prefix}.json?icons=${name}`);
if (!res.ok) throw new Error(`Iconify API: ${res.status}`);
const source = iconSvg(ICON, (await res.json()) as IconifyJSON);

// Icons leave margins inside their viewBox, so the tiles get a backdrop to read as squares like the page's.
const backdrop = (x: number) => `<rect x="${x}" y="${TILE_Y}" width="${TILE}" height="${TILE}" fill="${TILE_BG}"/>`;
const INSET = 30;

const vectorTile = (x: number) =>
	`${backdrop(x)}<image x="${x + INSET}" y="${TILE_Y + INSET}" width="${TILE - 2 * INSET}" height="${TILE - 2 * INSET}" href="data:image/svg+xml;base64,${Buffer.from(source).toString("base64")}"/>`;

const spriteTile = (x: number, grid: number, colors: string[] = []) => {
	const { layers = [] } = snapToPalette(pixelSvg(source, { grid }), colors);
	const body = layers.map(({ fill, d }) => `<path fill="${fill}" d="${d}"/>`).join("");
	const scale = (TILE - 2 * INSET) / grid;
	return `${backdrop(x)}<g transform="translate(${x + INSET} ${TILE_Y + INSET}) scale(${scale})">${body}</g>`;
};

const TITLE_SCALE = 10;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
<rect width="${W}" height="${H}" fill="${BG}"/>
<g transform="translate(${PAD} ${PAD - 20}) scale(${TITLE_SCALE})" fill="${ACCENT}"><path d="${pixelText("pixelicons")}"/></g>
<g font-family="Menlo, monospace" fill="${FG}">
<text x="${PAD}" y="200" font-size="30">Any Iconify icon, redrawn as pixel art.</text>
</g>
${vectorTile(PAD)}
${spriteTile(PAD + TILE + GAP, 24)}
${spriteTile(PAD + 2 * (TILE + GAP), 24, PALETTES["original-gameboy"].colors)}
<g font-family="Menlo, monospace" font-size="20" fill="${MUTED}">
<text x="${PAD}" y="${TILE_Y + TILE + 32}">Original</text>
<text x="${PAD + TILE + GAP}" y="${TILE_Y + TILE + 32}">Its own colours · 24px</text>
<text x="${PAD + 2 * (TILE + GAP)}" y="${TILE_Y + TILE + 32}">Game Boy · 24px</text>
<text x="${W - PAD}" y="${PAD + 30}" text-anchor="end">pixelicons.sirlisko.com</text>
</g>
</svg>`;
const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "Menlo" } }).render().asPng();
mkdirSync("demo/public", { recursive: true });
writeFileSync("demo/public/og.png", png);
console.log(`demo/public/og.png ${png.length} bytes`);
