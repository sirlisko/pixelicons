import { describe, expect, test } from "vitest";
import { isRamp, nearestIn, pixelSvg, snapToPalette } from "../src/index.ts";

const GAMEBOY = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];
const PICO8 = [
	"#000000",
	"#1d2b53",
	"#7e2553",
	"#008751",
	"#ab5236",
	"#5f574f",
	"#c2c3c7",
	"#fff1e8",
	"#ff004d",
	"#ffa300",
	"#ffec27",
	"#00e436",
	"#29adff",
	"#83769c",
	"#ff77a8",
	"#ffccaa",
];

const flag = pixelSvg(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="2" height="4" fill="#e63946"/><rect x="2" width="2" height="4" fill="#1d3557"/></svg>`,
	{ grid: 4 },
);

describe("isRamp", () => {
	test("treats shades of one hue as a ramp", () => {
		expect(isRamp(GAMEBOY)).toBe(true);
		expect(isRamp(["#000000", "#555555", "#aaaaaa", "#ffffff"])).toBe(true);
	});

	test("treats a palette of many hues as full colour", () => {
		expect(isRamp(PICO8)).toBe(false);
	});
});

describe("nearestIn", () => {
	test("matches full-colour palettes by hue and lightness", () => {
		const nearest = nearestIn(PICO8);

		expect(nearest("#e63946")).toBe("#ff004d");
		expect(nearest("#1d3557")).toBe("#1d2b53");
	});

	test("matches ramps by lightness, black and white on its ends", () => {
		const nearest = nearestIn(GAMEBOY);

		expect(nearest("#000000")).toBe("#0f380f");
		expect(nearest("#ffffff")).toBe("#9bbc0f");
		expect(nearest("#ff0000")).toBe(nearest("#8a8a8a"));
	});
});

describe("snapToPalette", () => {
	test("repaints each layer with its nearest palette colour", () => {
		const snapped = snapToPalette(flag, PICO8);

		expect(snapped.layers?.map((l) => l.fill)).toEqual(["#ff004d", "#1d2b53"]);
		expect(snapped.d).toBe(flag.d);
	});

	test("merges colours that land on the same palette colour", () => {
		const snapped = snapToPalette(flag, ["#cc0000", "#00ffff"]);

		expect(snapped.layers).toHaveLength(1);
		expect(snapped.layers?.[0].fill).toBe("#cc0000");
	});

	test("leaves single-colour sprites alone", () => {
		const mono = pixelSvg(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect x="1" y="1" width="2" height="2"/></svg>`,
			{ grid: 4 },
		);

		expect(snapToPalette(mono, PICO8)).toBe(mono);
	});
});
