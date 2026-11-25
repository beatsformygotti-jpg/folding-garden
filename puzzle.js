'use strict';

const GardenPuzzle = (() => {
  // IDs identify save records. The array order defines the campaign.
  const catalog = [
    [1, 'Первые цветы', 'pddp'],
    [11, 'Поперёк листа', 'pdit', 'pdit'],
    [2, 'Короткий край', 'ppdppd'],
    [3, 'Два букета', 'tddtpddp'],
    [4, 'Ромашки в зеркале', 'pddppddptt'],
    [12, 'Две оси', 'ppditp', 'ddditp'],
    [5, 'В каком порядке?', 'tpptddtt'],
    [6, 'Тюльпаны по краям', 'dtpptdttpp'],
    [13, 'Букет с двух сторон', 'tippdi', 'tippdi', 'pppdit', 'ddpdit'],
    [14, 'Цветочный карман', 'ppttii', 'ppttii', 'piipdd'],
    [15, 'Два берега', 'iidddii', 'ppdddtt'],
    [16, 'Лист в клетку', 'ittidd', 'ipptdd', 'ipptpp'],
    [17, 'Россыпь лепестков', 'tpptpi', 'dppdpi', 'tditdi', 'tditdi'],
    [18, 'Под пологом', 'ddddpttp', 'iidpdiid', 'iidpiiii'],
    [19, 'Тихая грядка', 'iiddddd', 'ttddddd', 'dppdttt', 'dppdttt'],
    [7, 'Первый ирис', 'ddippittii'],
    [8, 'Среди ирисов', 'ttpddptiitii'],
    [20, 'Ряды у ограды', 'ttptdtii', 'ddptdtii', 'ddtddtii'],
    [21, 'Край дорожки', 'iippiiii', 'iippddpp', 'ddddpddd', 'ddddpdpp'],
    [22, 'Маки и ирисы', 'ipdppd', 'ipdppd', 'ppppdd', 'idttdd', 'idttii'],
    [23, 'Встречные полосы', 'ppttppppii', 'tttipdppdd', 'tttipdppdd'],
    [24, 'Лист у окна', 'tppttddd', 'tppttddd', 'ippttptt', 'ipdppdtt'],
    [25, 'Поворот тропинки', 'iipdpppp', 'iipdpppp', 'ddddpppp', 'ttttdppp', 'ttttdppp'],
    [26, 'Цветущий склон', 'piipiipppp', 'ippiiipptt', 'tpttttiitt', 'tpttttiidd'],
    [27, 'Садовая мозаика', 'tttitpdti', 'ddtitpdti', 'ppiididdi', 'ddiidtddt'],
    [9, 'Пять сгибов', 'ppttddittitt'],
    [28, 'Тень на бумаге', 'ppddipii', 'ppttipdd', 'ddditiii', 'ttditiii'],
    [29, 'Тонкие поля', 'tptpdd', 'tptpdd', 'ppttii', 'pdiitt', 'pdiiii'],
    [30, 'Пёстрый переплёт', 'dpttpdtt', 'dpttpddd', 'diidppii', 'dittddpp', 'dittppii'],
    [31, 'Весенний круг', 'ppdittttdd', 'ppdittttdd', 'ddddttiipp'],
    [32, 'За живой изгородью', 'ddddditt', 'ttiidipp', 'ttiddppi', 'ttiddppi'],
    [33, 'Широкая клумба', 'idptii', 'idptii', 'iiiidd', 'ttppii', 'dipptt', 'dipptt'],
    [34, 'Параллельные тропы', 'ttptiitdd', 'iippiipii', 'ttdpttpdi', 'ttdpttpdi'],
    [35, 'Дальний угол', 'ppiitpdddt', 'iiiitpdddt', 'ddddttttii', 'iiddttiitt'],
    [36, 'Сад в сумерках', 'tttdtiittt', 'tttdiiiiii', 'iiiidiiddd', 'pidditdddd', 'pidditdddd'],
    [10, 'Полный гербарий', 'ddttppddiidiid'],
    [37, 'Четыре стороны', 'ttipiitt', 'ddipiitt', 'ddppiipp', 'ttddidpp', 'ttddidtt'],
    [38, 'Длинная теплица', 'ttpppdddd', 'ttddpttdd', 'ttiddpptt', 'iiiddttpp'],
    [39, 'Листопад', 'iiddpppdii', 'ppttttpddd', 'ppttttiiii'],
    [40, 'Плетёная ограда', 'dtipttdd', 'dtipttdd', 'ttppppii', 'ppttdddd', 'ttpdddpp', 'pppdtttt'],
    [41, 'Лабиринт лепестков', 'iittiiidii', 'iiddddidtt', 'ppptdidpdp', 'iiptdidpdp'],
    [42, 'Разворот гербария', 'iiidpipitt', 'iiidpipitt', 'ttddiiiitt', 'ppppttdptt', 'ttppttdpdd'],
    [43, 'Изгиб дорожки', 'ddpiiipip', 'ddpiiipip', 'ddiittddt', 'ddddttppt', 'ddpipiiii', 'ddpiptddt'],
    [44, 'Большая оранжерея', 'ttttpiiiii', 'ttttpiiiii', 'ttttttiiii', 'ddttttiidd', 'ppddttiipp', 'ddddddiiii'],
    [48, 'Перед финалом', 'ttttitiidddd', 'ppttitiipptt', 'iiiiddpppptt'],
    [45, 'Тропы между клумбами', 'ditittpdii', 'ditittpdii', 'iippdtppii', 'ddiidtpptt', 'ttiiddppdd'],
    [46, 'Цветочный узор', 'ppidiptpp', 'ttidiptii', 'ddiiddtii', 'ddttiitii', 'pptttippp', 'iitttippp'],
    [47, 'Сад на изнанке', 'ppppiipiti', 'ppttttpiti', 'iippddippp', 'ddiippipii', 'ppipppiddi', 'ddipppiddi'],
    [49, 'Бумажный лабиринт', 'ttiipdittttt', 'pppppditdddd', 'ttddttddppdd', 'pppptdddpppp', 'pppptdddppii'],
    [50, 'Весь сад на листе', 'ttpppptddtdd', 'iittddtddttt', 'ttddttiipppp', 'ppiitpddpitt', 'pppptpddpiii']
  ];
  const variants = typeof module !== 'undefined' ? require('./variants.js') : GardenVariants;
  const introductions = { 5: 'gold', 8: 'order', 13: 'stems', 22: 'holes', 31: 'flip' };
  const levels = catalog.map(([id, name, ...rows], index) => {
    const variant = variants[id];
    const number = index + 1;
    return {
      id, name, rows, ...variant,
      gold: number >= 5,
      introduction: introductions[number],
      revised: Boolean(variant)
    };
  });

  const hole = '.';
  const reverseRow = row => [...row].reverse().join('');

  function boardFor(level) {
    return {
      rows: level.rows,
      back: level.back,
      stems: level.stems,
      order: level.order,
      side: 'a'
    };
  }

  function requestedFlower(board) {
    return Array.from(board.order ?? '').find(kind => board.rows.some(row => row.includes(kind)));
  }

  function reflectedStem(stem, axis) {
    return (axis === 'x' ? '0321' : '2103')[Number(stem)];
  }

  function flip(board) {
    if (!board.back || !board.rows.length) return null;
    return {
      ...board,
      rows: board.back.map(reverseRow),
      back: board.rows.map(reverseRow),
      side: board.side === 'a' ? 'b' : 'a'
    };
  }

  function layout(board, axis, cut) {
    const { rows, back, stems } = board;
    const size = axis === 'x' ? rows[0]?.length : rows.length;
    if (!Number.isInteger(cut) || cut < 1 || cut >= size || !size) return null;
    const near = cut <= size / 2;
    const band = Math.min(cut, size - cut);
    const breadth = axis === 'x' ? rows.length : rows[0].length;
    const contacts = [];
    const pairs = [];
    const cell = (line, cross) => axis === 'x' ? { column: line, row: cross } : { column: cross, row: line };
    const at = (grid, position) => grid[position.row][position.column];

    for (let across = 0; across < breadth; across += 1) {
      for (let depth = 0; depth < band; depth += 1) {
        const left = cut - 1 - depth;
        const right = cut + depth;
        const source = cell(near ? left : right, across);
        const target = cell(near ? right : left, across);
        const kind = at(rows, source);
        const other = at(rows, target);
        if (kind === hole && other === hole) continue;

        let reason = '';
        if (kind === hole || other === hole) reason = 'holes';
        else if (kind !== other) reason = 'flowers';
        else if (stems && reflectedStem(at(stems, source), axis) !== at(stems, target)) reason = 'stems';

        // Put the mismatch marker over paper when the landing square is a cutout.
        const marker = other === hole ? source : target;
        const contact = { source, target, marker, kind, reason, match: !reason };
        contacts.push(contact);
        if (contact.match) pairs.push(contact);
      }
    }

    const requested = requestedFlower(board);
    const reason = contacts.find(contact => contact.reason)?.reason
      || (!contacts.length ? 'empty' : '')
      || (requested && pairs.some(pair => pair.kind !== requested) ? 'order' : '');
    const start = cut - band;
    const end = cut + band;
    const trim = grid => axis === 'x'
      ? grid?.map(row => row.slice(0, start) + row.slice(end))
      : grid && [...grid.slice(0, start), ...grid.slice(end)];
    const nextRows = trim(rows);
    const remaining = nextRows.some(row => [...row].some(kind => kind !== hole));
    const next = {
      ...board,
      rows: remaining ? nextRows : [],
      back: trim(back),
      stems: trim(stems)
    };
    return { axis, cut, near, band, pairs, contacts, next, reason, match: !reason };
  }

  function moves(board) {
    const { rows } = board;
    if (!rows.length) return [];
    const horizontal = Array.from({ length: rows[0].length - 1 }, (_, i) => layout(board, 'x', i + 1));
    const vertical = Array.from({ length: rows.length - 1 }, (_, i) => layout(board, 'z', i + 1));
    return [...horizontal, ...vertical];
  }

  function replay(level, history) {
    let board = boardFor(level);
    const collected = [];
    const validHistory = [];
    let folds = 0;
    for (const step of history) {
      if (!board.rows.length || !Array.isArray(step)) break;
      if (step[0] === 'flip') {
        const turned = flip(board);
        if (!turned) break;
        board = turned;
      } else {
        if (!['x', 'z'].includes(step[0])) break;
        const move = layout(board, ...step);
        if (!move?.match) break;
        board = move.next;
        collected.push(...move.pairs.map(pair => pair.kind));
        folds += 1;
      }
      validHistory.push(step);
    }
    return { ...board, collected, folds, history: validHistory };
  }

  function shortest(level, { allowFlip = true } = {}) {
    const memo = new Map();
    function search(board) {
      if (!board.rows.length) return { folds: 0, flips: 0, history: [] };
      const key = [board.rows, board.back, board.stems].map(part => part?.join('/') ?? '').join('|');
      if (memo.has(key)) return memo.get(key);
      let best = null;
      const opposite = allowFlip && flip(board);
      for (const face of opposite ? [board, opposite] : [board]) {
        const turning = face !== board;
        for (const move of moves(face)) {
          if (!move.match) continue;
          const tail = search(move.next);
          if (!tail) continue;
          const folds = tail.folds + 1;
          const flips = tail.flips + Number(turning);
          if (best && (folds > best.folds || (folds === best.folds && flips >= best.flips))) continue;
          const steps = [[move.axis, move.cut], ...tail.history];
          best = { folds, flips, history: turning ? [['flip'], ...steps] : steps };
        }
      }
      memo.set(key, best);
      return best;
    }
    return search(boardFor(level));
  }

  function totalFlowers(level) {
    return level.rows.join('').replace(/\./g, '').length / 2;
  }

  return { levels, hole, boardFor, layout, moves, replay, flip, requestedFlower, reflectedStem, shortest, totalFlowers };
})();

if (typeof module !== 'undefined') module.exports = GardenPuzzle;
