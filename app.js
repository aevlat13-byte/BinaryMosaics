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
      bitDepth: 2,
      modeType: 'paint', // paint | typeBits
      targetCells: [],
      playerCells: [],
      bitTokens: [],
      bitInputs: [],
      selectedValue: 0,
      cursorIndex: 0,
      mode: 'idle',
      timerEnabled: true,
      runStartedAt: null,
      timerId: null,
      completed: false
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
    target.style.color = isError ? '#ef4444' : '';
  }

  function updateTimerDisplay() {
    if (!state.decode.runStartedAt || !state.decode.timerEnabled) {
      el.timerOutput.textContent = 'Total timer: 0s';
      return;
    }
    const elapsed = Math.floor((Date.now() - state.decode.runStartedAt) / 1000);
    el.timerOutput.textContent = `Total timer: ${elapsed}s`;
  }

  function startRunTimer() {
    clearInterval(state.decode.timerId);
    if (!state.decode.timerEnabled || !state.decode.runStartedAt || state.decode.completed) {
      updateTimerDisplay();
      return;
    }
    updateTimerDisplay();
    state.decode.timerId = setInterval(updateTimerDisplay, 500);
  }

  function flashSuccess() {
    el.decodeGrid.classList.remove('level-success');
    void el.decodeGrid.offsetWidth;
    el.decodeGrid.classList.add('level-success');
    setTimeout(() => el.decodeGrid.classList.remove('level-success'), 550);
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
      btn.disabled = state.decode.modeType === 'typeBits';
      btn.addEventListener('click', () => {
        state.decode.selectedValue = value;
        renderPaintPalette();
      });
      el.paintPalette.appendChild(btn);
    });
  }

  function renderPaintGrid(wrongIndexes = new Set()) {
    const palette = getPalette(state.decode.bitDepth);
    el.decodeGrid.style.setProperty('--grid-size', state.decode.size);
    el.decodeGrid.innerHTML = '';

    for (let idx = 0; idx < state.decode.playerCells.length; idx++) {
      const cell = document.createElement('button');
      cell.className = 'pixel-cell token-cell';
      if (idx === state.decode.cursorIndex) cell.classList.add('cursor');
      if (wrongIndexes.has(idx)) cell.classList.add('wrong');
      cell.style.background = palette[state.decode.playerCells[idx]];
      cell.textContent = state.decode.bitTokens[idx] || '';
      cell.classList.toggle('token-dark', state.decode.playerCells[idx] > 0);
      cell.addEventListener('click', () => {
        if (state.decode.mode !== 'challenge') return;
        state.decode.playerCells[idx] = state.decode.selectedValue;
        state.decode.cursorIndex = idx;
        renderDecodeGrid();
      });
      el.decodeGrid.appendChild(cell);
    }
  }

  function renderTypeBitsGrid(wrongIndexes = new Set()) {
    const palette = getPalette(state.decode.bitDepth);
    el.decodeGrid.style.setProperty('--grid-size', state.decode.size);
    el.decodeGrid.innerHTML = '';

    for (let idx = 0; idx < state.decode.targetCells.length; idx++) {
      const wrap = document.createElement('div');
      wrap.className = 'pixel-cell bit-entry-cell';
      if (wrongIndexes.has(idx)) wrap.classList.add('wrong');
      wrap.style.background = palette[state.decode.targetCells[idx]];

      const input = document.createElement('input');
      input.className = 'bit-entry-input';
      input.maxLength = state.decode.bitDepth;
      input.value = state.decode.bitInputs[idx] || '';
      input.inputMode = 'numeric';
      input.pattern = '[01]*';
      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^01]/g, '').slice(0, state.decode.bitDepth);
        state.decode.bitInputs[idx] = input.value;
      });

      wrap.appendChild(input);
      el.decodeGrid.appendChild(wrap);
    }
  }

  function renderDecodeGrid(wrongIndexes = new Set()) {
    if (state.decode.modeType === 'typeBits') renderTypeBitsGrid(wrongIndexes);
    else renderPaintGrid(wrongIndexes);
  }

  function loadLevel(index) {
    el.decodeGrid.classList.remove('level-success');
    if (index >= window.BINARY_MOSAIC_PRESETS.length) {
      state.decode.completed = true;
      clearInterval(state.decode.timerId);
      updateTimerDisplay();
      el.levelStatus.textContent = 'All levels complete.';
      setStatus(el.decodeStatus, `🎉 Challenge run complete in ${el.timerOutput.textContent.replace('Total timer: ', '')}`);
      return;
    }

    const preset = window.BINARY_MOSAIC_PRESETS[index];
    const codes = bitCodes(preset.bitDepth);
    state.decode.levelIndex = index;
    state.decode.size = preset.size;
    state.decode.bitDepth = preset.bitDepth;
    state.decode.modeType = preset.mode || 'paint';
    state.decode.targetCells = [...preset.cells];
    state.decode.playerCells = Array(preset.size * preset.size).fill(0);
    state.decode.bitTokens = preset.cells.map((value) => codes[value]);
    state.decode.bitInputs = Array(preset.size * preset.size).fill('');
    state.decode.selectedValue = 0;
    state.decode.cursorIndex = 0;
    state.decode.mode = 'challenge';

    const modeLabel = state.decode.modeType === 'typeBits' ? 'Type bits mode' : 'Paint mode';
    el.levelStatus.textContent = `Level ${index + 1} of ${window.BINARY_MOSAIC_PRESETS.length} — ${modeLabel}`;
    el.scoreOutput.textContent = '';
    renderDecodeLegend();
    renderPaintPalette();
    renderDecodeGrid();
    setStatus(el.decodeStatus, state.decode.modeType === 'typeBits'
      ? 'Enter the correct binary token in each coloured cell, then press Check.'
      : 'Decode using the side legend and your selected paint colour.');
  }

  function checkPaintChallenge() {
    let correct = 0;
    const wrong = new Set();
    state.decode.playerCells.forEach((value, idx) => {
      if (value === state.decode.targetCells[idx]) correct += 1;
      else wrong.add(idx);
    });
    return { correct, wrong, total: state.decode.targetCells.length };
  }

  function checkTypeBitsChallenge() {
    let correct = 0;
    const wrong = new Set();
    state.decode.bitInputs.forEach((value, idx) => {
      if (value === state.decode.bitTokens[idx]) correct += 1;
      else wrong.add(idx);
    });
    return { correct, wrong, total: state.decode.bitTokens.length };
  }

  // Teacher tweak: scoring formula
  function checkChallenge() {
    if (state.decode.mode !== 'challenge') return setStatus(el.decodeStatus, 'Press Start levels first.', true);

    const result = state.decode.modeType === 'typeBits' ? checkTypeBitsChallenge() : checkPaintChallenge();
    const pct = Math.round((result.correct / result.total) * 100);
    const elapsed = state.decode.runStartedAt ? Math.floor((Date.now() - state.decode.runStartedAt) / 1000) : 0;
    const score = Math.max(0, Math.round(pct * 10 - elapsed));

    el.scoreOutput.textContent = `Correct: ${pct}% (${result.correct}/${result.total}) | Total time: ${elapsed}s | Score: ${score}`;
    if (el.showMistakesToggle.checked) renderDecodeGrid(result.wrong);

    if (pct === 100) {
      flashSuccess();
      setStatus(el.decodeStatus, '✅ Level complete! Moving to next level...');
      setTimeout(() => loadLevel(state.decode.levelIndex + 1), 900);
    } else {
      setStatus(el.decodeStatus, 'Not correct yet. Fix highlighted cells and check again.', true);
    }
  }

  function handleKeyboard(event) {
    if (state.decode.modeType === 'typeBits') return;
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
      state.decode.completed = false;
      state.decode.runStartedAt = Date.now();
      startRunTimer();
      loadLevel(0);
    });

    el.startChallengeBtn.addEventListener('click', () => {
      if (state.decode.levelIndex < 0) return setStatus(el.decodeStatus, 'Start levels first.', true);
      loadLevel(state.decode.levelIndex);
      setStatus(el.decodeStatus, 'Level reset. Try again.');
    });

    el.checkChallengeBtn.addEventListener('click', checkChallenge);

    el.timerToggle.addEventListener('change', () => {
      state.decode.timerEnabled = el.timerToggle.checked;
      startRunTimer();
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
    state.decode.bitInputs = Array(state.decode.size * state.decode.size).fill('');
    bindEvents();
    renderDecodeLegend();
    renderPaintPalette();
    renderDecodeGrid();
    el.levelStatus.textContent = 'Read the tutorial, then press Start levels.';
    setStatus(el.decodeStatus, 'Tutorial first, then start level 1.');
    updateTimerDisplay();
  }

  init();
})();
