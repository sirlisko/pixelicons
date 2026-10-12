# Notes

Last updated 2026-10-12.

## Where it came from

`src/lib/pixelIcon.ts` in sirlisko.com ([PR #61](https://github.com/sirlisko/sirlisko.com/pull/61)) turned five Lucide icons into 16×16 sprites with sharp. This repo does the same for any Iconify icon.

## Decisions

- **The page is the product, no npm package for now** (2026-10-08). Most people want a handful of icons, and the page gives them that with nothing to install. A bare `pixelIcon()` adds little without a build integration, and the 2px-line problem below may still change the output. The core is still a clean module, so publishing later is about an hour of work. If people keep asking for a package in the issues, do it.
- **Palettes cap at 35 colours.** Edits store a swatch index as one base-36 character in the URL, and single-colour icons need one slot for Ink. Going bigger means changing the link format.
- **Edits are kept per grid size and palette**, because a swatch index means a different colour under another palette.

## Setup

- Repo github.com/sirlisko/pixelicons, public because Pages needs it on the current plan. It was `iconify-pixel` until 2026-10-08; GitHub redirects the old name.
- Pushes to `main` type-check, test, build and deploy to Pages.
- pixelicons.sirlisko.com is a Cloudflare CNAME to `sirlisko.github.io`, DNS only. The custom domain is set in the repo's Pages settings, and `vite.config.ts` uses `base: "/"`.

## Things I learned

- The core matches the site's sharp pipeline: 2 of 1,280 pixels differ across the five site icons at `ink=100` (`pnpm parity`).
- resvg scans every system font on each render, about 190 ms per icon. `loadSystemFonts: false` brings it to about 0.2 ms.
- resvg-js is a native Node binding. The browser needs `@resvg/resvg-wasm`, same API plus `initWasm`.
- resvg refuses invalid XML, such as duplicate attributes or a missing `xmlns`. SVGs copied from lucide.dev set `stroke-width` on the root, and we used to add a second one.
- resvg's pixels are premultiplied, so divide by alpha before matching colours.
- Lospec's palette JSON allows any origin, but its 404s don't, so in the browser a missing palette looks like a network error.
- Lospec's colour-count filter can't be set from a link.
- How many icons come out recognisable, judged by eye on 96 random icons per set: Lucide 80–85%, Tabler outline about 75%, Phosphor regular about 60% (fill mode, looks heavy), emoji sets good. The automatic flags in `pnpm sheet` catch almost nothing.
- What usually goes wrong: small corner badges (`$`, `×`, cog), text inside icons, dense patterns, filled sets.

## Known problems and ideas

1. **Lines on pixel boundaries come out 2px wide.** The biggest quality issue. A 24-unit icon on a 16px grid scales by 2/3, so a line at x=18 lands exactly on a pixel edge, both pixels get about 50% alpha, both pass `ink=100`. `lucide:a-arrow-down` in the overlay shows it. Ideas: keep only one of two neighbouring ~50% pixels (always left or top), nudge the geometry half a pixel before rendering, or thin the mask. Check any fix with `pnpm parity` and the contact sheets.
2. **Colour mode** loses thin details drawn in a minority colour, snaps gradients to their nearest stop, and ignores named colours (other than black and white) and colours set through CSS classes.
3. **Corner badges**: detect small separate shapes in a corner and drop them.
4. **Filled sets**: try a higher `ink`, or an outline-only pass.
5. **Editor**: flood fill, and keeping edits when the grid size changes.
6. Write a short post on sirlisko.com about the page. It's the cheapest way to find out whether anyone wants a package.

## Image prototype (2026-10-12)

Before adding palettes I tried turning photos into palette-limited pixel art, with a throwaway sharp script: book covers, the Moon and Rainy London screenshots, a lake, a pizza, my avatar. What I found:

- Stretch the contrast first (1st to 99th percentile of lightness). Without it, dark images land on one or two shades.
- For single-hue palettes, work on lightness alone, dithering included. Spreading the error in RGB while picking by lightness smears colour across the whole image.
- Don't dither where a 3×3 area is flat (gradients turn into checkerboards) or a strong edge (halos). Edge detection on lightness alone misses edges where only the hue changes, like skin against blue.
- Dithering helps the Game Boy palette and never helps Endesga 32. With 32 colours there's always one close enough, and dithering just adds speckle.
- Photos and illustrations work. UI screenshots don't.
- For pixelkitchen dishes, a straight conversion isn't enough. It also needs background removal, a cap on the number of colours and a 1px outline, and no dithering.
