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
      isDragging: false,
      cursorIndex: 0
    },
    decode: {
      size: 8,
      bitDepth: 1,
      targetCells: [],
      playerCells: [],
      mode: 'render',
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
    generateBtn: document.getElementById('generateBtn'),
    copyExportBtn: document.getElementById('copyExportBtn'),
    legendOutput: document.getElementById('legendOutput'),
    bitstreamOutput: document.getElementById('bitstreamOutput'),
    lineBreakRows: document.getElementById('lineBreakRows'),
    encodeStatus: document.getElementById('encodeStatus'),
    decodeStatus: document.getElementById('decodeStatus'),
    legendInput: document.getElementById('legendInput'),
    bitstreamInput: document.getElementById('bitstreamInput'),
    renderBitsBtn: document.getElementById('renderBitsBtn'),
    startChallengeBtn: document.getElementById('startChallengeBtn'),
    checkChallengeBtn: document.getElementById('checkChallengeBtn'),
    timerToggle: document.getElementById('timerToggle'),
    showMistakesToggle: document.getElementById('showMistakesToggle'),
    timerOutput: document.getElementById('timerOutput'),
    scoreOutput: document.getElementById('scoreOutput'),
    colorBlindToggle: document.getElementById('colorBlindToggle'),
    highContrastToggle: document.getElementById('highContrastToggle'),
    presetPuzzleSelect: document.getElementById('presetPuzzleSelect')
  };

  function getPalette(bitDepth) {
    return (state.colorBlind ? DEFAULT_PALETTES.colorBlind : DEFAULT_PALETTES.standard)[bitDepth];
  }

  // Teacher tweak: bit patterns for each mode. Keep these aligned with bitDepth values.
  function bitCodes(bitDepth) {
    return bitDepth === 1 ? ['0', '1'] : ['00', '01', '10', '11'];
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

  function cleanBitstream(raw) {
    return raw.replace(/[^01]/g, '');
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

  function setStatus(target, message, isError = false) {
    target.textContent = message;
    target.style.color = isError ? '#b91c1c' : '';
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

  function createGridCells(container, size, cells, onPaint, cursorIndex, wrongIndexes = new Set()) {
    container.style.setProperty('--grid-size', size);
    container.innerHTML = '';
    const palette = getPalette(container === el.encodeGrid ? state.encode.bitDepth : state.decode.bitDepth);

    for (let idx = 0; idx < cells.length; idx++) {
      const cell = document.createElement('div');
      cell.className = 'pixel-cell';
      if (idx === cursorIndex) cell.classList.add('cursor');
      if (wrongIndexes.has(idx)) cell.classList.add('wrong');
      cell.style.background = palette[cells[idx]] || '#fff';
      cell.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        onPaint(idx, true);
      });
      cell.addEventListener('pointerenter', () => onPaint(idx, false));
      container.appendChild(cell);
    }
  }

  function paintEncodeCell(idx, pointerDown) {
    if (pointerDown) state.encode.isDragging = true;
    if (!state.encode.isDragging && !pointerDown) return;
    state.encode.cells[idx] = state.encode.tool === 'eraser' ? 0 : state.encode.selectedValue;
    state.encode.cursorIndex = idx;
    renderEncodeGrid();
  }

  function paintDecodeCell(idx, pointerDown) {
    if (state.decode.mode !== 'challenge') return;
    if (pointerDown) state.encode.isDragging = true;
    if (!state.encode.isDragging && !pointerDown) return;

    const next = (state.decode.playerCells[idx] + 1) % Math.pow(2, state.decode.bitDepth);
    state.decode.playerCells[idx] = next;
    state.decode.cursorIndex = idx;
    renderDecodeGrid();
  }

  function renderEncodeGrid() {
    createGridCells(el.encodeGrid, state.encode.size, state.encode.cells, paintEncodeCell, state.encode.cursorIndex);
  }

  function renderDecodeGrid(wrongIndexes) {
    const cells = state.decode.mode === 'challenge' ? state.decode.playerCells : state.decode.targetCells;
    createGridCells(el.decodeGrid, state.decode.size, cells, paintDecodeCell, state.decode.cursorIndex, wrongIndexes);
  }

  function resetEncodeGrid() {
    state.encode.cells = Array(state.encode.size * state.encode.size).fill(0);
    state.encode.cursorIndex = 0;
    renderEncodeGrid();
    renderPalette();
  }

  function generateFromEncode() {
    renderLegendSwatches(state.encode.bitDepth);
    el.bitstreamOutput.value = encodeCellsToBitstream(state.encode.cells, state.encode.bitDepth, state.encode.size, el.lineBreakRows.checked);
    setStatus(el.encodeStatus, 'Legend and bitstream generated.');
  }

  function copyText(text, statusTarget, successMessage) {
    navigator.clipboard.writeText(text)
      .then(() => setStatus(statusTarget, successMessage))
      .catch(() => setStatus(statusTarget, 'Clipboard blocked. Copy manually.', true));
  }

  function updateToolButtons() {
    el.toolPaint.classList.toggle('active', state.encode.tool === 'paint');
    el.toolEraser.classList.toggle('active', state.encode.tool === 'eraser');
  }

  function importPresetToDecode(preset) {
    state.decode.size = preset.size;
    state.decode.bitDepth = preset.bitDepth;
    state.decode.targetCells = preset.cells;
    state.decode.playerCells = Array(preset.size * preset.size).fill(0);
    state.decode.mode = 'render';
    state.decode.cursorIndex = 0;

    el.legendInput.value = legendToIndexText(preset.bitDepth);
    el.bitstreamInput.value = encodeCellsToBitstream(preset.cells, preset.bitDepth, preset.size, true);
    renderDecodeGrid();
  }

  // Teacher tweak: change scoring formula in this function if desired.
  function checkChallenge() {
    if (state.decode.mode !== 'challenge') {
      setStatus(el.decodeStatus, 'Start a rebuild challenge first.', true);
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
    setStatus(el.decodeStatus, pct === 100 ? 'Perfect reconstruction!' : 'Keep trying to improve accuracy.');
  }

  function startTimer() {
    clearInterval(state.decode.timerId);
    if (!state.decode.timerEnabled) {
      el.timerOutput.textContent = 'Timer: off';
      return;
    }

    state.decode.startedAt = Date.now();
    state.decode.timerId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.decode.startedAt) / 1000);
      el.timerOutput.textContent = `Timer: ${elapsed}s`;
    }, 500);
  }

  function renderFromInputs(challengeMode) {
    const parsedLegend = parseLegend(el.legendInput.value);
    if (parsedLegend.error) {
      setStatus(el.decodeStatus, parsedLegend.error, true);
      return;
    }

    const stream = cleanBitstream(el.bitstreamInput.value);
    const cellCount = stream.length / parsedLegend.bitDepth;
    const size = Math.sqrt(cellCount);
    if (!Number.isInteger(size) || ![8, 12, 16].includes(size)) {
      setStatus(el.decodeStatus, 'Bitstream must describe an 8x8, 12x12, or 16x16 grid.', true);
      return;
    }

    const decoded = decodeBitstream(stream, size, parsedLegend.bitDepth, parsedLegend.map);
    if (decoded.error) {
      setStatus(el.decodeStatus, decoded.error, true);
      return;
    }

    state.decode.size = size;
    state.decode.bitDepth = parsedLegend.bitDepth;
    state.decode.targetCells = decoded.values;
    state.decode.playerCells = Array(size * size).fill(0);
    state.decode.mode = challengeMode ? 'challenge' : 'render';
    state.decode.cursorIndex = 0;
    renderDecodeGrid();

    if (challengeMode) {
      startTimer();
      setStatus(el.decodeStatus, 'Challenge started. Rebuild the target image on the grid.');
    } else {
      clearInterval(state.decode.timerId);
      el.timerOutput.textContent = 'Timer: 0s';
      setStatus(el.decodeStatus, 'Rendered successfully from legend + bitstream.');
    }
  }

  function setupPresets() {
    window.BINARY_MOSAIC_PRESETS.forEach((preset, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = preset.title;
      el.presetPuzzleSelect.appendChild(option);
    });

    el.presetPuzzleSelect.addEventListener('change', () => {
      if (el.presetPuzzleSelect.value === '') return;
      const preset = window.BINARY_MOSAIC_PRESETS[Number(el.presetPuzzleSelect.value)];
      importPresetToDecode(preset);
      setStatus(el.decodeStatus, `Loaded puzzle: ${preset.title}`);
    });
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
      if (isEncode) {
        state.encode.cells[local.cursorIndex] = state.encode.tool === 'eraser' ? 0 : state.encode.selectedValue;
      } else if (state.decode.mode === 'challenge') {
        state.decode.playerCells[local.cursorIndex] = (state.decode.playerCells[local.cursorIndex] + 1) % Math.pow(2, state.decode.bitDepth);
      }
    } else return;

    event.preventDefault();
    isEncode ? renderEncodeGrid() : renderDecodeGrid();
  }

  function bindEvents() {
    document.addEventListener('pointerup', () => { state.encode.isDragging = false; });

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
      generateFromEncode();
    }));

    el.toolPaint.addEventListener('click', () => { state.encode.tool = 'paint'; updateToolButtons(); });
    el.toolEraser.addEventListener('click', () => { state.encode.tool = 'eraser'; updateToolButtons(); });
    el.clearGridBtn.addEventListener('click', () => { resetEncodeGrid(); generateFromEncode(); });

    el.fillAllBtn.addEventListener('click', () => {
      state.encode.cells = state.encode.cells.map(() => (state.encode.tool === 'eraser' ? 0 : state.encode.selectedValue));
      renderEncodeGrid();
      generateFromEncode();
    });

    el.generateBtn.addEventListener('click', generateFromEncode);
    el.copyExportBtn.addEventListener('click', () => {
      const legendText = legendToIndexText(state.encode.bitDepth);
      const data = `Legend\n${legendText}\n\nBitstream\n${el.bitstreamOutput.value}`;
      copyText(data, el.encodeStatus, 'Legend + bitstream copied.');
    });

    el.renderBitsBtn.addEventListener('click', () => renderFromInputs(false));
    el.startChallengeBtn.addEventListener('click', () => renderFromInputs(true));
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
    resetEncodeGrid();
    updateToolButtons();
    setupPresets();
    bindEvents();
    generateFromEncode();
    el.legendInput.value = legendToIndexText(1);
  }

  init();
})();
