# Binary Mosaic decode game

Binary Mosaic is a static, browser-only classroom decode game for teaching binary image representation.

## Files
- `index.html` – decode game UI.
- `styles.css` – layout, responsive styles, high contrast mode, legend swatches.
- `app.js` – decode gameplay logic, level progression, validation, scoring, accessibility controls.
- `puzzles.js` – built-in puzzle definitions.

## Teacher quick start
1. Open `index.html` in any modern browser.
2. Read the built-in tutorial in the Decode panel.
3. Click **Start levels** to begin from easiest to hardest.
4. Some levels are **Paint mode**: students read bit tokens in cells and paint with the selected colour.
5. Some levels are **Type bits mode**: the image is already painted and students type binary tokens into each cell.
6. Students use the side legend (`bits -> colour`) for both modes.
7. Timer tracks total run time across all levels; **Check** auto-advances when correct.

## Classroom tips
- Start with level 1 (8x8, 1-bit) and progress in order.
- Use timer for extension tasks.
- Turn on colour-blind palette and high contrast mode if needed.

## Customisation guide for teachers
In `app.js`, tweak:
- Colour palettes in `DEFAULT_PALETTES`.
- Bit code mapping in `bitCodes()`.
- Score formula in `checkChallenge()`.

In `puzzles.js`, add/edit puzzle objects:
- `title`, `size`, `bitDepth`, `cells`.

## Validation included
- Friendly status/error feedback in the UI.
- Check compares painted cells with expected level cells.

## GitHub Pages deployment
1. Push to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)`.
5. Save and open the Pages URL.

No accounts, tracking, or server are required.
