// Preset classroom challenges.
// Teachers can tweak these by editing sizes, bit depth, and cell pattern functions.
window.BINARY_MOSAIC_PRESETS = (() => {
  const patterns = {
    checker(size, values = [0, 1]) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        return values[(row + col) % values.length];
      });
    },
    border(size, fill = 0, edge = 1) {
      const cells = Array(size * size).fill(fill);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (r === 0 || c === 0 || r === size - 1 || c === size - 1) cells[r * size + c] = edge;
        }
      }
      return cells;
    },
    diagonal(size, a = 0, b = 1) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        return row === col || row + col === size - 1 ? b : a;
      });
    },
    stripes(size, values = [0, 1, 2, 3]) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        return values[row % values.length];
      });
    },
    blocks(size) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        if (row < size / 2 && col < size / 2) return 0;
        if (row < size / 2) return 1;
        if (col < size / 2) return 2;
        return 3;
      });
    }
  };

  return [
    { title: 'Easy: Checkerboard', size: 8, bitDepth: 1, cells: patterns.checker(8) },
    { title: 'Easy: Border Box', size: 8, bitDepth: 1, cells: patterns.border(8) },
    { title: 'Easy: X Marks', size: 8, bitDepth: 1, cells: patterns.diagonal(8) },
    { title: 'Easy: Vertical Bars', size: 8, bitDepth: 1, cells: Array.from({ length: 64 }, (_, i) => (i % 8 < 4 ? 0 : 1)) },
    { title: 'Medium: Colour Stripes', size: 12, bitDepth: 2, cells: patterns.stripes(12) },
    { title: 'Medium: Quarter Blocks', size: 12, bitDepth: 2, cells: patterns.blocks(12) },
    { title: 'Hard: Four-Way Checker', size: 16, bitDepth: 2, cells: patterns.checker(16, [0, 1, 2, 3]) },
    { title: 'Hard: Ring Pattern', size: 16, bitDepth: 2, cells: (() => {
      const size = 16;
      const cells = Array(size * size).fill(0);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const idx = r * size + c;
          if (r < 2 || c < 2 || r > 13 || c > 13) cells[idx] = 1;
          if (r > 3 && c > 3 && r < 12 && c < 12) cells[idx] = 2;
          if (r > 5 && c > 5 && r < 10 && c < 10) cells[idx] = 3;
        }
      }
      return cells;
    })() }
  ];
})();
