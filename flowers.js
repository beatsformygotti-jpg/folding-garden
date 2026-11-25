'use strict';

const GardenArt = (() => {
  const flowers = {};
  const textures = new Map();

  function surface(width, height = width) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function randomGenerator(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function disk(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function petal(ctx, { angle, length, width, color, edge, vein, curl = 0 }) {
    ctx.save();
    ctx.rotate(angle);
    const fade = ctx.createLinearGradient(0, 3, curl, -length);
    fade.addColorStop(0, edge);
    fade.addColorStop(0.42, color);
    fade.addColorStop(1, color);
    ctx.beginPath();
    ctx.moveTo(-2, 6);
    ctx.bezierCurveTo(-width * 0.68, -length * 0.28, -width * 0.83 + curl, -length * 0.97, curl, -length);
    ctx.bezierCurveTo(width * 0.83 + curl, -length * 0.99, width * 0.70, -length * 0.36, 2, 6);
    ctx.fillStyle = fade;
    ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = edge;
    ctx.stroke();

    if (vein) {
      ctx.strokeStyle = vein;
      ctx.lineWidth = 0.65;
      for (let j = -2; j <= 2; j += 1) {
        ctx.beginPath();
        ctx.moveTo(j, -9);
        ctx.quadraticCurveTo(j * width * 0.20, -length * 0.55, j * width * 0.15 + curl, -length * 0.82);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBloom(ctx, kind) {
    const rand = randomGenerator(41);
    const cycle = Math.PI * 2;
    if (kind === 'p') {
      ['#cb654e', '#c24d3d', '#de7056', '#c95746', '#d8624d', '#bd4a3e'].forEach((color, j) => {
        petal(ctx, { angle: cycle * j / 6 + .13, length: 63 + rand() * 9, width: 56,
          color, edge: '#a8483a', vein: '#842f273b', curl: (rand() - .5) * 11 });
      });
      disk(ctx, 0, 0, 17, '#4d3528');
      disk(ctx, 0, 0, 8, '#736243');
      disk(ctx, 0, 0, 4.8, '#907f54');
      for (let j = 0; j < 27; j += 1) {
        const a = j * 2.39996;
        const r = 9 + rand() * 7;
        disk(ctx, Math.cos(a) * r, Math.sin(a) * r, .8 + rand(), j % 3 ? '#d4a663' : '#eecc85');
      }
    } else if (kind === 'd') {
      for (let j = 0; j < 13; j += 1) {
        petal(ctx, { angle: cycle * j / 13, length: 59 + rand() * 10, width: 21 + rand() * 4,
          color: j % 2 ? '#fff8d7' : '#fff9e5', edge: '#b7a176', vein: '#c0aa7d45',
          curl: (rand() - .5) * 8 });
      }
      disk(ctx, 0, 0, 17, '#dfa334');
      disk(ctx, -1, -1, 13.5, '#edbc52');
      for (let j = 0; j < 53; j += 1) {
        const a = j * 2.39996;
        const r = Math.sqrt(j / 53) * 14;
        disk(ctx, Math.cos(a) * r, Math.sin(a) * r, .78 + rand() * .55, j % 2 ? '#cc902c' : '#fde29a');
      }
    } else if (kind === 't') {
      ctx.translate(0, 15);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.quadraticCurveTo(4, 19, -3, 43);
      ctx.strokeStyle = '#54714d';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      petal(ctx, { angle: -2.3, length: 45, width: 17, color: '#84915a', edge: '#536b45' });
      petal(ctx, { angle: 2.46, length: 47, width: 18, color: '#a1a267', edge: '#687a4c' });
      [-.57, .56, -.29, .28, 0].forEach((angle, j) => petal(ctx, {
        angle, length: [56, 56, 66, 64, 70][j], width: 35,
        color: ['#cf7969', '#da795f', '#e9a381', '#e98c6e', '#edaa86'][j],
        edge: '#ae5e51', vein: '#98483b40', curl: (j - 2) * 1.9
      }));
    } else {
      for (let j = 0; j < 3; j += 1) {
        petal(ctx, { angle: j * cycle / 3, length: 59 + j * 3, width: 37,
          color: ['#a097c8', '#a99acf', '#b3a6d2'][j], edge: '#706897', vein: '#6f628959', curl: 3 });
      }
      for (let j = 0; j < 3; j += 1) {
        petal(ctx, { angle: .99 + j * cycle / 3, length: 60, width: 41,
          color: ['#8983b7', '#9284b9', '#8e83b9'][j], edge: '#5c5586', vein: '#51477762', curl: -6 });
        ctx.save();
        ctx.rotate(.99 + j * cycle / 3);
        petal(ctx, { angle: 0, length: 37, width: 10, color: '#e4c984', edge: '#a48a6b' });
        ctx.restore();
      }
      disk(ctx, 0, 0, 4.3, '#e1bf75');
    }
  }

  function bloom(kind) {
    if (flowers[kind]) return flowers[kind];
    const canvas = surface(192);
    const ctx = canvas.getContext('2d');
    ctx.translate(96, 96);
    ctx.scale(1.17, 1.17);
    drawBloom(ctx, kind);
    flowers[kind] = canvas;
    return canvas;
  }

  function icon(kind) {
    const image = new Image();
    image.alt = '';
    image.src = bloom(kind).toDataURL('image/png');
    return image;
  }

  function cell(kind, direction, finish = 'front', stem) {
    const key = [kind, direction, finish, stem].join('/');
    if (textures.has(key)) return textures.get(key);
    const canvas = surface(256);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 249, 246);
    const colors = {
      front: ['#fff1d2', '#f4e2be'],
      reverse: ['#e0ebce', '#ccdcb6'],
      plain: ['#edddae', '#e6d2a3']
    };
    gradient.addColorStop(0, colors[finish][0]);
    gradient.addColorStop(1, colors[finish][1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const rand = randomGenerator(77);
    for (let j = 0; j < 2100; j += 1) {
      ctx.fillStyle = j % 3 ? 'rgba(112,75,47,.065)' : 'rgba(255,255,236,.27)';
      ctx.fillRect(rand() * 256, rand() * 256, .7 + rand() * 1.3, .65 + rand());
    }

    const x = direction === 'right' ? 190 : direction === 'left' ? 66 : 128;
    const y = direction === 'down' ? 190 : direction === 'up' ? 66 : 128;
    ctx.save();
    ctx.beginPath();
    if (direction === 'right') ctx.rect(0, 0, x, 256);
    if (direction === 'left') ctx.rect(x, 0, 256 - x, 256);
    if (direction === 'down') ctx.rect(0, 0, 256, y);
    if (direction === 'up') ctx.rect(0, y, 256, 256 - y);
    ctx.clip();
    ctx.globalAlpha = finish === 'plain' ? .61 : 1;
    ctx.drawImage(bloom(kind), x - 101, y - 101, 202, 202);
    ctx.restore();

    ctx.strokeStyle = finish === 'plain' ? '#ac946256' : '#99774855';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (direction === 'left' || direction === 'right') {
      ctx.moveTo(x, y - 80);
      ctx.lineTo(x, y + 80);
    } else {
      ctx.moveTo(x - 80, y);
      ctx.lineTo(x + 80, y);
    }
    ctx.stroke();
    if (stem !== undefined) {
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(128, 205);
      disk(ctx, 0, 0, 30, '#faf5da');
      ctx.rotate(Number(stem) * Math.PI / 2);
      ctx.strokeStyle = '#34573d';
      ctx.fillStyle = '#597759';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(0, -20);
      ctx.lineTo(-10, -10);
      ctx.moveTo(0, -20);
      ctx.lineTo(10, -10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 13);
      ctx.quadraticCurveTo(-18, 11, -17, -2);
      ctx.quadraticCurveTo(-2, -1, 0, 13);
      ctx.fill();
      ctx.restore();
    }
    textures.set(key, canvas);
    return canvas;
  }

  function sprig(ctx, x, y, scale, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineWidth = .9;
    ctx.strokeStyle = '#557457';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(24, -36, 12, -113);
    ctx.stroke();

    for (let j = 0; j < 8; j += 1) {
      const side = j % 2 ? 1 : -1;
      ctx.save();
      ctx.translate(14 + 3 * Math.sin(j * .65), -17 - j * 12);
      ctx.scale(side, 1);
      ctx.rotate(.14);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(5, -19, 28 - j * 1.65, -20);
      ctx.quadraticCurveTo(25 - j, -4, 0, 0);
      ctx.fillStyle = j % 3 ? '#7f996b' : '#adc08b';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(9, -11, 23 - j, -17);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function ornament(canvas, width, height) {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const inset = width < 600 ? 15 : 26;
    const scale = Math.min(1.28, height / 310);
    ctx.globalAlpha = .55;
    sprig(ctx, 15, 80 * scale + 13, scale * .88, -.5);
    sprig(ctx, 10, 51 * scale + 12, scale * .65, .64);
    sprig(ctx, width - 14, height - 83 * scale, scale * 1.16, 2.58);
    sprig(ctx, width - 43 * scale, height - 10, scale * .83, .68);
    ctx.globalAlpha = .17;
    ctx.strokeStyle = '#69815b';
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    const rand = randomGenerator(90);
    ctx.globalAlpha = .13;
    for (let j = 0; j < width * height / 460; j += 1) {
      disk(ctx, rand() * width, rand() * height, rand() * .85 + .1, '#3e5c42');
    }
  }

  return { bloom, icon, cell, ornament };
})();
