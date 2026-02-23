(() => {
  const DEFAULT_PALETTES = {
    standard: ['#dbeafe', '#2563eb', '#f97316', '#111827']
  };

  const state = {
    decode: {
      levelIndex: -1,
      size: 8,
      bitDepth: 2,
      targetCells: [],
      playerCells: [],
      bitTokens: [],
      locked: new Set(),
      selectedValue: 0,
      cursorIndex: 0,
      mode: 'idle',
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
    timerOutput: document.getElementById('timerOutput'),
    decodeTutorial: document.getElementById('decodeTutorial')
  };

  function bitCodes() {
    return ['00', '01', '10', '11'];
  }

  function setStatus(target, message, isError = false) {
    target.textContent = message;
    target.style.color = isError ? '#ef4444' : '';
  }

  function updateTimerDisplay() {
    if (!state.decode.runStartedAt) {
      el.timerOutput.textContent = 'Total timer: 0s';
      return;
    }
    const elapsed = Math.floor((Date.now() - state.decode.runStartedAt) / 1000);
    el.timerOutput.textContent = `Total timer: ${elapsed}s`;
  }

  function startRunTimer() {
    clearInterval(state.decode.timerId);
    updateTimerDisplay();
    if (!state.decode.runStartedAt || state.decode.completed) return;
    state.decode.timerId = setInterval(updateTimerDisplay, 500);
  }

  function flashSuccess() {
    el.decodeGrid.classList.remove('level-success');
    void el.decodeGrid.offsetWidth;
    el.decodeGrid.classList.add('level-success');
    setTimeout(() => el.decodeGrid.classList.remove('level-success'), 550);
  }

  function renderDecodeLegend() {
    const codes = bitCodes();
    const palette = DEFAULT_PALETTES.standard;
    el.decodeLegend.innerHTML = '';
    codes.forEach((bits, value) => {
      const row = document.createElement('div');
      row.className = 'legend-row';
      row.innerHTML = `<span class="legend-bits">${bits}</span><span class="legend-swatch" style="background:${palette[value]}"></span>`;
      el.decodeLegend.appendChild(row);
    });
  }

  function renderPaintPalette() {
    const palette = DEFAULT_PALETTES.standard;
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

  function renderDecodeGrid(wrongIndexes = new Set()) {
    const palette = DEFAULT_PALETTES.standard;
    el.decodeGrid.style.setProperty('--grid-size', state.decode.size);
    el.decodeGrid.innerHTML = '';

    for (let idx = 0; idx < state.decode.playerCells.length; idx++) {
      const cell = document.createElement('button');
      cell.className = 'pixel-cell token-cell';
      if (idx === state.decode.cursorIndex) cell.classList.add('cursor');
      if (wrongIndexes.has(idx)) cell.classList.add('wrong');
      if (state.decode.locked.has(idx)) cell.classList.add('prefilled');

      cell.style.background = palette[state.decode.playerCells[idx]];
      cell.textContent = state.decode.bitTokens[idx] || '';
      cell.classList.toggle('token-dark', state.decode.playerCells[idx] > 1);
      cell.addEventListener('click', () => {
        if (state.decode.mode !== 'challenge') return;
        if (state.decode.locked.has(idx)) return;
        state.decode.playerCells[idx] = state.decode.selectedValue;
        state.decode.cursorIndex = idx;
        renderDecodeGrid();
      });
      el.decodeGrid.appendChild(cell);
    }
  }

  function pickPrefilledIndices(total, prefillCount) {
    if (prefillCount <= 0) return [];
    const step = Math.max(1, Math.floor(total / prefillCount));
    const out = [];
    for (let i = 0; i < total && out.length < prefillCount; i += step) out.push(i);
    return out;
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
    if (preset.mode && preset.mode !== 'paint') {
      setStatus(el.decodeStatus, 'Only paint-mode levels are supported in this version.', true);
      return;
    }
    const codes = bitCodes();
    state.decode.levelIndex = index;
    state.decode.size = preset.size;
    state.decode.targetCells = [...preset.cells];
    state.decode.playerCells = Array(preset.size * preset.size).fill(0);
    state.decode.bitTokens = preset.cells.map((value) => codes[value]);
    state.decode.selectedValue = 0;
    state.decode.cursorIndex = 0;
    state.decode.mode = 'challenge';
    state.decode.locked = new Set();

    const fillIdx = pickPrefilledIndices(preset.cells.length, preset.prefillCount || 0);
    fillIdx.forEach((idx) => {
      state.decode.playerCells[idx] = state.decode.targetCells[idx];
      state.decode.locked.add(idx);
    });

    const hints = preset.prefillCount || 0;
    el.levelStatus.textContent = `Level ${index + 1} of ${window.BINARY_MOSAIC_PRESETS.length} — ${hints > 0 ? `${hints} starter hints` : 'no hints'}`;
    el.scoreOutput.textContent = '';
    renderDecodeLegend();
    renderPaintPalette();
    renderDecodeGrid();
    setStatus(el.decodeStatus, 'Decode using the side legend and your selected paint colour.');
  }

  // Teacher tweak: scoring formula
  function checkChallenge() {
    if (state.decode.mode !== 'challenge') return setStatus(el.decodeStatus, 'Press Start levels first.', true);

    let correct = 0;
    const wrong = new Set();
    state.decode.playerCells.forEach((value, idx) => {
      if (value === state.decode.targetCells[idx]) correct += 1;
      else wrong.add(idx);
    });

    const pct = Math.round((correct / state.decode.targetCells.length) * 100);
    const elapsed = state.decode.runStartedAt ? Math.floor((Date.now() - state.decode.runStartedAt) / 1000) : 0;
    const score = Math.max(0, Math.round(pct * 10 - elapsed));
    el.scoreOutput.textContent = `Correct: ${pct}% (${correct}/${state.decode.targetCells.length}) | Total time: ${elapsed}s | Score: ${score}`;

    renderDecodeGrid(wrong);
    if (pct === 100) {
      flashSuccess();
      setStatus(el.decodeStatus, '✅ Level complete! Moving to next level...');
      setTimeout(() => loadLevel(state.decode.levelIndex + 1), 900);
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
      if (!state.decode.locked.has(state.decode.cursorIndex)) {
        state.decode.playerCells[state.decode.cursorIndex] = state.decode.selectedValue;
      }
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
    updateTimerDisplay();
  }

  init();
})();
