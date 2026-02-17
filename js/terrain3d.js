/* ===================================================
   TERRAIN3D — Build Three.js 3D terrain from map data
   Tile size: 2 world units per tile
   Coordinate mapping: worldX = tileX*2, worldZ = tileY*2
   Y axis is up.
   =================================================== */

const TILE_SIZE = 2;

// ---- Tile world Y (top-face elevation) ----
function tileWorldY(tile) {
  if (!tile) return 0;
  const h = {
    WATER: -0.65, SHALLOW: -0.25, MUD: -0.08, SNOW: 0.05,
    SAND: 0, GRASS: 0.04, FLOWER: 0.04, ROCK: 0.18,
    ROAD: 0.01, COBBLE: 0.03, PAVEMENT: 0.03, MARKET: 0.03,
    DOOR: 0.03, FLOOR: 0.03, RUINS: 0.22, DOCK: 0.04,
    PIER: 0.14, TREE: 0.04, BUSH: 0.04, COAL: 0.15,
    MINESHAFT: -0.08, WALL: 0.03, CLIFF: 2.0,
  };
  return h[tile.id] !== undefined ? h[tile.id] : 0;
}

// ---- Hex colour to THREE.Color ----
function hexCol(hex) {
  return new THREE.Color(hex);
}

// ---- Build merged terrain geometry ----
function buildTerrainMesh(world) {
  const positions = [];
  const colors    = [];
  const normals   = [];
  const uvs       = [];
  const indices   = [];

  let vi = 0; // vertex index counter

  // Helper: add a quad (2 triangles) with given vertices and colour
  function addQuad(v0, v1, v2, v3, col, nx, ny, nz) {
    for (const v of [v0, v1, v2, v3]) {
      positions.push(v[0], v[1], v[2]);
      colors.push(col.r, col.g, col.b);
      normals.push(nx, ny, nz);
    }
    uvs.push(0,0, 1,0, 1,1, 0,1);
    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    vi += 4;
  }

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const tileId = world.map[ty][tx];
      const tile   = TILES._byNum[tileId];
      if (!tile) continue;

      // Skip water — drawn separately with animated plane
      if (tile.id === 'WATER') continue;

      const y    = tileWorldY(tile);
      const wx   = tx * TILE_SIZE;
      const wz   = ty * TILE_SIZE;
      const hs   = TILE_SIZE / 2;

      // --- Colour variation ---
      const topCol  = hexCol(tile.topColour);
      // Subtle random variation to break uniformity
      const vary = (Math.sin(tx * 13.7 + ty * 7.3) * 0.5 + 0.5) * 0.06 - 0.03;
      topCol.r = Math.max(0, Math.min(1, topCol.r + vary));
      topCol.g = Math.max(0, Math.min(1, topCol.g + vary));
      topCol.b = Math.max(0, Math.min(1, topCol.b + vary));

      const sideCol = topCol.clone().multiplyScalar(0.65);

      // Top face
      addQuad(
        [wx-hs, y, wz-hs], [wx+hs, y, wz-hs],
        [wx+hs, y, wz+hs], [wx-hs, y, wz+hs],
        topCol, 0, 1, 0
      );

      // Side faces: look at each of the 4 neighbours
      // South face (positive Z)
      const sNeighbour = ty + 1 < MAP_H ? TILES._byNum[world.map[ty+1][tx]] : null;
      const sY = sNeighbour ? tileWorldY(sNeighbour) : -1;
      if (y > sY + 0.01) {
        addQuad(
          [wx-hs, sY, wz+hs], [wx+hs, sY, wz+hs],
          [wx+hs, y,  wz+hs], [wx-hs, y,  wz+hs],
          sideCol.clone().multiplyScalar(0.85), 0, 0, 1
        );
      }

      // North face (negative Z)
      const nNeighbour = ty - 1 >= 0 ? TILES._byNum[world.map[ty-1][tx]] : null;
      const nY = nNeighbour ? tileWorldY(nNeighbour) : -1;
      if (y > nY + 0.01) {
        addQuad(
          [wx+hs, nY, wz-hs], [wx-hs, nY, wz-hs],
          [wx-hs, y,  wz-hs], [wx+hs, y,  wz-hs],
          sideCol.clone().multiplyScalar(0.7), 0, 0, -1
        );
      }

      // East face (positive X)
      const eNeighbour = tx + 1 < MAP_W ? TILES._byNum[world.map[ty][tx+1]] : null;
      const eY = eNeighbour ? tileWorldY(eNeighbour) : -1;
      if (y > eY + 0.01) {
        addQuad(
          [wx+hs, eY, wz+hs], [wx+hs, eY, wz-hs],
          [wx+hs, y,  wz-hs], [wx+hs, y,  wz+hs],
          sideCol.clone().multiplyScalar(0.75), 1, 0, 0
        );
      }

      // West face (negative X)
      const wNeighbour = tx - 1 >= 0 ? TILES._byNum[world.map[ty][tx-1]] : null;
      const wY = wNeighbour ? tileWorldY(wNeighbour) : -1;
      if (y > wY + 0.01) {
        addQuad(
          [wx-hs, wY, wz-hs], [wx-hs, wY, wz+hs],
          [wx-hs, y,  wz+hs], [wx-hs, y,  wz-hs],
          sideCol.clone().multiplyScalar(0.6), -1, 0, 0
        );
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
  geo.setIndex(indices);

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow    = false;
  mesh.name = 'terrain';
  return mesh;
}

// ---- Animated water plane ----
function buildWater(scene) {
  const SEA_W = 140, SEA_D = 80, SEGS = 28;
  const geo = new THREE.PlaneGeometry(SEA_W, SEA_D, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshPhongMaterial({
    color:     0x1a4870,
    specular:  0x6699cc,
    shininess: 80,
    transparent: true,
    opacity: 0.82,
  });

  const mesh = new THREE.Mesh(geo, mat);
  // Centre over the water/sea area (north-west of map)
  mesh.position.set(30, -0.5, 25);
  mesh.receiveShadow = true;
  mesh.name = 'water';
  scene.add(mesh);

  // River Tyne (south)
  const riverGeo = new THREE.PlaneGeometry(MAP_W * TILE_SIZE, 14, 20, 4);
  riverGeo.rotateX(-Math.PI / 2);
  const riverMesh = new THREE.Mesh(riverGeo, mat.clone());
  riverMesh.position.set(MAP_W * TILE_SIZE / 2, -0.55, 57 * TILE_SIZE);
  riverMesh.name = 'river';
  scene.add(riverMesh);

  return { sea: mesh, river: riverMesh };
}

function updateWater(waterGroup, time) {
  for (const key of ['sea', 'river']) {
    const mesh = waterGroup[key];
    if (!mesh) continue;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.25 + time * 1.4) * 0.12 +
                  Math.cos(z * 0.3  + time * 0.9) * 0.08);
    }
    pos.needsUpdate = true;
  }
}

// ---- Environment objects: trees, walls, coal, etc. ----
function buildEnvironmentObjects(scene, world) {
  const envGroup = new THREE.Group();
  envGroup.name = 'environment';

  // Material cache
  const mats = {
    trunk:    new THREE.MeshLambertMaterial({ color: 0x5a3820 }),
    leaf1:    new THREE.MeshLambertMaterial({ color: 0x2a7020 }),
    leaf2:    new THREE.MeshLambertMaterial({ color: 0x3a8030 }),
    coal:     new THREE.MeshLambertMaterial({ color: 0x282820 }),
    coalVein: new THREE.MeshLambertMaterial({ color: 0x181818, emissive: new THREE.Color(0.04,0.04,0.04) }),
    shaft:    new THREE.MeshLambertMaterial({ color: 0x0a0a0a }),
    shaftRim: new THREE.MeshLambertMaterial({ color: 0x3a2808 }),
    beam:     new THREE.MeshLambertMaterial({ color: 0x5a3820 }),
    wall:     new THREE.MeshPhongMaterial({ color: 0x7a6848, specular: 0x201808, shininess: 10 }),
    wallDark: new THREE.MeshPhongMaterial({ color: 0x5a4828, specular: 0x100808, shininess: 5  }),
    ruins:    new THREE.MeshLambertMaterial({ color: 0x8a8070 }),
    pier:     new THREE.MeshLambertMaterial({ color: 0x7a6040 }),
    dock:     new THREE.MeshLambertMaterial({ color: 0x5a4030 }),
    beach_rock: new THREE.MeshLambertMaterial({ color: 0x808080 }),
    ghost_emissive: new THREE.MeshPhongMaterial({ color: 0xa090c0, emissive: new THREE.Color(0.1,0.1,0.3), transparent: true, opacity: 0.7 }),
  };

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const tileId = world.map[ty][tx];
      const tile   = TILES._byNum[tileId];
      if (!tile) continue;

      const wx = tx * TILE_SIZE;
      const wy = tileWorldY(tile);
      const wz = ty * TILE_SIZE;

      switch (tile.id) {
        case 'TREE': _placeTree(envGroup, wx, wy, wz, mats, tx, ty); break;
        case 'COAL': _placeCoalSeam(envGroup, wx, wy, wz, mats); break;
        case 'MINESHAFT': _placeMineshaft(envGroup, wx, wy, wz, mats); break;
        case 'WALL': _placeWall(envGroup, wx, wy, wz, mats); break;
        case 'RUINS': _placeRuins(envGroup, wx, wy, wz, mats, tx, ty); break;
        case 'PIER': _placePierPlank(envGroup, wx, wy, wz, mats, tx, ty); break;
        case 'DOCK': _placeDockPost(envGroup, wx, wy, wz, mats, tx, ty); break;
        case 'ROCK': _placeRock(envGroup, wx, wy, wz, mats, tx, ty); break;
        case 'BUSH': _placeBush(envGroup, wx, wy, wz, mats); break;
        case 'FLOWER': _placeFlower(envGroup, wx, wy, wz, tx, ty); break;
      }
    }
  }

  envGroup.traverse(m => {
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  });

  scene.add(envGroup);
  return envGroup;
}

function _placeTree(g, wx, wy, wz, m, tx, ty) {
  const h = 2.2 + (Math.sin(tx * 9 + ty * 5) * 0.5 + 0.5) * 1.2;
  const r = 0.22 + Math.random() * 0.08;
  // Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, h, 6), m.trunk);
  trunk.position.set(wx, wy + h / 2, wz);
  g.add(trunk);
  // Canopy layers (cones stacked)
  const canopyCol = Math.random() < 0.5 ? m.leaf1 : m.leaf2;
  for (let i = 0; i < 3; i++) {
    const cr = 1.3 - i * 0.3;
    const ch = 1.2;
    const cy = new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 7), canopyCol);
    cy.position.set(wx, wy + h * 0.55 + i * (ch * 0.7), wz);
    g.add(cy);
  }
}

function _placeCoalSeam(g, wx, wy, wz, m) {
  // Dark rocky mound
  const rock = new THREE.Mesh(new THREE.SphereGeometry(0.7, 7, 5), m.coal);
  rock.scale.y = 0.6;
  rock.position.set(wx, wy + 0.35, wz);
  g.add(rock);
  // Black coal streaks
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), m.coalVein);
    const angle = (i / 3) * Math.PI * 2;
    s.position.set(wx + Math.cos(angle) * 0.3, wy + 0.4, wz + Math.sin(angle) * 0.3);
    g.add(s);
  }
}

function _placeMineshaft(g, wx, wy, wz, m) {
  // Dark oval opening
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.3, 10), m.shaft);
  shaft.position.set(wx, wy + 0.01, wz);
  g.add(shaft);
  // Wooden support frame
  const beamH = 1.2;
  for (const side of [-0.5, 0.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, beamH, 0.12), m.beam);
    post.position.set(wx + side * 0.55, wy + beamH / 2, wz);
    g.add(post);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.12), m.beam);
  crossbar.position.set(wx, wy + beamH, wz);
  g.add(crossbar);
}

function _placeWall(g, wx, wy, wz, m) {
  const wallH = 2.4;
  const block = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, wallH, TILE_SIZE), m.wall);
  block.position.set(wx, wy + wallH / 2, wz);
  g.add(block);
  // Stone course lines (dark strips)
  for (let i = 0; i < 3; i++) {
    const mortar = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE + 0.02, 0.06, TILE_SIZE + 0.02), m.wallDark);
    mortar.position.set(wx, wy + 0.6 + i * 0.8, wz);
    g.add(mortar);
  }
}

function _placeRuins(g, wx, wy, wz, m, tx, ty) {
  const seed = tx * 17 + ty * 31;
  const n = 1 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const bh = 0.3 + ((seed + i * 13) % 10) * 0.12;
    const bw = 0.3 + ((seed + i * 7)  % 6)  * 0.1;
    const bd = 0.3 + ((seed + i * 11) % 6)  * 0.1;
    const b  = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m.ruins);
    const ox = ((seed + i * 5)  % 10 - 5) * 0.12;
    const oz = ((seed + i * 19) % 10 - 5) * 0.12;
    b.position.set(wx + ox, wy + bh / 2, wz + oz);
    b.rotation.y = (seed + i) * 0.4;
    g.add(b);
  }
}

function _placePierPlank(g, wx, wy, wz, m, tx, ty) {
  // Horizontal planks
  const plank = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, 0.12, 0.25), m.pier);
  plank.position.set(wx, wy + 0.06, wz);
  g.add(plank);
  // Pier posts every other tile
  if ((tx + ty) % 2 === 0) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6), m.pier);
    post.position.set(wx, wy - 0.5, wz);
    g.add(post);
  }
}

function _placeDockPost(g, wx, wy, wz, m, tx, ty) {
  if ((tx + ty) % 4 === 0) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.55, 8), m.dock);
    bollard.position.set(wx, wy + 0.27, wz);
    g.add(bollard);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), m.dock);
    cap.position.set(wx, wy + 0.6, wz);
    g.add(cap);
  }
}

function _placeRock(g, wx, wy, wz, m, tx, ty) {
  const seed = tx * 11 + ty * 23;
  const r = 0.35 + (seed % 5) * 0.08;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), m.beach_rock);
  rock.rotation.set(seed * 0.3, seed * 0.7, seed * 0.5);
  rock.position.set(wx + (seed % 6 - 3) * 0.1, wy + r * 0.6, wz + (seed % 8 - 4) * 0.1);
  g.add(rock);
}

function _placeBush(g, wx, wy, wz, m) {
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 5), m.leaf2);
  bush.scale.y = 0.7;
  bush.position.set(wx, wy + 0.35, wz);
  g.add(bush);
  const bush2 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 4), m.leaf1);
  bush2.position.set(wx + 0.3, wy + 0.42, wz + 0.1);
  g.add(bush2);
}

function _placeFlower(g, wx, wy, wz, tx, ty) {
  const seed = tx * 7 + ty * 13;
  const colours = [0xf0e040, 0xe040a0, 0x4060e0, 0xff8020, 0xe04040];
  const col = colours[seed % colours.length];
  const mat = new THREE.MeshLambertMaterial({ color: col });
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x306020 });
  const n = 1 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const ox = ((seed + i * 5) % 10 - 5) * 0.12;
    const oz = ((seed + i * 7) % 10 - 5) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), stemMat);
    stem.position.set(wx + ox, wy + 0.12, wz + oz);
    g.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat);
    head.position.set(wx + ox, wy + 0.28, wz + oz);
    g.add(head);
  }
}

// ---- Highlight cube for selected tile ----
function buildTileHighlight() {
  const geo = new THREE.BoxGeometry(TILE_SIZE, 0.08, TILE_SIZE);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xf0d060,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.name = 'tile_highlight';
  return mesh;
}

// ---- Target marker (walk-to indicator) ----
function buildTargetMarker() {
  const geo = new THREE.RingGeometry(0.3, 0.5, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x50ff80,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.name = 'target_marker';
  return mesh;
}
