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
      legend: {},
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
    copyShareCodeBtn: document.getElementById('copyShareCodeBtn'),
    copyShareLinkBtn: document.getElementById('copyShareLinkBtn'),
    legendOutput: document.getElementById('legendOutput'),
    bitstreamOutput: document.getElementById('bitstreamOutput'),
    shareCodeOutput: document.getElementById('shareCodeOutput'),
    lineBreakRows: document.getElementById('lineBreakRows'),
    encodeStatus: document.getElementById('encodeStatus'),
    decodeStatus: document.getElementById('decodeStatus'),
    legendInput: document.getElementById('legendInput'),
    bitstreamInput: document.getElementById('bitstreamInput'),
    shareCodeInput: document.getElementById('shareCodeInput'),
    renderBitsBtn: document.getElementById('renderBitsBtn'),
    startChallengeBtn: document.getElementById('startChallengeBtn'),
    checkChallengeBtn: document.getElementById('checkChallengeBtn'),
    importShareBtn: document.getElementById('importShareBtn'),
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

  function buildLegend(bitDepth) {
    const legend = {};
    const colors = getPalette(bitDepth);
    bitCodes(bitDepth).forEach((code, idx) => { legend[code] = colors[idx]; });
    return legend;
  }

  function legendToText(legend) {
    return Object.entries(legend).map(([bits, color]) => `${bits}=${color}`).join('\n');
  }

  function parseLegend(text) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const legend = {};
    for (const line of lines) {
      const [bits, color] = line.split('=').map((part) => part && part.trim());
      if (!bits || !color || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
        return { error: `Invalid legend line: "${line}". Use format like 00=#ffffff.` };
      }
      legend[bits] = color;
    }
    const widths = [...new Set(Object.keys(legend).map((bits) => bits.length))];
    if (widths.length !== 1 || ![1, 2].includes(widths[0])) {
      return { error: 'Legend codes must all be length 1 or length 2.' };
    }
    if (Object.keys(legend).length !== Math.pow(2, widths[0])) {
      return { error: 'Legend must include every code for its bit width.' };
    }
    return { legend, bitDepth: widths[0] };
  }

  function cleanBitstream(raw) { return raw.replace(/[^01]/g, ''); }

  function encodeCellsToBitstream(cells, bitDepth, size, breakRows) {
    const codes = bitCodes(bitDepth);
    if (!breakRows) return cells.map((value) => codes[value]).join('');
    const rows = [];
    for (let r = 0; r < size; r++) {
      rows.push(cells.slice(r * size, (r + 1) * size).map((value) => codes[value]).join(''));
    }
    return rows.join('\n');
  }

  function decodeBitstream(stream, size, bitDepth) {
    const clean = cleanBitstream(stream);
    const expectedLength = size * size * bitDepth;
    if (clean.length !== expectedLength) {
      return { error: `Bitstream length ${clean.length} does not match expected ${expectedLength}.` };
    }
    const values = [];
    for (let i = 0; i < clean.length; i += bitDepth) {
      values.push(parseInt(clean.slice(i, i + bitDepth), 2));
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
      cell.dataset.index = String(idx);
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
    const legend = buildLegend(state.encode.bitDepth);
    el.legendOutput.value = legendToText(legend);
    el.bitstreamOutput.value = encodeCellsToBitstream(state.encode.cells, state.encode.bitDepth, state.encode.size, el.lineBreakRows.checked);
    const code = buildShareCode({
      size: state.encode.size,
      bitDepth: state.encode.bitDepth,
      legend,
      cells: state.encode.cells
    });
    el.shareCodeOutput.value = code;
    setStatus(el.encodeStatus, 'Legend, bitstream, and share code generated.');
  }

  function buildShareCode(payload) {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  }

  function parseShareCode(code) {
    try {
      const json = decodeURIComponent(escape(atob(code.trim())));
      const payload = JSON.parse(json);
      if (!payload.size || !payload.bitDepth || !payload.cells || !payload.legend) {
        return { error: 'Share code is missing required fields.' };
      }
      return { payload };
    } catch {
      return { error: 'Invalid share code format.' };
    }
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

  function importToDecode(payload) {
    state.decode.size = payload.size;
    state.decode.bitDepth = payload.bitDepth;
    state.decode.legend = payload.legend;
    state.decode.targetCells = payload.cells;
    state.decode.playerCells = Array(payload.size * payload.size).fill(0);
    state.decode.mode = 'render';
    el.legendInput.value = legendToText(payload.legend);
    el.bitstreamInput.value = encodeCellsToBitstream(payload.cells, payload.bitDepth, payload.size, true);
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
    const bitDepth = parsedLegend.bitDepth;
    const stream = cleanBitstream(el.bitstreamInput.value);
    const cellCount = stream.length / bitDepth;
    const size = Math.sqrt(cellCount);
    if (!Number.isInteger(size) || ![8, 12, 16].includes(size)) {
      setStatus(el.decodeStatus, 'Bitstream must describe an 8x8, 12x12, or 16x16 grid.', true);
      return;
    }
    const decoded = decodeBitstream(stream, size, bitDepth);
    if (decoded.error) {
      setStatus(el.decodeStatus, decoded.error, true);
      return;
    }
    state.decode.size = size;
    state.decode.bitDepth = bitDepth;
    state.decode.legend = parsedLegend.legend;
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
      const legend = buildLegend(preset.bitDepth);
      importToDecode({ ...preset, legend });
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
        renderEncodeGrid();
      } else if (state.decode.mode === 'challenge') {
        state.decode.playerCells[local.cursorIndex] = (state.decode.playerCells[local.cursorIndex] + 1) % Math.pow(2, state.decode.bitDepth);
        renderDecodeGrid();
      }
    } else return;
    event.preventDefault();
    isEncode ? renderEncodeGrid() : renderDecodeGrid();
  }

  function applyHashImport() {
    if (!location.hash.startsWith('#bm=')) return;
    const share = location.hash.slice(4);
    const parsed = parseShareCode(share);
    if (parsed.error) return;
    importToDecode(parsed.payload);
    setStatus(el.decodeStatus, 'Loaded puzzle from share link hash.');
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
    }));
    el.toolPaint.addEventListener('click', () => { state.encode.tool = 'paint'; updateToolButtons(); });
    el.toolEraser.addEventListener('click', () => { state.encode.tool = 'eraser'; updateToolButtons(); });
    el.clearGridBtn.addEventListener('click', resetEncodeGrid);
    el.fillAllBtn.addEventListener('click', () => {
      state.encode.cells = state.encode.cells.map(() => (state.encode.tool === 'eraser' ? 0 : state.encode.selectedValue));
      renderEncodeGrid();
    });
    el.generateBtn.addEventListener('click', generateFromEncode);
    el.copyExportBtn.addEventListener('click', () => copyText(`${el.legendOutput.value}\n\n${el.bitstreamOutput.value}`, el.encodeStatus, 'Legend + bitstream copied.'));
    el.copyShareCodeBtn.addEventListener('click', () => copyText(el.shareCodeOutput.value, el.encodeStatus, 'Share code copied.'));
    el.copyShareLinkBtn.addEventListener('click', () => {
      const hashLink = `${location.origin}${location.pathname}#bm=${el.shareCodeOutput.value}`;
      copyText(hashLink, el.encodeStatus, 'Share link copied.');
    });
    el.renderBitsBtn.addEventListener('click', () => renderFromInputs(false));
    el.startChallengeBtn.addEventListener('click', () => renderFromInputs(true));
    el.checkChallengeBtn.addEventListener('click', checkChallenge);
    el.importShareBtn.addEventListener('click', () => {
      const parsed = parseShareCode(el.shareCodeInput.value);
      if (parsed.error) {
        setStatus(el.decodeStatus, parsed.error, true);
        return;
      }
      importToDecode(parsed.payload);
      setStatus(el.decodeStatus, 'Share code imported.');
    });
    el.timerToggle.addEventListener('change', () => {
      state.decode.timerEnabled = el.timerToggle.checked;
      startTimer();
    });
    el.colorBlindToggle.addEventListener('change', () => {
      state.colorBlind = el.colorBlindToggle.checked;
      renderPalette();
      renderEncodeGrid();
      renderDecodeGrid();
    });
    el.highContrastToggle.addEventListener('change', () => {
      document.body.classList.toggle('high-contrast', el.highContrastToggle.checked);
    });
    el.encodeGrid.addEventListener('keydown', (e) => handleKeyboard(e, 'encode'));
    el.decodeGrid.addEventListener('keydown', (e) => handleKeyboard(e, 'decode'));
  }

  function init() {
    resetEncodeGrid();
    updateToolButtons();
    setupPresets();
    bindEvents();
    generateFromEncode();
    applyHashImport();
  }

  init();
})();
