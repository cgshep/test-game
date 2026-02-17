/* ===================================================
   RENDERER3D — Three.js scene, camera, lighting,
   raycasting, minimap, and main render pipeline.
   =================================================== */

class FollowCamera {
  constructor(camera, domElement) {
    this.camera     = camera;
    this.azimuth    = Math.PI * 0.3;  // start angle
    this.elevation  = 0.82;           // ~47 degrees up
    this.distance   = 28;
    this.target     = new THREE.Vector3();
    this.targetLerp = new THREE.Vector3();

    this._drag   = false;
    this._lastMX = 0;
    this._lastMY = 0;

    domElement.addEventListener('mousedown', e => {
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
        this._drag = true;
        this._lastMX = e.clientX;
        this._lastMY = e.clientY;
        e.preventDefault();
      }
    });
    domElement.addEventListener('mousemove', e => {
      if (!this._drag) return;
      const dx = e.clientX - this._lastMX;
      const dy = e.clientY - this._lastMY;
      this.azimuth   -= dx * 0.007;
      this.elevation  = Math.max(0.18, Math.min(1.45, this.elevation - dy * 0.007));
      this._lastMX = e.clientX;
      this._lastMY = e.clientY;
    });
    window.addEventListener('mouseup', () => { this._drag = false; });

    // Touch support
    let _touchLast = null;
    domElement.addEventListener('touchstart', e => {
      if (e.touches.length === 1) _touchLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    domElement.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && _touchLast) {
        const dx = e.touches[0].clientX - _touchLast.x;
        const dy = e.touches[0].clientY - _touchLast.y;
        this.azimuth   -= dx * 0.008;
        this.elevation  = Math.max(0.18, Math.min(1.45, this.elevation - dy * 0.008));
        _touchLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    domElement.addEventListener('wheel', e => {
      this.distance = Math.max(8, Math.min(70, this.distance + e.deltaY * 0.04));
      e.preventDefault();
    }, { passive: false });
  }

  lookAt(x, z) {
    this.target.set(x, 0, z);
  }

  update(dt) {
    this.targetLerp.lerp(this.target, 0.1);
    const el = this.elevation;
    const az = this.azimuth;
    const d  = this.distance;
    const cx = this.targetLerp.x + d * Math.cos(el) * Math.sin(az);
    const cy = this.targetLerp.y + d * Math.sin(el);
    const cz = this.targetLerp.z + d * Math.cos(el) * Math.cos(az);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.targetLerp);
  }
}

// ---- Main Renderer ----
class Renderer3D {
  constructor(container) {
    this.container = container;

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x102030);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x182838, 0.0055);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 500);
    this.followCam = new FollowCamera(this.camera, this.renderer.domElement);

    // Raycaster
    this.raycaster    = new THREE.Raycaster();
    this.groundPlane  = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    this._mouseNDC    = new THREE.Vector2();

    // References set after buildWorld
    this.terrainMesh  = null;
    this.waterGroup   = null;
    this.envGroup     = null;
    this.tileHighlight = null;
    this.targetMarker  = null;

    // Character models: Map<entityId, Character3D>
    this.playerModel  = null;
    this.npcModels    = new Map(); // npc.def.id+index -> Character3D

    // Floating text pool
    this._floatTexts  = [];

    // Clock for animations
    this.clock = new THREE.Clock();
    this.time  = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- Build the world scene ----
  buildWorld(world) {
    // Sky gradient (hemisphere light doubles as sky colour)
    const hemi = new THREE.HemisphereLight(0x8ab4e8, 0x4a3a28, 0.7);
    this.scene.add(hemi);

    // Sun directional light with shadows
    const sun = new THREE.DirectionalLight(0xfff8e0, 1.4);
    sun.position.set(80, 120, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 400;
    sun.shadow.camera.left   = -80;
    sun.shadow.camera.right  =  80;
    sun.shadow.camera.top    =  80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Fill light from the sea direction
    const fill = new THREE.DirectionalLight(0x90b8d0, 0.35);
    fill.position.set(-60, 40, -30);
    this.scene.add(fill);

    // Point lights: warm market lamp, colliery fire glow
    const lamp1 = new THREE.PointLight(0xf0c060, 1.8, 12);
    lamp1.position.set(27 * TILE_SIZE, 3, 33 * TILE_SIZE);
    this.scene.add(lamp1);

    const lamp2 = new THREE.PointLight(0xff6020, 1.4, 10);
    lamp2.position.set(44 * TILE_SIZE, 2.5, 47 * TILE_SIZE);
    this.scene.add(lamp2);

    // Atmospheric blue for arbeia area
    const arb = new THREE.PointLight(0x6080c0, 1.2, 18);
    arb.position.set(11 * TILE_SIZE, 3, 43 * TILE_SIZE);
    this.scene.add(arb);

    // Build terrain
    this.terrainMesh = buildTerrainMesh(world);
    this.scene.add(this.terrainMesh);

    // Water
    this.waterGroup = buildWater(this.scene);

    // Environment objects
    this.envGroup = buildEnvironmentObjects(this.scene, world);

    // Highlight / target markers
    this.tileHighlight = buildTileHighlight();
    this.scene.add(this.tileHighlight);
    this.targetMarker = buildTargetMarker();
    this.scene.add(this.targetMarker);

    // Skybox colour (gradient handled by fog + background)
    this.renderer.setClearColor(0x0a1828);
  }

  // ---- Create / sync player model ----
  createPlayerModel(player) {
    this.playerModel = new Character3D(this.scene, {
      name:      player.name,
      hostile:   false,
      type:      'human',
      showName:  true,
      skinColor: 0xFFCBAD,
      hairColor: 0x3a1808,
      bodyColor: 0x3a5080,
      legsColor: 0x282828,
      bootColor: 0x1a1008,
    });
    return this.playerModel;
  }

  // ---- Create NPC model ----
  createNPCModel(npc, key) {
    const def = npc.def;
    let type = 'human';
    if (def.id === 'roman_soldier')           type = 'ghost';
    else if (def.id === 'sea_goblin')          type = 'goblin';
    else if (def.id === 'seagull')             type = 'seagull';

    // Per-NPC appearance options
    const opts = { name: def.name, hostile: def.hostile, type, showName: true };

    if (type === 'human') {
      if (def.id === 'fisherman_bert') {
        opts.bodyColor = 0x4a6870; opts.hairColor = 0x6a5030; opts.legsColor = 0x303840;
      } else if (def.id === 'market_trader_gladys') {
        opts.bodyColor = 0x8a5040; opts.hairColor = 0x604828; opts.legsColor = 0x483020;
      } else if (def.id === 'pier_guard') {
        opts.bodyColor = 0x405838; opts.hairColor = 0x302010; opts.legsColor = 0x202818;
      } else if (def.id === 'old_miner_eddie') {
        opts.bodyColor = 0x483828; opts.hairColor = 0x808080; opts.legsColor = 0x302018;
        opts.scale = 0.9;
      } else if (def.id === 'museum_curator') {
        opts.bodyColor = 0x506070; opts.hairColor = 0xd0c8b0; opts.legsColor = 0x282838;
      }
    }

    const model = new Character3D(this.scene, opts);
    this.npcModels.set(key, model);
    return model;
  }

  getNPCKey(npc, index) {
    return `${npc.def.id}_${index}`;
  }

  // ---- Update all model positions each frame ----
  updateModels(player, npcs, world, dt) {
    this.time += dt;

    // -- Player --
    if (this.playerModel) {
      const wx = player.x * TILE_SIZE;
      const wz = player.y * TILE_SIZE;
      const wy = _worldYForTile(world, player.x, player.y);

      // Smooth position lerp
      const pm = this.playerModel;
      pm.group.position.x += (wx - pm.group.position.x) * 0.25;
      pm.group.position.z += (wz - pm.group.position.z) * 0.25;

      const isMoving = player.path.length > 0;
      pm.update(dt, isMoving);

      // Face direction of movement
      if (player.path.length > 0) {
        const next = player.path[0];
        pm.faceToward(next.x * TILE_SIZE, next.y * TILE_SIZE);
      }

      pm.setHp(player.hp, player.maxHp);

      // Camera follow
      this.followCam.lookAt(pm.group.position.x, pm.group.position.z);
    }

    // -- NPCs --
    // Remove models for dead NPCs
    for (const [key, model] of this.npcModels) {
      const alive = npcs.some((n, i) => this.getNPCKey(n, i) === key);
      if (!alive) { model.dispose(); this.npcModels.delete(key); }
    }
    // Add/update models
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const key = this.getNPCKey(npc, i);
      if (!this.npcModels.has(key)) {
        this.createNPCModel(npc, key);
      }
      const model = this.npcModels.get(key);
      const wx    = npc.x * TILE_SIZE;
      const wz    = npc.y * TILE_SIZE;
      const wy    = _worldYForTile(world, npc.x, npc.y);

      // Smooth NPC movement
      model.group.position.x += (wx - model.group.position.x) * 0.15;
      model.group.position.z += (wz - model.group.position.z) * 0.15;

      model.update(dt, npc.inCombat);
      model.setHp(npc.hp, npc.def.maxHp);
    }

    // Water animation
    if (this.waterGroup) updateWater(this.waterGroup, this.time);
  }

  // ---- Tile highlight ----
  setTileHighlight(tx, ty, world) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) {
      this.tileHighlight.visible = false;
      return;
    }
    const wy = _worldYForTile(world, tx, ty);
    this.tileHighlight.position.set(tx * TILE_SIZE, wy + 0.06, ty * TILE_SIZE);
    this.tileHighlight.visible = true;
  }

  setTargetMarker(tx, ty, world) {
    if (tx === null) { this.targetMarker.visible = false; return; }
    const wy = _worldYForTile(world, tx, ty);
    this.targetMarker.position.set(tx * TILE_SIZE, wy + 0.1, ty * TILE_SIZE);
    this.targetMarker.visible = true;
  }

  // ---- Raycasting: screen → tile ----
  screenToTile(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouseNDC.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouseNDC.y = -((clientY - rect.top)  / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this._mouseNDC, this.camera);

    // Intersect ground plane at y=0
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    if (!hit) return null;

    const tx = Math.round(intersection.x / TILE_SIZE);
    const ty = Math.round(intersection.z / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return null;
    return { x: tx, y: ty };
  }

  // ---- World → screen (for damage numbers) ----
  worldToScreen(wx, wy, wz) {
    const vec = new THREE.Vector3(wx, wy, wz);
    vec.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: (vec.x *  0.5 + 0.5) * rect.width  + rect.left,
      y: (vec.y * -0.5 + 0.5) * rect.height + rect.top,
    };
  }

  // ---- Check if NPC was clicked ----
  pickNPC(clientX, clientY, npcs) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouseNDC.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouseNDC.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this._mouseNDC, this.camera);

    // Build bounding spheres for each NPC
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const key = this.getNPCKey(npc, i);
      const model = this.npcModels.get(key);
      if (!model) continue;

      const sphere = new THREE.Sphere(
        new THREE.Vector3(model.group.position.x, model.group.position.y + 1, model.group.position.z),
        1.0
      );
      if (this.raycaster.ray.intersectsSphere(sphere)) return npc;
    }
    return null;
  }

  // ---- Floating damage text ----
  showDamage(wx, wy, wz, amount, isPlayer) {
    // Create a small sprite with the damage number
    const canvas = document.createElement('canvas');
    canvas.width = 48; canvas.height = 28;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 18px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillStyle = isPlayer ? '#ff6060' : '#ffff40';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(String(amount), 24, 22);
    ctx.fillText(String(amount), 24, 22);

    const tex  = new THREE.CanvasTexture(canvas);
    const mat  = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.0, 0.6, 1);
    sprite.position.set(wx, wy + 2.5, wz);
    this.scene.add(sprite);

    this._floatTexts.push({ sprite, vy: 1.8, life: 1.0 });
  }

  _updateFloatTexts(dt) {
    this._floatTexts = this._floatTexts.filter(ft => {
      ft.sprite.position.y += ft.vy * dt;
      ft.vy *= 0.92;
      ft.life -= dt;
      ft.sprite.material.opacity = Math.max(0, ft.life);
      ft.sprite.material.needsUpdate = true;
      if (ft.life <= 0) {
        this.scene.remove(ft.sprite);
        ft.sprite.material.map.dispose();
        ft.sprite.material.dispose();
        return false;
      }
      return true;
    });
  }

  // ---- Minimap (2D canvas) ----
  drawMinimap(miniCanvas, world, player, npcs) {
    const ctx = miniCanvas.getContext('2d');
    const cw = miniCanvas.width, ch = miniCanvas.height;
    const tw = cw / MAP_W, th = ch / MAP_H;

    ctx.clearRect(0, 0, cw, ch);

    const miniCol = {
      [T.WATER]:    '#1a3a50', [T.SHALLOW]:  '#2a5060', [T.SAND]:    '#b0904a',
      [T.GRASS]:    '#304e20', [T.ROAD]:     '#404040', [T.COBBLE]:  '#504838',
      [T.PAVEMENT]: '#707060', [T.MARKET]:   '#786858', [T.WALL]:    '#6a5838',
      [T.FLOOR]:    '#7a6848', [T.RUINS]:    '#7a7860', [T.COAL]:    '#282820',
      [T.CLIFF]:    '#504028', [T.DOCK]:     '#4a3820', [T.PIER]:    '#5a4830',
      [T.TREE]:     '#205018', [T.FLOWER]:   '#305020', [T.MUD]:     '#5a4018',
      [T.ROCK]:     '#484848', [T.MINESHAFT]:'#181818', [T.DOOR]:    '#7a4018',
      [T.BUSH]:     '#2a4818',
    };
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tid = world.map[y][x];
        ctx.fillStyle = miniCol[tid] || '#303028';
        ctx.fillRect(x * tw, y * th, tw + 0.5, th + 0.5);
      }
    }
    for (const npc of npcs) {
      ctx.fillStyle = npc.def.hostile ? '#cc3030' : '#30cc30';
      ctx.fillRect(npc.x * tw - 1, npc.y * th - 1, 3, 3);
    }
    ctx.fillStyle = '#f0f060';
    ctx.beginPath();
    ctx.arc(player.x * tw, player.y * th, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Main render ----
  render(dt) {
    this.followCam.update(dt);
    this._updateFloatTexts(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

// ---- Helpers ----
function _worldYForTile(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
  const tile = TILES._byNum[world.map[ty][tx]];
  return tile ? tileWorldY(tile) : 0;
}
