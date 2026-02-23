(() => {
  const DEFAULT_PALETTES = {
    standard: {
      1: ['#dbeafe', '#111827'],
      2: ['#dbeafe', '#2563eb', '#f97316', '#111827']
    },
    colorBlind: {
      1: ['#d9f0ff', '#00429d'],
      2: ['#d9f0ff', '#3b4cc0', '#73a2c6', '#e1a692']
    }
  };

  const state = {
    colorBlind: false,
    decode: {
      levelIndex: -1,
      size: 8,
      bitDepth: 1,
      targetCells: [],
      playerCells: [],
      bitTokens: [],
      selectedValue: 0,
      cursorIndex: 0,
      mode: 'idle',
      timerEnabled: true,
      startedAt: null,
      timerId: null
    }
  };

  const el = {
    decodeGrid: document.getElementById('decodeGrid'),
    decodeLegend: document.getElementById('decodeLegend'),
    paintPalette: document.getElementById('paintPalette'),
    startLevelsBtn: document.getElementById('startLevelsBtn'),
    startChallengeBtn: document.getElementById('startChallengeBtn'),
    checkChallengeBtn: document.getElementById('checkChallengeBtn'),
    levelStatus: document.getElementById('levelStatus'),
    decodeStatus: document.getElementById('decodeStatus'),
    scoreOutput: document.getElementById('scoreOutput'),
    timerToggle: document.getElementById('timerToggle'),
    showMistakesToggle: document.getElementById('showMistakesToggle'),
    timerOutput: document.getElementById('timerOutput'),
    colorBlindToggle: document.getElementById('colorBlindToggle'),
    highContrastToggle: document.getElementById('highContrastToggle'),
    decodeTutorial: document.getElementById('decodeTutorial')
  };

  function bitCodes(bitDepth) {
    return bitDepth === 1 ? ['0', '1'] : ['00', '01', '10', '11'];
  }

  function getPalette(bitDepth) {
    return (state.colorBlind ? DEFAULT_PALETTES.colorBlind : DEFAULT_PALETTES.standard)[bitDepth];
  }

  function setStatus(target, message, isError = false) {
    target.textContent = message;
    target.style.color = isError ? '#b91c1c' : '';
  }

  function createGridCells(size, cells, wrongIndexes = new Set(), labels = []) {
    el.decodeGrid.style.setProperty('--grid-size', size);
    el.decodeGrid.innerHTML = '';
    const palette = getPalette(state.decode.bitDepth);

    for (let idx = 0; idx < cells.length; idx++) {
      const cell = document.createElement('button');
      cell.className = 'pixel-cell';
      if (idx === state.decode.cursorIndex) cell.classList.add('cursor');
      if (wrongIndexes.has(idx)) cell.classList.add('wrong');
      cell.style.background = palette[cells[idx]] || '#fff';
      cell.textContent = labels[idx] || '';
      if (labels[idx]) {
        cell.classList.add('token-cell');
        cell.classList.toggle('token-dark', cells[idx] > 0);
      }
      cell.addEventListener('click', () => {
        if (state.decode.mode !== 'challenge') return;
        state.decode.playerCells[idx] = state.decode.selectedValue;
        state.decode.cursorIndex = idx;
        renderDecodeGrid();
      });
      el.decodeGrid.appendChild(cell);
    }
  }

  function renderDecodeLegend() {
    const codes = bitCodes(state.decode.bitDepth);
    const palette = getPalette(state.decode.bitDepth);
    el.decodeLegend.innerHTML = '';

    codes.forEach((bits, value) => {
      const row = document.createElement('div');
      row.className = 'legend-row';
      row.innerHTML = `<span class="legend-bits">${bits}</span><span class="legend-swatch" style="background:${palette[value]}"></span>`;
      el.decodeLegend.appendChild(row);
    });
  }

  function renderPaintPalette() {
    const palette = getPalette(state.decode.bitDepth);
    el.paintPalette.innerHTML = '';
    palette.forEach((color, value) => {
      const btn = document.createElement('button');
      btn.className = `palette-chip ${state.decode.selectedValue === value ? 'selected' : ''}`;
      btn.style.background = color;
      btn.title = `Paint colour ${value}`;
      btn.addEventListener('click', () => {
        state.decode.selectedValue = value;
        renderPaintPalette();
      });
      el.paintPalette.appendChild(btn);
    });
  }

  function startTimer() {
    clearInterval(state.decode.timerId);
    if (!state.decode.timerEnabled || state.decode.mode !== 'challenge') {
      el.timerOutput.textContent = 'Timer: 0s';
      return;
    }
    state.decode.startedAt = Date.now();
    state.decode.timerId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.decode.startedAt) / 1000);
      el.timerOutput.textContent = `Timer: ${elapsed}s`;
    }, 500);
  }

  function loadLevel(index) {
    if (index >= window.BINARY_MOSAIC_PRESETS.length) {
      clearInterval(state.decode.timerId);
      state.decode.mode = 'idle';
      el.levelStatus.textContent = 'All levels complete.';
      setStatus(el.decodeStatus, '🎉 You completed all levels!');
      return;
    }

    const preset = window.BINARY_MOSAIC_PRESETS[index];
    const codes = bitCodes(preset.bitDepth);
    state.decode.levelIndex = index;
    state.decode.size = preset.size;
    state.decode.bitDepth = preset.bitDepth;
    state.decode.targetCells = [...preset.cells];
    state.decode.playerCells = Array(preset.size * preset.size).fill(0);
    state.decode.bitTokens = preset.cells.map((value) => codes[value]);
    state.decode.selectedValue = 0;
    state.decode.cursorIndex = 0;
    state.decode.mode = 'challenge';

    el.levelStatus.textContent = `Level ${index + 1} of ${window.BINARY_MOSAIC_PRESETS.length}: ${preset.title}`;
    el.scoreOutput.textContent = '';
    renderDecodeLegend();
    renderPaintPalette();
    renderDecodeGrid();
    startTimer();
    setStatus(el.decodeStatus, 'Decode using the side legend and your selected paint colour.');
  }

  function renderDecodeGrid(wrongIndexes) {
    createGridCells(state.decode.size, state.decode.playerCells, wrongIndexes, state.decode.bitTokens);
  }

  function checkChallenge() {
    if (state.decode.mode !== 'challenge') return setStatus(el.decodeStatus, 'Press Start levels first.', true);

    let correct = 0;
    const wrong = new Set();
    state.decode.playerCells.forEach((value, idx) => {
      if (value === state.decode.targetCells[idx]) correct += 1;
      else wrong.add(idx);
    });

    const pct = Math.round((correct / state.decode.targetCells.length) * 100);
    const elapsed = state.decode.startedAt ? Math.floor((Date.now() - state.decode.startedAt) / 1000) : 0;
    const score = Math.max(0, Math.round(pct * 10 - elapsed));
    el.scoreOutput.textContent = `Correct: ${pct}% (${correct}/${state.decode.targetCells.length}) | Time: ${elapsed}s | Score: ${score}`;

    if (el.showMistakesToggle.checked) renderDecodeGrid(wrong);
    if (pct === 100) {
      setStatus(el.decodeStatus, 'Correct! Moving to next level...');
      setTimeout(() => loadLevel(state.decode.levelIndex + 1), 700);
    } else {
      setStatus(el.decodeStatus, 'Not correct yet. Fix highlighted cells and check again.', true);
    }
  }

  function handleKeyboard(event) {
    const size = state.decode.size;
    const row = Math.floor(state.decode.cursorIndex / size);
    const col = state.decode.cursorIndex % size;

    if (event.key === 'ArrowUp' && row > 0) state.decode.cursorIndex -= size;
    else if (event.key === 'ArrowDown' && row < size - 1) state.decode.cursorIndex += size;
    else if (event.key === 'ArrowLeft' && col > 0) state.decode.cursorIndex -= 1;
    else if (event.key === 'ArrowRight' && col < size - 1) state.decode.cursorIndex += 1;
    else if (event.key === ' ' || event.key === 'Enter') {
      if (state.decode.mode !== 'challenge') return;
      state.decode.playerCells[state.decode.cursorIndex] = state.decode.selectedValue;
    } else return;

    event.preventDefault();
    renderDecodeGrid();
  }

  function bindEvents() {
    el.startLevelsBtn.addEventListener('click', () => {
      if (el.decodeTutorial.open) el.decodeTutorial.open = false;
      loadLevel(0);
    });

    el.startChallengeBtn.addEventListener('click', () => {
      if (state.decode.levelIndex < 0) return setStatus(el.decodeStatus, 'Start levels first.', true);
      state.decode.playerCells = Array(state.decode.size * state.decode.size).fill(0);
      state.decode.mode = 'challenge';
      renderDecodeGrid();
      startTimer();
      setStatus(el.decodeStatus, 'Level reset. Decode the bitstream again.');
    });

    el.checkChallengeBtn.addEventListener('click', checkChallenge);

    el.timerToggle.addEventListener('change', () => {
      state.decode.timerEnabled = el.timerToggle.checked;
      startTimer();
    });

    el.colorBlindToggle.addEventListener('change', () => {
      state.colorBlind = el.colorBlindToggle.checked;
      renderDecodeLegend();
      renderPaintPalette();
      renderDecodeGrid();
    });

    el.highContrastToggle.addEventListener('change', () => {
      document.body.classList.toggle('high-contrast', el.highContrastToggle.checked);
    });

    el.decodeGrid.addEventListener('keydown', handleKeyboard);
  }

  function init() {
    state.decode.playerCells = Array(state.decode.size * state.decode.size).fill(0);
    state.decode.bitTokens = Array(state.decode.size * state.decode.size).fill('');
    bindEvents();
    renderDecodeLegend();
    renderPaintPalette();
    renderDecodeGrid();
    el.levelStatus.textContent = 'Read the tutorial, then press Start levels.';
    setStatus(el.decodeStatus, 'Tutorial first, then start level 1.');
  }

  init();
})();
