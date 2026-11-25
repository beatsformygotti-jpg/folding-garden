'use strict';

const GardenPaper = (() => {
  const thickness = .028;
  const tableHeight = .067;
  const markerOffset = .26;
  const point = (x, y, z) => new THREE.Vector3(x, y, z);
  const signFor = move => move.near ? -1 : 1;

  class PaperView {
    constructor(canvas, guide) {
      this.canvas = canvas;
      this.guide = guide;
      this.move = null;
      this.angle = 0;
      this.tiles = [];
      this.creases = [];
      this.materials = new Map();
      this.width = 1;
      this.height = 1;
      this.columns = 0;
      this.rows = [];
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 60);
      this.camera.position.set(1.1, 11.4, 9.6);
      this.camera.lookAt(0, 0, 0);
      this.camera.updateMatrixWorld();

      try {
        const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!context) throw new Error('WebGL 2 unavailable');
        const renderer = new THREE.WebGLRenderer({ canvas, context });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        this.renderer = renderer;
      } catch {
        const fallback = canvas.cloneNode();
        canvas.replaceWith(fallback);
        this.canvas = fallback;
        this.ctx = fallback.getContext('2d');
      }

      if (!this.renderer) return;

      this.scene = new THREE.Scene();
      this.sheet = new THREE.Group();
      this.hinge = new THREE.Group();
      this.scene.add(this.sheet, this.hinge);
      this.tileGeometry = new THREE.BoxGeometry(.999, thickness, .999);
      const tileFaces = Array.from(this.tileGeometry.index.array);
      this.tileGeometry.setIndex([...tileFaces.slice(0, 12), ...tileFaces.slice(24), ...tileFaces.slice(12, 24)]);
      this.tileGeometry.clearGroups();
      this.tileGeometry.addGroup(0, 24, 0);
      this.tileGeometry.addGroup(24, 6, 1);
      this.tileGeometry.addGroup(30, 6, 2);
      this.edge = new THREE.MeshLambertMaterial({ color: 0xc8ad75 });
      this.sheet.position.y = tableHeight;

      const light = new THREE.DirectionalLight(0xfff8e8, 1.37);
      light.position.set(-4, 8, -3);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      Object.assign(light.shadow.camera, { left: -11, right: 11, top: 8, bottom: -9, near: .5, far: 22 });
      light.shadow.normalBias = .013;
      light.shadow.bias = -.00015;
      const fill = new THREE.DirectionalLight(0xfff2df, .52);
      fill.position.set(5, 6, 7);
      this.scene.add(light, fill, new THREE.HemisphereLight(0xfffaf1, 0xd9ddcb, 1.35));

      const table = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({
        color: 0x425844,
        opacity: .34
      }));
      table.rotation.x = -Math.PI / 2;
      table.receiveShadow = true;
      this.scene.add(table);

      this.dashGeometries = new Map();
      this.dashPaint = new THREE.MeshBasicMaterial({ color: 0x695a3e, opacity: .48, transparent: true, depthWrite: false });
      this.activePaint = new THREE.MeshBasicMaterial({ color: 0x335e48 });
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x56835e,
        opacity: .75,
        transparent: true,
        depthWrite: false
      });
      const outlineGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.outline = new THREE.Group();
      for (let i = 0; i < 4; i += 1) this.outline.add(new THREE.Mesh(outlineGeometry, outlineMaterial));
      this.outline.visible = false;
      this.scene.add(this.outline);
    }

    textureMaterial(kind, direction, finish, stem, back) {
      const key = [kind, direction, finish, stem, back].join('/');
      if (this.materials.has(key)) return this.materials.get(key);
      const texture = new THREE.CanvasTexture(GardenArt.cell(kind, direction, finish, stem));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      if (back) {
        texture.repeat.y = -1;
        texture.offset.y = 1;
      }
      const material = new THREE.MeshLambertMaterial({ map: texture });
      this.materials.set(key, material);
      return material;
    }

    creaseGeometry(segments) {
      const key = segments.map(Number).join('');
      const length = segments.length;
      const cached = this.dashGeometries.get(key);
      if (cached) return cached;
      const points = [];
      const indices = [];
      for (let i = 0; i < length * 8; i += 1) {
        if (!segments[Math.floor(i / 8)]) continue;
        const center = (i + .5) / 8 - length / 2;
        const left = center - .0425;
        const right = center + .0425;
        const start = points.length / 3;
        points.push(left, 0, -.0085, left, 0, .0085, right, 0, -.0085, right, 0, .0085);
        indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      geometry.setIndex(indices);
      this.dashGeometries.set(key, geometry);
      return geometry;
    }

    setBoard(board, moves, tip) {
      const { rows, back, stems, side } = board;
      this.rows = rows;
      this.columns = rows[0]?.length ?? 0;
      this.moves = moves;
      this.tip = tip;
      this.tutorialFrame = tip;
      this.move = null;
      this.angle = 0;
      this.turnAngle = 0;
      this.hinge?.clear();
      this.sheet?.clear();
      if (this.sheet) {
        this.sheet.rotation.z = 0;
        this.sheet.position.y = tableHeight;
      }
      if (this.outline) this.outline.visible = false;
      this.tiles = [];
      this.creases = [];

      for (let row = 0; row < rows.length; row += 1) {
        for (let column = 0; column < this.columns; column += 1) {
          const kind = rows[row][column];
          if (kind === GardenPuzzle.hole) continue;
          const direction = rows.length > 1 && this.columns <= 4
            ? (row < rows.length / 2 ? 'down' : 'up')
            : (column < this.columns / 2 ? 'right' : 'left');
          const origin = point(column + .5 - this.columns / 2, 0, row + .5 - rows.length / 2);
          const stem = stems?.[row][column];
          const colors = side === 'a' ? ['front', 'reverse'] : ['reverse', 'front'];
          const front = [kind, direction, colors[0], stem];
          const reverseDirection = { left: 'right', right: 'left', up: 'up', down: 'down' }[direction];
          const reverse = back
            ? [back[row][column], reverseDirection, colors[1]]
            : [kind, direction, 'plain', stem];
          const tile = { column, row, origin, front, reverse };
          if (this.renderer) {
            const frontMaterial = this.textureMaterial(...front, false);
            const backMaterial = this.textureMaterial(reverse[0], reverse[1], reverse[2], reverse[3], true);
            tile.mesh = new THREE.Mesh(this.tileGeometry, [this.edge, frontMaterial, backMaterial]);
            tile.mesh.position.copy(origin);
            tile.mesh.castShadow = true;
            tile.mesh.receiveShadow = true;
            this.sheet.add(tile.mesh);
          }
          this.tiles.push(tile);
        }
      }

      for (const move of moves) {
        const location = this.location(move);
        const cut = move.cut;
        const hole = GardenPuzzle.hole;
        const segments = move.axis === 'x' ? rows.map(row => row[cut - 1] !== hole && row[cut] !== hole)
          : [...rows[cut]].map((kind, i) => kind !== hole && rows[cut - 1][i] !== hole);
        const crease = { ...move, location, segments, mesh: null };
        if (this.renderer) {
          crease.mesh = new THREE.Mesh(this.creaseGeometry(segments), this.dashPaint);
          crease.mesh.position.copy(location).setY(thickness * .5 + .002);
          if (move.axis === 'x') crease.mesh.rotation.y = Math.PI / 2;
          this.sheet.add(crease.mesh);
        }
        this.creases.push(crease);
      }

      this.fit();
    }

    location(move) {
      return move.axis === 'x'
        ? point(move.cut - this.columns * .5, 0, 0)
        : point(0, 0, move.cut - this.rows.length * .5);
    }

    project(value) {
      const screen = value.clone().project(this.camera);
      return {
        x: (screen.x + 1) * .5 * this.width,
        y: (1 - screen.y) * .5 * this.height,
        depth: screen.z
      };
    }

    marker(move) {
      const position = this.location(move);
      position.y = tableHeight;
      if (move.axis === 'x') position.z = this.rows.length * .5 + markerOffset;
      else position.x = -this.columns * .5 - markerOffset - .06;
      return this.project(position);
    }

    atCell(cell, y) {
      return this.project(point(cell.column + .5 - this.columns * .5, y, cell.row + .5 - this.rows.length * .5));
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
      const ratio = Math.min(1.7, window.devicePixelRatio || 1);
      if (this.renderer) {
        this.renderer.setPixelRatio(ratio);
        this.renderer.setSize(width, height, false);
      } else {
        this.canvas.width = width * ratio;
        this.canvas.height = height * ratio;
      }
      this.fit();
    }

    throughHinge(value, move, angle) {
      const p = value.clone();
      if (!move) return p;
      const pivot = this.location(move);
      const offset = move.axis === 'x' ? value.x - pivot.x : value.z - pivot.z;
      const lifted = Math.cos(angle) * offset - Math.sin(angle) * value.y * signFor(move);
      if (move.axis === 'x') p.x = pivot.x + lifted;
      else p.z = pivot.z + lifted;
      p.y = offset * Math.sin(angle) * signFor(move) + value.y * Math.cos(angle);
      return p;
    }

    fit() {
      const halfW = this.columns * .5;
      const halfH = this.rows.length * .5;
      const left = -halfW - (this.rows.length > 1 ? .68 : .09);
      this.flatBounds = [
        point(left, tableHeight, -halfH), point(halfW, tableHeight, -halfH),
        point(halfW, tableHeight, halfH + .57), point(left, tableHeight, halfH + .57)
      ];
      if (this.tutorialFrame) this.flatBounds.push(point(0, .95, -halfH - .17));
      this.fitCamera();
      this.decorate();
      this.render();
    }

    fitCamera() {
      const extents = [...this.flatBounds];
      if (this.move && this.angle > 0) {
        const halfW = this.columns * .5;
        const halfH = this.rows.length * .5;
        const sign = signFor(this.move);
        const outer = this.move.axis === 'x'
          ? [point(sign * halfW, 0, -halfH), point(sign * halfW, 0, halfH)]
          : [point(-halfW, 0, sign * halfH), point(halfW, 0, sign * halfH)];
        for (const corner of outer) {
          const p = this.throughHinge(corner, this.move, this.angle);
          p.y += tableHeight + thickness;
          extents.push(p);
        }
      }

      if (this.turnAngle > 0) {
        for (const x of [-this.columns * .5, this.columns * .5]) {
          for (const z of [-this.rows.length * .5, this.rows.length * .5]) {
            extents.push(this.throughTurn(point(x, thickness * .5, z)));
          }
        }
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of extents) {
        const v = p.clone().applyMatrix4(this.camera.matrixWorldInverse);
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
      const cx = (minX + maxX) * .5;
      const cy = (minY + maxY) * .5;
      const extentX = Math.max(.5, (maxX - minX) * .5);
      const extentY = Math.max(.5, (maxY - minY) * .5);
      const side = Math.min(145, Math.max(22, this.width * (this.columns > 6 ? .075 : .11)));
      const top = Math.min(80, Math.max(16, this.height * .09));
      this.pixelsPerUnit = Math.max(1, Math.min(195, (this.width * .5 - side) / extentX, (this.height * .5 - top) / extentY));
      const width = this.width * .5 / this.pixelsPerUnit;
      const height = this.height * .5 / this.pixelsPerUnit;
      Object.assign(this.camera, { left: cx - width, right: cx + width, top: cy + height, bottom: cy - height });
      this.camera.updateProjectionMatrix();
    }

    decorate() {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      this.guide.width = this.width * ratio;
      this.guide.height = this.height * ratio;
      if (!this.tip) return;

      const ctx = this.guide.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.globalAlpha = .78;
      const z = -this.rows.length * .5 - .1;
      const start = this.project(point(-this.columns * .31, .23, z));
      const right = this.project(point(this.columns * .17, .32, z));
      const peak = this.project(point(-.3, 1.28, z));
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(start.x - 5, peak.y, right.x - 12, peak.y - 7, right.x, right.y);
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = '#62866a';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.min(2.2, this.pixelsPerUnit * .026);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(right.x - 11, right.y - 5);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(right.x + 3, right.y - 11);
      ctx.stroke();
    }

    select(move) {
      this.move = move;
      this.angle = 0;
      this.fitCamera();

      if (!this.renderer) {
        this.render();
        return;
      }

      const pivot = move ? this.location(move) : point(0, 0, 0);
      this.outline.visible = Boolean(move);
      if (move) {
        const acrossX = move.axis === 'x';
        const offset = move.band * .5 * -signFor(move);
        const width = (acrossX ? move.band : this.columns) - .046;
        const depth = (acrossX ? this.rows.length : move.band) - .046;
        this.outline.position.copy(pivot).setY(tableHeight + thickness * .5 + .006);
        if (acrossX) this.outline.position.x += offset;
        else this.outline.position.z += offset;
        this.outline.children.forEach((edge, i) => {
          const sign = i % 2 ? -1 : 1;
          if (i < 2) {
            edge.position.z = depth * .5 * sign;
            edge.scale.set(width, 1, .021);
          } else {
            edge.position.x = width * .5 * sign;
            edge.scale.set(.021, 1, depth);
          }
        });
      }
      this.hinge.position.copy(pivot).setY(tableHeight);
      this.hinge.rotation.set(0, 0, 0);

      for (const tile of this.tiles) {
        const index = move?.axis === 'x' ? tile.column : tile.row;
        tile.moving = Boolean(move && (move.near ? index < move.cut : index >= move.cut));
        const parent = tile.moving ? this.hinge : this.sheet;
        parent.add(tile.mesh);
        tile.mesh.position.copy(tile.origin);
        if (tile.moving) tile.mesh.position.sub(pivot);
      }

      for (const crease of this.creases) {
        const sameAxis = move?.axis === crease.axis;
        const active = sameAxis && move.cut === crease.cut;
        const moving = sameAxis && (move.near ? crease.cut < move.cut : crease.cut > move.cut);
        (moving ? this.hinge : this.sheet).add(crease.mesh);
        crease.mesh.position.copy(crease.location).setY(thickness * .5 + (active ? .007 : .002));
        if (moving) crease.mesh.position.sub(pivot);
        crease.mesh.visible = !move || sameAxis;
        crease.mesh.material = active ? this.activePaint : this.dashPaint;
        crease.mesh.scale.z = active ? 1.65 : 1;
      }
      this.render();
    }

    frame(angle) {
      this.angle = angle;
      if (this.renderer && this.move) {
        const sign = signFor(this.move);
        if (this.move.axis === 'x') this.hinge.rotation.z = angle * sign;
        else this.hinge.rotation.x = -angle * sign;
        // Raise the rotating layer by one paper thickness when the two faces meet.
        this.hinge.position.y = tableHeight + Math.pow(angle / Math.PI, 6) * (thickness + .003);
      }
      this.fitCamera();
      this.render();
    }

    turnHeight() {
      return tableHeight + Math.sin(this.turnAngle) * this.columns * .5;
    }

    throughTurn(p) {
      const sin = Math.sin(this.turnAngle);
      const cos = Math.cos(this.turnAngle);
      return point(p.x * cos - p.y * sin, p.x * sin + p.y * cos + this.turnHeight(), p.z);
    }

    turn(angle) {
      this.turnAngle = angle;
      if (this.sheet) {
        this.sheet.rotation.z = angle;
        this.sheet.position.y = this.turnHeight();
      }
      this.fitCamera();
      this.render();
    }

    render() {
      if (this.renderer) this.renderer.render(this.scene, this.camera);
      else this.paintFallback();
    }

    paintFallback() {
      const ctx = this.ctx;
      if (!ctx) return;
      ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);
      const move = this.move;
      const shape = (tile, y) => {
        const index = move?.axis === 'x' ? tile.column : tile.row;
        const moving = move && (move.near ? index < move.cut : index >= move.cut);
        return [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([dx, dz]) => {
          const p = tile.origin.clone().add(point(dx, y, dz));
          if (this.turnAngle > 0) return this.throughTurn(p);
          const value = moving ? this.throughHinge(p, move, this.angle) : p;
          value.y += tableHeight + (moving ? Math.pow(this.angle / Math.PI, 6) * (thickness + .003) : 0);
          return value;
        });
      };
      function path(quad) {
        ctx.beginPath();
        ctx.moveTo(quad[0].x, quad[0].y);
        for (const p of quad.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath();
      }

      const projected = [];
      for (const tile of this.tiles) {
        const base = shape(tile, -thickness / 2);
        const top = shape(tile, thickness / 2);
        const shadow = base.map(p => this.project(point(p.x + .11 + p.y * .4, 0, p.z + .06 + p.y * .23)));
        const quad = top.map(p => this.project(p));
        const bottom = base.map(p => this.project(p));
        const reverse = (quad[1].x - quad[0].x) * (quad[3].y - quad[0].y)
          - (quad[1].y - quad[0].y) * (quad[3].x - quad[0].x) < 0;
        const surface = reverse ? bottom : quad;
        projected.push({ tile, surface, reverse, depth: surface.reduce((sum, p) => sum + p.depth, 0) / 4 });

        path(shadow);
        ctx.fillStyle = '#3f5b4129';
        ctx.fill();
      }
      projected.sort((a, b) => b.depth - a.depth);

      for (const { tile, surface, reverse } of projected) {
        const [a, b, , d] = surface;
        ctx.save();
        ctx.transform(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y, a.x, a.y);
        ctx.drawImage(GardenArt.cell(...(reverse ? tile.reverse : tile.front)), 0, 0, 1, 1);
        ctx.restore();
        path(surface);
        ctx.strokeStyle = '#715f3c5c';
        ctx.lineWidth = .8;
        ctx.stroke();
      }

      if (this.turnAngle > 0) return;
      for (const crease of this.creases) {
        if (move && !(move.axis === crease.axis && move.cut === crease.cut)) continue;
        const length = crease.segments.length;
        const center = crease.location.clone().setY(tableHeight + thickness * .5);
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        crease.segments.forEach((present, i) => {
          if (!present) return;
          const offset = i - length / 2;
          const a = center.clone();
          const b = center.clone();
          const axis = crease.axis === 'x' ? 'z' : 'x';
          a[axis] += offset;
          b[axis] += offset + 1;
          const screenA = this.project(a);
          const screenB = this.project(b);
          ctx.moveTo(screenA.x, screenA.y);
          ctx.lineTo(screenB.x, screenB.y);
        });
        ctx.strokeStyle = move ? '#335e48' : '#695a3e99';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  return PaperView;
})();
