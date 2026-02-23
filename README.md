# Binary Mosaic web game

Binary Mosaic is a static, browser-only classroom game for teaching binary image representation.

## Files
- `index.html` – app structure and UI.
- `styles.css` – layout, responsive styles, high contrast mode, legend swatches.
- `app.js` – game logic, level progression, validation, scoring, accessibility controls.
- `puzzles.js` – built-in puzzle definitions.

## Teacher quick start
1. Open `index.html` in any modern browser.
2. In **Create/Encode**:
   - Choose grid size: 8x8, 12x12, 16x16.
   - Choose 1-bit or 2-bit palette.
   - Click cells to paint one at a time (no brush drag painting).
   - Pupils type their own legend + bitstream answers.
   - Click **Check my legend + bitstream** for feedback.
3. In **Decode/Challenge**:
   - Read the built-in tutorial panel first.
   - Click **Start levels** to begin from easiest to hardest automatically.
   - Bitstream tokens are displayed directly inside decode canvas cells.
   - Pupils use the side legend to choose colours and paint matching cells.
   - Click **Check**; correct answers automatically move to the next level.

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
- Legend format checking (`bits=valueIndex`).
- Bitstream length checking against grid size and bit depth.
- Friendly error messages shown in UI status areas.

## GitHub Pages deployment
1. Push to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)`.
5. Save and open the Pages URL.

No accounts, tracking, or server are required.
