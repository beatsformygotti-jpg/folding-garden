'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const levels = GardenPuzzle.levels;
  const paperView = $('#paper-view');
  const stage = $('#stage');
  const markers = $('#creases');
  const herbarium = $('#flowers');
  const status = $('#status');
  const result = $('#result');
  const nextLevel = $('#continue');
  const levelMenu = $('#open-levels');
  const help = $('#open-help');
  const turnSheet = $('#flip');
  const undo = $('#undo');
  const restart = $('#restart');
  const levelsDialog = $('#levels-dialog');
  const helpDialog = $('#help-dialog');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'folding-garden-3d-v3';
  const previousStorageKey = 'folding-garden-3d-v2';
  const legacyStorageKey = 'folding-garden-3d-v1';
  const chapterSize = 10;
  const individualSlots = 12;
  const view = new GardenPaper($('#paper'), $('#guide'));
  const commitAngle = Math.PI / 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const easing = progress => progress * progress * (3 - 2 * progress);
  const pars = new Map();
  const ruleKeys = {
    gold: ['goalRule', 'goldHint'],
    order: ['orderRule', 'orderHint'],
    stems: ['stemsRule', 'stemsHint'],
    holes: ['holesRule', 'holesHint'],
    flip: ['flipRule', 'flipHint']
  };
  const errors = {
    flowers: 'wrongFlowers', stems: 'wrongStems', holes: 'wrongHoles',
    order: 'wrongOrder', empty: 'wrongEmpty'
  };

  const save = load();
  const incomingLanguage = new URLSearchParams(location.search).get('lang');
  let language = ['ru', 'en'].includes(incomingLanguage) ? incomingLanguage : save.language;
  const t = (key, values) => GardenLocale.text(language, key, values);
  let index = levels.findIndex(level => level.id === save.levelId);
  let state;
  let moves = [];
  let selected = null;
  let pointer = null;
  let busy = false;
  let tip = false;
  let markerPoints = [];
  let resizeFrame = 0;
  let finished = false;

  function readSave(key) {
    try {
      const record = JSON.parse(localStorage.getItem(key));
      return record && typeof record === 'object' ? record : null;
    } catch {
      return null;
    }
  }

  function load() {
    const latest = readSave(storageKey);
    const record = latest ?? readSave(previousStorageKey);
    const legacy = record ? null : readSave(legacyStorageKey);
    const validId = id => Number.isInteger(id) && levels.some(level => level.id === id);
    let levelId = record?.levelId;
    let history = record?.history;
    let completed = record?.completed;
    if (legacy) {
      if (Number.isInteger(legacy.index) && legacy.index >= 0 && legacy.index < 13) levelId = legacy.index + 1;
      if (legacy.history && typeof legacy.history === 'object') {
        history = Object.fromEntries(Object.entries(legacy.history)
          .filter(([level]) => /^\d+$/.test(level) && Number(level) < 13)
          .map(([level, steps]) => [Number(level) + 1, steps]));
      }
      completed = Array.isArray(legacy.completed)
        ? legacy.completed.filter(index => Number.isInteger(index) && index >= 0 && index < 13).map(index => index + 1)
        : [];
    }
    return {
      levelId: validId(levelId) ? levelId : levels[0].id,
      history: history && typeof history === 'object'
        ? Object.fromEntries(Object.entries(history).filter(([id]) =>
          levels.some(level => level.id === Number(id) && (latest || !level.revised))))
        : {},
      completed: Array.isArray(completed) ? [...new Set(completed.filter(validId))] : [],
      language: record?.language === 'en' ? 'en' : 'ru',
      best: latest?.best && typeof latest.best === 'object' ? latest.best : {}
    };
  }

  function persist() {
    const id = levels[index].id;
    save.levelId = id;
    save.language = language;
    save.history[id] = state.history;
    if (!state.rows.length) {
      if (!save.completed.includes(id)) save.completed.push(id);
      if (!save.best[id] || state.folds < save.best[id]) save.best[id] = state.folds;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(save));
    } catch {
      // Private browsing and local file settings can disable persistent storage.
    }
  }

  function totalFlowers() {
    return GardenPuzzle.totalFlowers(levels[index]);
  }

  function goldTarget(level) {
    if (!pars.has(level.id)) pars.set(level.id, GardenPuzzle.shortest(level).folds);
    return pars.get(level.id);
  }

  function campaignComplete() {
    return save.completed.length === levels.length;
  }

  function message(key, tone = '', values) {
    status.textContent = t(key, values);
    status.dataset.tone = tone;
  }

  function guide() {
    if (finished) {
      message('complete');
    } else if (!moves.some(move => move.match)) {
      const other = GardenPuzzle.flip(state);
      if (other && GardenPuzzle.moves(other).some(move => move.match)) message('turnToFind');
      else message('noMoves', 'error');
    } else if (GardenPuzzle.requestedFlower(state)) {
      message('orderedHint');
    } else if (state.history.length) {
      message('nextHint');
    } else if (index === 0) {
      message('firstHint');
    } else {
      message('regularHint');
    }
  }

  function localizeInterface() {
    document.documentElement.lang = language;
    document.title = t('title');
    $('meta[name="description"]').content = t('description');
    for (const element of document.querySelectorAll('[data-text]')) {
      element.textContent = t(element.dataset.text);
    }
    for (const element of document.querySelectorAll('[data-a11y], [data-control]')) {
      const label = t(element.dataset.a11y ?? element.dataset.control);
      element.setAttribute('aria-label', label);
      if (element.dataset.control) element.title = label;
    }
    for (const button of document.querySelectorAll('[data-language]')) {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    }
  }

  function levelRules(level) {
    return [
      level.gold && 'gold', level.order && 'order', level.stems && 'stems',
      level.rows.some(row => row.includes(GardenPuzzle.hole)) && 'holes',
      level.back && 'flip'
    ].filter(Boolean);
  }

  function renderRules(level) {
    const intro = $('#rule-intro');
    const gold = $('#gold-goal');
    const order = $('#order-goal');
    const face = $('#face-goal');
    const requested = GardenPuzzle.requestedFlower(state);
    const unlocked = level.introduction && !finished;
    intro.hidden = !unlocked;
    if (unlocked) {
      const [label, detail] = ruleKeys[level.introduction];
      $('#intro-title').textContent = t('firstRule') + ' · ' + t(label);
      $('#intro-copy').textContent = t(level.introduction === 'flip' && !state.history.length ? 'flipIntro' : detail);
    }

    gold.hidden = !level.gold || finished;
    if (!gold.hidden) {
      const target = goldTarget(level);
      const values = { folds: state.folds, target };
      gold.textContent = t('goal', values);
      gold.setAttribute('aria-label', t('goalLabel', values));
      gold.title = save.best[level.id] ? t('best', { folds: save.best[level.id] }) : t('goldHint');
      gold.dataset.overTarget = String(state.folds > target);
    }

    order.hidden = !requested;
    if (requested) {
      const label = document.createElement('span');
      label.textContent = t('orderNow', { flower: t(requested) });
      order.replaceChildren(GardenArt.icon(requested), label);
    }
    face.hidden = !state.back || finished;
    if (!face.hidden) face.textContent = t('face', { side: state.side.toUpperCase() });
    const indicators = $('#rule-indicators');
    indicators.hidden = gold.hidden && order.hidden && face.hidden;
    $('#rule-panel').hidden = intro.hidden && indicators.hidden;
  }

  function renderHelp() {
    const current = $('#current-rules');
    const level = levels[index];
    const items = levelRules(level).map(key => {
      const [label, detail] = ruleKeys[key];
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = t(label);
      const text = document.createElement('span');
      text.textContent = t(detail);
      if (key === 'order') text.textContent += ' ' + [...level.order].map(kind => t(kind)).join(' → ');
      item.append(title, text);
      return item;
    });
    current.replaceChildren(...items);
    current.hidden = !items.length;
  }

  function resize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const { width, height } = paperView.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      view.resize(width, height);
      GardenArt.ornament($('#ornament'), stage.clientWidth, stage.clientHeight);
      placeMarkers();
    });
  }

  function placeMarkers() {
    const gap = view.pixelsPerUnit;
    markerPoints = moves.map((move, i) => {
      const at = view.marker(move);
      const x = clamp(at.x, 18, view.width - 18);
      const y = clamp(at.y, 20, view.height - 20);
      const width = move.axis === 'x' ? clamp(gap - 1, 14, 46) : 46;
      const height = move.axis === 'z' ? clamp(gap * .73 - 1, 17, 46) : 46;
      const button = markers.children[i];
      button.style.left = x + 'px';
      button.style.top = y + 'px';
      button.style.setProperty('--hit-width', width + 'px');
      button.style.setProperty('--hit-height', height + 'px');
      button.style.setProperty('--dot-size', Math.min(27, width - 2, height - 2) + 'px');
      return { x, y, width, height };
    });
  }

  function drawMarkers() {
    markers.replaceChildren(...moves.map((move, i) => {
      const direction = move.axis === 'x' ? 'vertical' : 'horizontal';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crease';
      button.dataset.move = i;
      button.classList.toggle('tip', tip && move.cut === 2 && move.axis === 'x');
      button.setAttribute('aria-label', t(direction, { number: move.cut }));
      const dot = document.createElement('span');
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = move.cut;
      button.append(dot);
      return button;
    }));
    placeMarkers();
  }

  function drawHerbarium() {
    const total = totalFlowers();
    const level = levels[index];
    $('#count').textContent = state.collected.length + ' / ' + total;
    if (total > individualSlots) {
      const kinds = [...new Set([...level.rows, ...(level.back ?? [])].join(''))].filter(kind => kind !== GardenPuzzle.hole);
      const counts = state.collected.reduce((tally, kind) => {
        tally[kind] = (tally[kind] ?? 0) + 1;
        return tally;
      }, {});
      herbarium.replaceChildren(...kinds.map(kind => {
        const slot = document.createElement('li');
        const quantity = document.createElement('span');
        const count = counts[kind] ?? 0;
        slot.className = 'flower-tally';
        slot.dataset.kind = kind;
        slot.classList.toggle('filled', count > 0);
        slot.setAttribute('aria-label', t(kind) + ' — ' + count);
        quantity.textContent = count;
        slot.append(GardenArt.icon(kind), quantity);
        return slot;
      }));
      return;
    }

    herbarium.replaceChildren(...Array.from({ length: total }, (_, i) => {
      const slot = document.createElement('li');
      slot.className = 'specimen';
      const kind = state.collected[i];
      if (kind) {
        slot.classList.add('filled');
        slot.setAttribute('aria-label', t(kind));
        slot.append(GardenArt.icon(kind));
      } else {
        slot.setAttribute('aria-label', t('emptySlot'));
      }
      return slot;
    }));
  }

  function refreshActions() {
    for (const [i, button] of [...markers.children].entries()) {
      button.disabled = busy;
      button.classList.toggle('is-active', selected === moves[i]);
      button.classList.toggle('tip', tip && !selected && moves[i].axis === 'x' && moves[i].cut === 2);
    }
    const locked = busy || Boolean(pointer);
    undo.disabled = locked || !state.history.length;
    restart.disabled = locked || !state.history.length;
    levelMenu.disabled = locked;
    help.disabled = locked;
    turnSheet.hidden = !state.back || finished;
    turnSheet.disabled = locked;
    nextLevel.textContent = t(index + 1 < levels.length && !campaignComplete() ? 'next' : 'toLevels');
  }

  function drawBoard() {
    selected = null;
    moves = GardenPuzzle.moves(state);
    finished = !state.rows.length;
    tip = index === 0 && !state.history.length;
    const level = levels[index];
    $('#level-kicker').textContent = t('levelNumber', { number: index + 1, total: levels.length });
    $('#level-name').textContent = GardenLocale.title(language, level);

    result.hidden = !finished;
    if (finished) {
      const complete = campaignComplete();
      $('#seal').replaceChildren(GardenArt.icon(state.collected[0]));
      $('#result-title').textContent = t(complete ? 'campaignDone' : 'sheetDone');
      $('#result-text').textContent = t(complete ? 'campaignResult' : 'sheetResult');
      const medal = $('#result-medal');
      medal.hidden = !level.gold;
      if (level.gold) {
        const target = goldTarget(level);
        const earned = state.folds === target;
        medal.dataset.gold = String(earned);
        medal.textContent = t(earned ? 'goldResult' : 'goldMissed', { folds: state.folds, target });
      }
    }

    const description = state.rows.map((row, i) => {
      const names = [...row].map((kind, column) => {
        if (kind === GardenPuzzle.hole) return t('hole');
        const name = t(kind);
        const stem = state.stems?.[i][column];
        return stem === undefined ? name : t('stemCell', { kind: name, direction: t('stem' + stem) });
      }).join(', ');
      return t('row', { number: i + 1, cells: names });
    }).join(' ');
    $('#paper-description').textContent = description || t('allCollected');
    view.setBoard(state, moves, tip);
    renderRules(level);
    drawMarkers();
    drawHerbarium();
    refreshActions();
    guide();
  }

  function openLevel(nextIndex, reset = false) {
    busy = false;
    pointer = null;
    index = nextIndex;
    const history = reset ? [] : save.history[levels[index].id];
    state = GardenPuzzle.replay(levels[index], Array.isArray(history) ? history : []);
    persist();
    drawBoard();
  }

  function showAngle(angle) {
    view.frame(angle);
    if (!busy) placeMarkers();
  }

  function animateAngle(to, duration) {
    return animate(view.angle, to, duration, showAngle);
  }

  function animate(from, to, duration, render) {
    if (reducedMotion.matches) {
      render(to);
      return Promise.resolve();
    }
    return new Promise(resolve => {
      let start;
      function tick(time) {
        start ??= time;
        const step = Math.min((time - start) / duration, 1);
        render(from + (to - from) * easing(step));
        if (step < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function lift(move) {
    if (selected === move) return;
    selected = move;
    view.select(move);
    if (view.tip) {
      view.tip = false;
      view.decorate();
    }
    refreshActions();
  }

  async function releaseFold() {
    busy = true;
    refreshActions();
    try {
      await animateAngle(0, 270);
    } finally {
      resetSheet();
      busy = false;
      refreshActions();
    }
  }

  function resetSheet() {
    selected = null;
    view.select(null);
    view.tip = tip;
    view.decorate();
    placeMarkers();
  }

  function pointerMoveIndex(event) {
    const rect = paperView.getBoundingClientRect();
    const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    let nearest = Infinity;
    let indexOfMove = -1;
    for (const [i, marker] of markerPoints.entries()) {
      const x = at.x - marker.x;
      const y = at.y - marker.y;
      if (Math.abs(x) > marker.width / 2 || Math.abs(y) > marker.height / 2) continue;
      const distance = x * x + y * y;
      if (distance < nearest) {
        nearest = distance;
        indexOfMove = i;
      }
    }
    if (indexOfMove !== -1) return indexOfMove;
    let closest = event.pointerType === 'mouse' ? 11 : 15;
    moves.forEach((move, i) => {
      const axis = move.axis;
      const source = axis === 'x' ? { column: move.cut - .5, row: -.5 } : { column: -.5, row: move.cut - .5 };
      const target = axis === 'x'
        ? { column: source.column, row: state.rows.length - .5 }
        : { column: state.rows[0].length - .5, row: source.row };
      const a = view.atCell(source, .08);
      const b = view.atCell(target, .08);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const fraction = clamp(((at.x - a.x) * dx + (at.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
      const distance = Math.hypot(at.x - a.x - dx * fraction, at.y - a.y - dy * fraction);
      if (distance < closest) {
        closest = distance;
        indexOfMove = i;
      }
    });
    return indexOfMove;
  }

  paperView.addEventListener('pointerdown', event => {
    if (busy || pointer || event.button !== 0) return;
    const move = moves[pointerMoveIndex(event)];
    if (!move) return;
    pointer = {
      id: event.pointerId, move, x: event.clientX, y: event.clientY,
      distance: clamp(view.pixelsPerUnit * (.82 + .20 * move.band), 55, 172),
      dragged: false
    };
    paperView.setPointerCapture(event.pointerId);
    refreshActions();
    event.preventDefault();
  });

  paperView.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    const { move } = pointer;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragged && Math.hypot(dx, dy) < 7) return;
    if (!pointer.dragged) {
      pointer.dragged = true;
      lift(move);
      message('pullHint');
    }
    const delta = (move.axis === 'x' ? dx : dy) * (move.near ? 1 : -1);
    showAngle(clamp(delta / pointer.distance, 0, .97) * Math.PI);
  });

  paperView.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const { move, dragged } = pointer;
    pointer = null;
    if (!dragged || view.angle >= commitAngle) {
      fold(move);
    } else {
      message('releaseHint');
      releaseFold();
    }
  });

  function cancelPointer(id) {
    if (pointer?.id !== id) return;
    const dragged = pointer.dragged;
    pointer = null;
    if (paperView.hasPointerCapture(id)) paperView.releasePointerCapture(id);
    if (dragged) {
      guide();
      releaseFold();
    } else {
      refreshActions();
    }
  }

  paperView.addEventListener('pointercancel', event => cancelPointer(event.pointerId));
  paperView.addEventListener('lostpointercapture', event => cancelPointer(event.pointerId));

  markers.addEventListener('click', event => {
    const button = event.target.closest('[data-move]');
    if (button && event.detail === 0) fold(moves[Number(button.dataset.move)]);
  });

  function tokenAt(pair, kind) {
    const token = document.createElement('div');
    token.className = kind ? 'bloom-token' : 'bloom-token mismatch';
    token.setAttribute('aria-hidden', 'true');
    if (kind) token.append(GardenArt.icon(kind));
    else token.textContent = '×';
    const rect = paperView.getBoundingClientRect();
    const at = view.atCell(pair.target, .36);
    const size = kind ? clamp(view.pixelsPerUnit * .70, 17, 91) : clamp(view.pixelsPerUnit * .52, 16, 34);
    const x = rect.left + at.x;
    const y = rect.top + at.y;
    Object.assign(token.style, {
      width: size + 'px', height: size + 'px',
      left: x + 'px', top: y + 'px',
      fontSize: size * .8 + 'px'
    });
    document.body.append(token);
    return { token, x, y, size };
  }

  async function collect(pairs) {
    const compact = totalFlowers() > individualSlots;
    const blooms = compact ? [...new Map(pairs.map(pair => [pair.kind, pair])).values()] : pairs;
    const tokens = blooms.map(pair => ({ ...tokenAt(pair, pair.kind), kind: pair.kind }));
    if (!reducedMotion.matches && typeof tokens[0]?.token.animate === 'function') {
      for (const { token } of tokens) token.animate([
        { opacity: .3, transform: 'translate(-50%, -36%) scale(.64)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
      ], { duration: 210, easing: 'ease-out' });
    }
    await sleep(reducedMotion.matches ? 90 : 235);
    if (!reducedMotion.matches && typeof tokens[0]?.token.animate === 'function') {
      await Promise.allSettled(tokens.map(({ token, x, y, size, kind }, i) => {
        const slot = compact ? herbarium.querySelector('[data-kind="' + kind + '"] img')
          : herbarium.children[i + state.collected.length];
        const target = slot.getBoundingClientRect();
        const dx = target.left + target.width * .5 - x;
        const dy = target.top + target.height * .5 - y;
        const scale = clamp(target.width / size, .36, 1.65);
        return token.animate([
          { transform: 'translate(-50%, -50%) scale(1)' },
          { transform: 'translate(calc(-50% + ' + dx * .4 + 'px), calc(-50% + ' + (dy * .40 - 27) + 'px)) scale(1.05)', offset: .45 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(' + scale + ')' }
        ], { duration: 455, delay: i * 22, easing: 'cubic-bezier(.23,.68,.37,1)', fill: 'forwards' }).finished;
      }));
    }
    tokens.forEach(({ token }) => token.remove());
  }

  async function fold(move) {
    if (busy || pointer || !move) return;
    lift(move);
    busy = true;
    refreshActions();
    message('folding');
    try {
      const duration = Math.max(260, 1030 * (1 - view.angle / Math.PI));
      await animateAngle(Math.PI, duration);
      if (move.match) {
        await collect(move.pairs);
        state = GardenPuzzle.replay(levels[index], [...state.history, [move.axis, move.cut]]);
        persist();
        drawBoard();
        if (finished) nextLevel.focus({ preventScroll: true });
        else if (!state.order && moves.some(candidate => candidate.match)) message('added');
        return;
      }

      const requested = GardenPuzzle.requestedFlower(state);
      const wrong = move.contacts.filter(pair => !pair.match || (move.reason === 'order' && pair.kind !== requested))
        .map(pair => tokenAt(pair));
      message(errors[move.reason], 'error', { flower: requested && t(requested) });
      await sleep(reducedMotion.matches ? 140 : 480);
      wrong.forEach(({ token }) => token.remove());
      await animateAngle(0, 415);
      resetSheet();
    } finally {
      busy = false;
      refreshActions();
    }
  }

  turnSheet.addEventListener('click', async () => {
    if (busy || pointer || !GardenPuzzle.flip(state)) return;
    busy = true;
    refreshActions();
    message('turning');
    try {
      await animate(0, Math.PI, 770, angle => view.turn(angle));
      state = GardenPuzzle.replay(levels[index], [...state.history, ['flip']]);
      persist();
      drawBoard();
    } finally {
      busy = false;
      refreshActions();
      turnSheet.focus({ preventScroll: true });
    }
  });

  nextLevel.addEventListener('click', () => {
    if (busy || !finished) return;
    if (index < levels.length - 1 && !campaignComplete()) openLevel(index + 1);
    else showLevels();
  });

  undo.addEventListener('click', () => {
    if (busy || pointer || !state.history.length) return;
    state = GardenPuzzle.replay(levels[index], state.history.slice(0, -1));
    persist();
    drawBoard();
  });

  restart.addEventListener('click', () => {
    if (!busy && !pointer) openLevel(index, true);
  });

  function levelOption(level, i, done) {
    const button = document.createElement('button');
    const number = document.createElement('span');
    const title = document.createElement('span');
    const check = document.createElement('span');
    button.type = 'button';
    button.className = 'level-choice';
    button.dataset.level = i;
    if (i === index) button.setAttribute('aria-current', 'step');
    number.className = 'level-number';
    number.textContent = String(i + 1).padStart(2, '0');
    title.textContent = GardenLocale.title(language, level);
    check.className = 'level-status';
    if (level.gold && save.best[level.id] && save.best[level.id] === goldTarget(level)) {
      check.textContent = '✦';
      check.classList.add('gold');
      check.setAttribute('aria-label', t('goldEarned'));
    } else if (done.has(level.id)) {
      check.textContent = '✓';
      check.setAttribute('aria-label', t('passed'));
    }
    button.append(number, title, check);
    return button;
  }

  function showLevels() {
    if (busy) return;
    renderLevelMenu();
    levelsDialog.showModal();
    $('#level-list [aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
  }

  function renderLevelMenu() {
    const done = new Set(save.completed);
    const list = $('#level-list');
    const sections = [];
    $('#campaign-progress').textContent = t('campaign', { done: done.size, total: levels.length });
    for (let start = 0; start < levels.length; start += chapterSize) {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      const grid = document.createElement('div');
      const end = Math.min(start + chapterSize, levels.length);
      section.className = 'level-group';
      title.textContent = t('levelGroup', { from: start + 1, to: end });
      grid.className = 'level-grid';
      grid.append(...levels.slice(start, end).map((level, i) => levelOption(level, start + i, done)));
      section.append(title, grid);
      sections.push(section);
    }
    list.replaceChildren(...sections);
  }

  levelMenu.addEventListener('click', showLevels);
  help.addEventListener('click', () => {
    renderHelp();
    helpDialog.showModal();
  });
  levelsDialog.addEventListener('click', event => {
    const target = event.target.closest('[data-language]');
    if (!target || target.dataset.language === language) return;
    language = target.dataset.language;
    if (['ru', 'en'].includes(incomingLanguage) && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.replaceState(null, '', url);
    }
    localizeInterface();
    persist();
    drawBoard();
    renderLevelMenu();
  });
  $('#level-list').addEventListener('click', event => {
    const choice = event.target.closest('[data-level]');
    if (!choice) return;
    openLevel(Number(choice.dataset.level));
    levelsDialog.close();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pointer) cancelPointer(pointer.id);
  });

  new ResizeObserver(resize).observe(paperView);
  localizeInterface();
  openLevel(index);
  resize();
})();
