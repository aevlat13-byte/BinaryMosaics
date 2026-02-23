(() => {
  // Teacher tweak: edit these palettes to change class colour choices.
  const DEFAULT_PALETTES = {
    standard: {
      1: ['#ffffff', '#111827'],
      2: ['#ffffff', '#2563eb', '#f97316', '#111827']
    },
    colorBlind: {
      1: ['#f7f7f7', '#00429d'],
      2: ['#f7f7f7', '#3b4cc0', '#73a2c6', '#e1a692']
    }
  };

  const state = {
    activeTab: 'encodeTab',
    colorBlind: false,
    encode: {
      size: 16,
      bitDepth: 1,
      cells: [],
      selectedValue: 1,
      tool: 'paint',
      cursorIndex: 0
    },
    decode: {
      levelIndex: -1,
      size: 8,
      bitDepth: 1,
      targetCells: [],
      playerCells: [],
      mode: 'idle',
      cursorIndex: 0,
      timerEnabled: true,
      startedAt: null,
      timerId: null
    }
  };

  const el = {
    tabs: document.querySelectorAll('.tab-button'),
    panels: document.querySelectorAll('.tab-panel'),
    encodeGrid: document.getElementById('encodeGrid'),
    decodeGrid: document.getElementById('decodeGrid'),
    encodeGridSize: document.getElementById('encodeGridSize'),
    encodeBitDepth: document.querySelectorAll('input[name="encodeBitDepth"]'),
    encodePalette: document.getElementById('encodePalette'),
    toolPaint: document.getElementById('toolPaint'),
    toolEraser: document.getElementById('toolEraser'),
    clearGridBtn: document.getElementById('clearGridBtn'),
    fillAllBtn: document.getElementById('fillAllBtn'),
    studentLegendInput: document.getElementById('studentLegendInput'),
    studentBitstreamInput: document.getElementById('studentBitstreamInput'),
    checkEncodeAnswerBtn: document.getElementById('checkEncodeAnswerBtn'),
    legendOutput: document.getElementById('legendOutput'),
    encodeStatus: document.getElementById('encodeStatus'),
    decodeStatus: document.getElementById('decodeStatus'),
    legendInput: document.getElementById('legendInput'),
    bitstreamInput: document.getElementById('bitstreamInput'),
    startChallengeBtn: document.getElementById('startChallengeBtn'),
    checkChallengeBtn: document.getElementById('checkChallengeBtn'),
    timerToggle: document.getElementById('timerToggle'),
    showMistakesToggle: document.getElementById('showMistakesToggle'),
    timerOutput: document.getElementById('timerOutput'),
    scoreOutput: document.getElementById('scoreOutput'),
    colorBlindToggle: document.getElementById('colorBlindToggle'),
    highContrastToggle: document.getElementById('highContrastToggle'),
    startLevelsBtn: document.getElementById('startLevelsBtn'),
    levelStatus: document.getElementById('levelStatus'),
    decodeTutorial: document.getElementById('decodeTutorial')
  };

  // Teacher tweak: bit patterns for each mode. Keep these aligned with bitDepth values.
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

  function cleanBitstream(raw) {
    return raw.replace(/[^01]/g, '');
  }

  function buildLegendPairs(bitDepth) {
    const colors = getPalette(bitDepth);
    return bitCodes(bitDepth).map((code, idx) => ({ code, value: idx, color: colors[idx] }));
  }

  function renderLegendSwatches(bitDepth) {
    el.legendOutput.innerHTML = '';
    buildLegendPairs(bitDepth).forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'legend-row';
      row.innerHTML = `<span class="legend-bits">${entry.code}</span><span class="legend-swatch" style="background:${entry.color}"></span>`;
      el.legendOutput.appendChild(row);
    });
  }

  function legendToIndexText(bitDepth) {
    return buildLegendPairs(bitDepth).map((entry) => `${entry.code}=${entry.value}`).join('\n');
  }

  function parseLegend(text) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const map = {};

    for (const line of lines) {
      const [bits, valueStr] = line.split('=').map((part) => part && part.trim());
      if (!bits || valueStr === undefined || !/^[01]+$/.test(bits) || !/^\d+$/.test(valueStr)) {
        return { error: `Invalid legend line: "${line}". Use format like 00=0.` };
      }
      map[bits] = Number(valueStr);
    }

    const codes = Object.keys(map);
    const widths = [...new Set(codes.map((bits) => bits.length))];
    if (widths.length !== 1 || ![1, 2].includes(widths[0])) {
      return { error: 'Legend codes must all be length 1 or 2.' };
    }

    const bitDepth = widths[0];
    const requiredCodes = bitCodes(bitDepth);
    if (codes.length !== requiredCodes.length || requiredCodes.some((code) => !(code in map))) {
      return { error: 'Legend must include every binary code for the selected bit depth.' };
    }

    const maxValue = Math.pow(2, bitDepth) - 1;
    if (Object.values(map).some((value) => value < 0 || value > maxValue)) {
      return { error: `Legend values must be between 0 and ${maxValue}.` };
    }

    return { map, bitDepth };
  }

  function encodeCellsToBitstream(cells, bitDepth, size, breakRows) {
    const codes = bitCodes(bitDepth);
    if (!breakRows) return cells.map((value) => codes[value]).join('');

    const rows = [];
    for (let r = 0; r < size; r++) {
      rows.push(cells.slice(r * size, (r + 1) * size).map((value) => codes[value]).join(''));
    }

    return rows.join('\n');
  }

  function decodeBitstream(stream, size, bitDepth, legendMap) {
    const clean = cleanBitstream(stream);
    const expectedLength = size * size * bitDepth;
    if (clean.length !== expectedLength) {
      return { error: `Bitstream length ${clean.length} does not match expected ${expectedLength}.` };
    }

    const values = [];
    for (let i = 0; i < clean.length; i += bitDepth) {
      const bits = clean.slice(i, i + bitDepth);
      if (!(bits in legendMap)) return { error: `Bit pattern ${bits} is not in the legend.` };
      values.push(legendMap[bits]);
    }

    return { values };
  }

  function createGridCells(container, size, cells, onClickCell, cursorIndex, wrongIndexes = new Set()) {
    container.style.setProperty('--grid-size', size);
    container.innerHTML = '';
    const palette = getPalette(container === el.encodeGrid ? state.encode.bitDepth : state.decode.bitDepth);

    for (let idx = 0; idx < cells.length; idx++) {
      const cell = document.createElement('div');
      cell.className = 'pixel-cell';
      if (idx === cursorIndex) cell.classList.add('cursor');
      if (wrongIndexes.has(idx)) cell.classList.add('wrong');
      cell.style.background = palette[cells[idx]] || '#fff';
      cell.addEventListener('click', () => onClickCell(idx));
      container.appendChild(cell);
    }
  }

  function paintEncodeCell(idx) {
    state.encode.cells[idx] = state.encode.tool === 'eraser' ? 0 : state.encode.selectedValue;
    state.encode.cursorIndex = idx;
    renderEncodeGrid();
  }

  function paintDecodeCell(idx) {
    if (state.decode.mode !== 'challenge') return;
    state.decode.playerCells[idx] = (state.decode.playerCells[idx] + 1) % Math.pow(2, state.decode.bitDepth);
    state.decode.cursorIndex = idx;
    renderDecodeGrid();
  }

  function renderEncodeGrid() {
    createGridCells(el.encodeGrid, state.encode.size, state.encode.cells, paintEncodeCell, state.encode.cursorIndex);
  }

  function renderDecodeGrid(wrongIndexes) {
    createGridCells(el.decodeGrid, state.decode.size, state.decode.playerCells, paintDecodeCell, state.decode.cursorIndex, wrongIndexes);
  }

  function renderPalette() {
    el.encodePalette.innerHTML = '';
    const colors = getPalette(state.encode.bitDepth);

    colors.forEach((color, idx) => {
      const btn = document.createElement('button');
      btn.className = `palette-chip ${state.encode.selectedValue === idx ? 'selected' : ''}`;
      btn.style.background = color;
      btn.title = `Colour ${idx}`;
      btn.addEventListener('click', () => {
        state.encode.selectedValue = idx;
        state.encode.tool = 'paint';
        updateToolButtons();
        renderPalette();
      });
      el.encodePalette.appendChild(btn);
    });
  }

  function updateToolButtons() {
    el.toolPaint.classList.toggle('active', state.encode.tool === 'paint');
    el.toolEraser.classList.toggle('active', state.encode.tool === 'eraser');
  }

  function resetEncodeGrid() {
    state.encode.cells = Array(state.encode.size * state.encode.size).fill(0);
    state.encode.cursorIndex = 0;
    renderEncodeGrid();
    renderPalette();
    renderLegendSwatches(state.encode.bitDepth);
  }

  function checkStudentEncodeAnswer() {
    const parsedLegend = parseLegend(el.studentLegendInput.value);
    if (parsedLegend.error) {
      setStatus(el.encodeStatus, parsedLegend.error, true);
      return;
    }

    if (parsedLegend.bitDepth !== state.encode.bitDepth) {
      setStatus(el.encodeStatus, `Legend bit depth must be ${state.encode.bitDepth}-bit for this grid.`, true);
      return;
    }

    const expected = encodeCellsToBitstream(state.encode.cells, state.encode.bitDepth, state.encode.size, false);
    const decoded = decodeBitstream(el.studentBitstreamInput.value, state.encode.size, state.encode.bitDepth, parsedLegend.map);
    if (decoded.error) {
      setStatus(el.encodeStatus, decoded.error, true);
      return;
    }

    const submitted = cleanBitstream(el.studentBitstreamInput.value);
    if (submitted === expected) {
      setStatus(el.encodeStatus, '✅ Correct! Your legend and bitstream match the image.');
      return;
    }

    let correct = 0;
    const total = state.encode.cells.length;
    decoded.values.forEach((value, idx) => { if (value === state.encode.cells[idx]) correct += 1; });
    const pct = Math.round((correct / total) * 100);
    setStatus(el.encodeStatus, `Not quite yet: ${pct}% of cells decode correctly. Keep trying.`, true);
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
      setStatus(el.decodeStatus, '🎉 You completed all levels!');
      el.levelStatus.textContent = 'All levels complete.';
      return;
    }

    const preset = window.BINARY_MOSAIC_PRESETS[index];
    state.decode.levelIndex = index;
    state.decode.size = preset.size;
    state.decode.bitDepth = preset.bitDepth;
    state.decode.targetCells = [...preset.cells];
    state.decode.playerCells = Array(preset.size * preset.size).fill(0);
    state.decode.mode = 'challenge';
    state.decode.cursorIndex = 0;

    el.legendInput.value = legendToIndexText(preset.bitDepth);
    el.bitstreamInput.value = encodeCellsToBitstream(preset.cells, preset.bitDepth, preset.size, true);
    el.levelStatus.textContent = `Level ${index + 1} of ${window.BINARY_MOSAIC_PRESETS.length}: ${preset.title}`;
    el.scoreOutput.textContent = '';
    renderDecodeGrid();
    startTimer();
    setStatus(el.decodeStatus, 'Decode the bits by painting the grid, then press Check.');
  }

  // Teacher tweak: change scoring formula in this function if desired.
  function checkChallenge() {
    if (state.decode.mode !== 'challenge') {
      setStatus(el.decodeStatus, 'Press Start levels first.', true);
      return;
    }

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

  function handleKeyboard(event, board) {
    const isEncode = board === 'encode';
    const local = isEncode ? state.encode : state.decode;
    const size = local.size;
    const max = size * size - 1;
    const row = Math.floor(local.cursorIndex / size);
    const col = local.cursorIndex % size;

    if (event.key === 'ArrowUp' && row > 0) local.cursorIndex -= size;
    else if (event.key === 'ArrowDown' && row < size - 1) local.cursorIndex += size;
    else if (event.key === 'ArrowLeft' && col > 0) local.cursorIndex -= 1;
    else if (event.key === 'ArrowRight' && col < size - 1) local.cursorIndex += 1;
    else if ((event.key === ' ' || event.key === 'Enter') && local.cursorIndex <= max) {
      if (isEncode) paintEncodeCell(local.cursorIndex);
      else paintDecodeCell(local.cursorIndex);
    } else return;

    event.preventDefault();
    isEncode ? renderEncodeGrid() : renderDecodeGrid();
  }

  function bindEvents() {
    el.tabs.forEach((tab) => tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab;
      el.tabs.forEach((btn) => btn.classList.toggle('active', btn === tab));
      el.panels.forEach((panel) => panel.classList.toggle('active', panel.id === state.activeTab));
    }));

    el.encodeGridSize.addEventListener('change', () => {
      state.encode.size = Number(el.encodeGridSize.value);
      resetEncodeGrid();
    });

    el.encodeBitDepth.forEach((radio) => radio.addEventListener('change', () => {
      state.encode.bitDepth = Number(document.querySelector('input[name="encodeBitDepth"]:checked').value);
      state.encode.selectedValue = Math.min(state.encode.selectedValue, Math.pow(2, state.encode.bitDepth) - 1);
      resetEncodeGrid();
    }));

    el.toolPaint.addEventListener('click', () => { state.encode.tool = 'paint'; updateToolButtons(); });
    el.toolEraser.addEventListener('click', () => { state.encode.tool = 'eraser'; updateToolButtons(); });
    el.clearGridBtn.addEventListener('click', resetEncodeGrid);

    el.fillAllBtn.addEventListener('click', () => {
      state.encode.cells = state.encode.cells.map(() => (state.encode.tool === 'eraser' ? 0 : state.encode.selectedValue));
      renderEncodeGrid();
    });

    el.checkEncodeAnswerBtn.addEventListener('click', checkStudentEncodeAnswer);

    el.startLevelsBtn.addEventListener('click', () => {
      if (el.decodeTutorial.open) el.decodeTutorial.open = false;
      loadLevel(0);
    });

    el.startChallengeBtn.addEventListener('click', () => {
      if (state.decode.levelIndex < 0) {
        setStatus(el.decodeStatus, 'Start levels first.', true);
        return;
      }
      state.decode.playerCells = Array(state.decode.size * state.decode.size).fill(0);
      state.decode.mode = 'challenge';
      renderDecodeGrid();
      startTimer();
      setStatus(el.decodeStatus, 'Challenge restarted. Decode and paint again.');
    });

    el.checkChallengeBtn.addEventListener('click', checkChallenge);

    el.timerToggle.addEventListener('change', () => {
      state.decode.timerEnabled = el.timerToggle.checked;
      startTimer();
    });

    el.colorBlindToggle.addEventListener('change', () => {
      state.colorBlind = el.colorBlindToggle.checked;
      renderPalette();
      renderEncodeGrid();
      renderDecodeGrid();
      renderLegendSwatches(state.encode.bitDepth);
    });

    el.highContrastToggle.addEventListener('change', () => {
      document.body.classList.toggle('high-contrast', el.highContrastToggle.checked);
    });

    el.encodeGrid.addEventListener('keydown', (event) => handleKeyboard(event, 'encode'));
    el.decodeGrid.addEventListener('keydown', (event) => handleKeyboard(event, 'decode'));
  }

  function init() {
    state.encode.cells = Array(state.encode.size * state.encode.size).fill(0);
    state.decode.targetCells = Array(state.decode.size * state.decode.size).fill(0);
    state.decode.playerCells = Array(state.decode.size * state.decode.size).fill(0);
    updateToolButtons();
    bindEvents();
    resetEncodeGrid();
    renderDecodeGrid();
    el.levelStatus.textContent = 'Read the tutorial, then press Start levels.';
    setStatus(el.decodeStatus, 'Tutorial first, then start level 1.');
  }

  init();
})();
