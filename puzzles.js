// Original classroom challenge pack, normalized to 4-colour decode levels.
window.BINARY_MOSAIC_PRESETS = (() => {
  const patterns = {
    checker(size, values = [0, 1, 2, 3]) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        return values[(row + col) % values.length];
      });
    },
    border(size) {
      const cells = Array(size * size).fill(0);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const idx = r * size + c;
          if (r === 0 || c === 0 || r === size - 1 || c === size - 1) cells[idx] = 1;
          if ((r === 0 || r === size - 1) && (c === 0 || c === size - 1)) cells[idx] = 3;
          if (r > 1 && r < size - 2 && c > 1 && c < size - 2) cells[idx] = 2;
        }
      }
      return cells;
    },
    diagonal(size) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        if (row === col) return 1;
        if (row + col === size - 1) return 2;
        if ((row + col) % 3 === 0) return 3;
        return 0;
      });
    },
    verticalBars(size) {
      return Array.from({ length: size * size }, (_, i) => {
        const col = i % size;
        return Math.floor((col / size) * 4) % 4;
      });
    },
    stripes(size) {
      return Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        return row % 4;
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
    },
    ring(size) {
      const cells = Array(size * size).fill(0);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const idx = r * size + c;
          if (r < 2 || c < 2 || r > size - 3 || c > size - 3) cells[idx] = 1;
          if (r > 2 && c > 2 && r < size - 3 && c < size - 3) cells[idx] = 2;
          if (r > 5 && c > 5 && r < size - 6 && c < size - 6) cells[idx] = 3;
        }
      }
      return cells;
    }
  };

  return [
    { title: 'Easy 1', size: 8, bitDepth: 2, mode: 'paint', cells: patterns.checker(8) },
    { title: 'Easy 2', size: 8, bitDepth: 2, mode: 'paint', cells: patterns.border(8) },
    { title: 'Easy 3', size: 8, bitDepth: 2, mode: 'typeBits', cells: patterns.diagonal(8) },
    { title: 'Easy 4', size: 8, bitDepth: 2, mode: 'paint', cells: patterns.verticalBars(8) },
    { title: 'Medium 1', size: 12, bitDepth: 2, mode: 'paint', cells: patterns.stripes(12) },
    { title: 'Medium 2', size: 12, bitDepth: 2, mode: 'typeBits', cells: patterns.blocks(12) },
    { title: 'Hard 1', size: 16, bitDepth: 2, mode: 'paint', cells: patterns.checker(16, [0, 1, 2, 3]) },
    { title: 'Hard 2', size: 16, bitDepth: 2, mode: 'typeBits', cells: patterns.ring(16) }
  ];
})();
