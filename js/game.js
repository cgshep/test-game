/* ===================================================
   GAME — Main loop, input, combat, skills (3D version)
   Uses Renderer3D + Three.js instead of 2D canvas.
   Game logic (player, npcs, world) unchanged.
   =================================================== */

class Game {
  constructor() {
    this.container  = document.getElementById('canvas-wrap');
    this.minimap    = document.getElementById('minimap-canvas');
    this.renderer3d = new Renderer3D(this.container);
    this.world      = new World();
    this.player     = new Player('Geordie');
    this.npcMgr     = new NPCManager();
    this.ui         = new UI(this);

    this.running   = false;

    // Timers
    this.hpRegenTimer  = 0;
    this.combatTimer   = 0;
    this.minimapTimer  = 0;
    this.uiUpdateTimer = 0;

    // Input
    this.keys        = {};
    this.keyMoveTimer = 0;

    this._setup();
  }

  _setup() {
    // Build 3D world
    this.renderer3d.buildWorld(this.world);

    // Spawn NPCs (logic)
    this.npcMgr.spawnAll();

    // Create player 3D model
    this.renderer3d.createPlayerModel(this.player);

    // Pre-create NPC models
    for (let i = 0; i < this.npcMgr.npcs.length; i++) {
      const npc = this.npcMgr.npcs[i];
      const key = this.renderer3d.getNPCKey(npc, i);
      this.renderer3d.createNPCModel(npc, key);
      // Initial position
      const m = this.renderer3d.npcModels.get(key);
      if (m) m.group.position.set(npc.x * TILE_SIZE, 0, npc.y * TILE_SIZE);
    }

    // Centre camera on player start
    this.renderer3d.followCam.lookAt(
      this.player.x * TILE_SIZE,
      this.player.y * TILE_SIZE
    );

    // Keyboard
    window.addEventListener('keydown', e => this._onKey(e));
    window.addEventListener('keyup',   e => { delete this.keys[e.code]; });

    // Mouse on Three.js canvas
    const canvas = this.renderer3d.renderer.domElement;
    canvas.addEventListener('click',       e => this._onClick(e));
    canvas.addEventListener('contextmenu', e => this._onRightClick(e));
    canvas.addEventListener('mousemove',   e => this._onMouseMove(e));

    // Close context menu on click outside
    document.addEventListener('click', e => {
      if (!this.ui.ctxMenu.contains(e.target)) this.ui.hideContextMenu();
    });

    // Initial UI
    this.ui.updateStats(this.player);
    this.ui.updateInventory(this.player);
    this.ui.updateLocation(this.player, this.world);

    // Starter items
    this.player.addItem('STOTTIE', 3);
    this.player.addItem('ALE', 2);
    this.player.coins = 50;

    // Welcome
    this.ui.log('Welcome to Shields of the Tyne — now in 3D!', 'system');
    this.ui.log("You find yerself on the golden sands of South Shields beach.", 'game');
    this.ui.log("The North Sea wind bites at your face. Adventure awaits!", 'game');
    this.ui.log("Tip: Right-drag mouse or hold Alt+drag to orbit the camera.", 'info');
    this.ui.log("Tip: Click on NPCs to talk. Left-click tiles to walk.", 'info');
    this.ui.log("Tip: Visit the Market (north-west) for supplies.", 'info');
  }

  start() {
    this.running = true;
    this.renderer3d.clock.start();
    this._loop();
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());

    const dt = Math.min(this.renderer3d.clock.getDelta(), 0.1);
    this._update(dt);
    this._draw(dt);
  }

  _update(dt) {
    if (this.player.dead) return;

    this._handleKeyMovement(dt);
    this.player.update(dt, this.world);
    this.npcMgr.update(dt, this.world, this.player);

    if (this.player.inCombat && this.player.combatTarget) {
      this._updateCombat(dt);
    }

    if (this.player.action) {
      this._updateAction(dt);
    }

    // HP regen
    if (!this.player.inCombat) {
      this.hpRegenTimer += dt;
      if (this.hpRegenTimer >= 30) {
        this.hpRegenTimer = 0;
        if (this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        }
      }
    }

    this.world.tickResources();

    // Update target ring visibility
    if (this.player.pathTarget) {
      this.renderer3d.setTargetMarker(this.player.pathTarget.x, this.player.pathTarget.y, this.world);
    } else {
      this.renderer3d.setTargetMarker(null, null, null);
    }

    // Hostile aggro
    this._checkAggro();

    // Periodic UI
    this.uiUpdateTimer += dt;
    if (this.uiUpdateTimer >= 0.5) {
      this.uiUpdateTimer = 0;
      this.ui.updateStats(this.player);
      this.ui.updateLocation(this.player, this.world);
    }

    // Minimap
    this.minimapTimer += dt;
    if (this.minimapTimer >= 1.0) {
      this.minimapTimer = 0;
      this.renderer3d.drawMinimap(this.minimap, this.world, this.player, this.npcMgr.npcs);
    }
  }

  _draw(dt) {
    this.renderer3d.updateModels(this.player, this.npcMgr.npcs, this.world, dt);
    this.renderer3d.render(dt);
  }

  // ---- Input ----
  _onKey(e) {
    this.keys[e.code] = true;
    if (e.code === 'KeyE') this._examinePlayerTile();
    if (e.code === 'KeyI') this._toggleInventoryPanel();
    if (e.code === 'Escape') {
      this.ui.hideContextMenu();
      this.ui.closeDialogue();
    }
  }

  _handleKeyMovement(dt) {
    if (this.player.inCombat) return;
    this.keyMoveTimer += dt;
    if (this.keyMoveTimer < 0.16) return;

    let dx = 0, dy = 0;
    if (this.keys['ArrowUp']    || this.keys['KeyW']) { dx -= 1; dy -= 1; }
    if (this.keys['ArrowDown']  || this.keys['KeyS']) { dx += 1; dy += 1; }
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) { dx -= 1; dy += 1; }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) { dx += 1; dy -= 1; }

    if (dx !== 0 || dy !== 0) {
      this.keyMoveTimer = 0;
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      if (this.world.isWalkable(nx, ny)) {
        this.player.x = nx;
        this.player.y = ny;
        this.player.action = null;
        this.player.path   = [];
        // Face movement direction in 3D
        const model = this.renderer3d.playerModel;
        if (model) model.faceToward((nx + dx * 0.1) * TILE_SIZE, (ny + dy * 0.1) * TILE_SIZE);
      }
    }
  }

  _onClick(e) {
    // Don't fire if context menu was showing
    if (!this.ui.ctxMenu.classList.contains('hidden')) return;
    // Don't fire on camera drag end (check small delta)
    if (this.renderer3d.followCam._drag) return;

    const tile = this.renderer3d.screenToTile(e.clientX, e.clientY);
    if (!tile) return;

    // Pick NPC first (3D sphere pick)
    const pickedNPC = this.renderer3d.pickNPC(e.clientX, e.clientY, this.npcMgr.npcs);
    if (pickedNPC) {
      this._interactNPC(pickedNPC, e.clientX, e.clientY);
      return;
    }

    // Loot
    const loot = this.world.getLootAt(tile.x, tile.y);
    if (loot) {
      this.player.walkTo(this.world, tile.x, tile.y);
      const tx = tile.x, ty = tile.y;
      this.player.path.push({ x: tx, y: ty, callback: () => this._pickupLoot(tx, ty) });
      return;
    }

    // Interactive tiles
    const tileObj = this.world.getTile(tile.x, tile.y);
    if (tileObj) {
      if (tileObj.id === 'COAL')  { this._startMining(tile.x, tile.y); return; }
      if (tileObj.id === 'TREE')  { this._startWoodcutting(tile.x, tile.y); return; }
      if (tileObj.id === 'WATER' || tileObj.id === 'SHALLOW') {
        this._startFishing(tile.x, tile.y); return;
      }
    }

    // Walk to
    if (this.world.isWalkable(tile.x, tile.y)) {
      this.player.walkTo(this.world, tile.x, tile.y);
      this.player.action = null;
    } else {
      const adj = this._findAdjacentWalkable(tile.x, tile.y);
      if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    }
  }

  _onRightClick(e) {
    e.preventDefault();
    const tile = this.renderer3d.screenToTile(e.clientX, e.clientY);
    if (!tile) return;

    const tileObj = this.world.getTile(tile.x, tile.y);
    const pickedNPC = this.renderer3d.pickNPC(e.clientX, e.clientY, this.npcMgr.npcs);
    const npcsAt  = this.npcMgr.getAt(tile.x, tile.y);
    const npc     = pickedNPC || (npcsAt.length > 0 ? npcsAt[0] : null);
    const actions = [];

    if (npc) {
      actions.push({ label: `Talk to ${npc.def.name}`, fn: () => this._talkTo(npc) });
      if (npc.def.hostile) {
        actions.push({ label: `Attack ${npc.def.name}`, fn: () => this.startCombat(npc) });
      }
    }

    if (tileObj) {
      actions.push({ label: `Examine: ${tileObj.name}`, fn: () => this.ui.log(tileObj.desc, 'info') });
      if (tileObj.id === 'COAL') actions.push({ label: 'Mine Coal', fn: () => this._startMining(tile.x, tile.y) });
      if (tileObj.id === 'TREE') actions.push({ label: 'Chop Tree', fn: () => this._startWoodcutting(tile.x, tile.y) });
      if (tileObj.id === 'WATER' || tileObj.id === 'SHALLOW') actions.push({ label: 'Fish here', fn: () => this._startFishing(tile.x, tile.y) });
    }

    const loot = this.world.getLootAt(tile.x, tile.y);
    if (loot) actions.push({ label: 'Pick up items', fn: () => this._pickupLoot(tile.x, tile.y) });

    if (this.world.isWalkable(tile.x, tile.y)) {
      actions.push({ label: `Walk here`, fn: () => { this.player.walkTo(this.world, tile.x, tile.y); } });
    }

    const canvasRect = this.container.getBoundingClientRect();
    const mx = e.clientX - canvasRect.left;
    const my = e.clientY - canvasRect.top;
    if (actions.length > 0) this.ui.showContextMenu(mx, my, actions);
  }

  _onMouseMove(e) {
    const tile = this.renderer3d.screenToTile(e.clientX, e.clientY);
    if (tile) {
      this.renderer3d.setTileHighlight(tile.x, tile.y, this.world);
    }
  }

  // ---- NPC interaction ----
  _interactNPC(npc, clientX, clientY) {
    if (!npc.def.hostile) {
      this._talkTo(npc);
    } else {
      const canvasRect = this.container.getBoundingClientRect();
      this.ui.showContextMenu(clientX - canvasRect.left, clientY - canvasRect.top, [
        { label: `Attack ${npc.def.name}`, fn: () => this.startCombat(npc) },
        { label: `Talk to ${npc.def.name}`, fn: () => this._talkTo(npc) },
      ]);
    }
  }

  _talkTo(npc) {
    if (npc.distanceTo(this.player.x, this.player.y) > 2) {
      const adj = this._findAdjacentWalkable(npc.x, npc.y);
      if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    }
    this.ui.showDialogue(npc, this);
  }

  openShop(npc) {
    this.ui.game = this;
    this.ui.showShop(npc, this.player);
  }

  // ---- Combat ----
  startCombat(npc) {
    if (!npc.alive) return;
    this.player.inCombat     = true;
    this.player.combatTarget = npc;
    npc.inCombat             = true;
    npc.combatTarget         = this.player;
    this.combatTimer         = 0;
    this.ui.log(`You attack the ${npc.def.name}!`, 'combat');
  }

  _updateCombat(dt) {
    this.combatTimer += dt;
    const npc = this.player.combatTarget;
    if (!npc || !npc.alive) { this._endCombat(); return; }

    // Move adjacent
    if (npc.distanceTo(this.player.x, this.player.y) > 1.5) {
      const adj = this._findAdjacentWalkable(npc.x, npc.y);
      if (adj) { this.player.x = adj.x; this.player.y = adj.y; }
    }

    const attackSpeed = 2.4;
    if (this.combatTimer >= attackSpeed) {
      this.combatTimer = 0;
      this._combatRound(npc);
    }
  }

  _combatRound(npc) {
    const pAtk = this.player.getAttack();
    const pDmg = Math.max(0, Math.floor(Math.random() * pAtk * 1.5 + 1) - npc.def.defence);
    npc.hp -= pDmg;

    // 3D damage number
    this.renderer3d.showDamage(npc.x * TILE_SIZE, 1.5, npc.y * TILE_SIZE, pDmg, false);
    this.ui.log(`You hit ${npc.def.name} for ${pDmg} damage.`, 'combat');

    // Attack animation on player model
    const pm = this.renderer3d.playerModel;
    if (pm) pm.triggerAttack();

    let lvlUp = this.player.gainXp('attack', 4 * pDmg + 1);
    if (lvlUp) this.ui.showLevelUp('Attack', this.player.skills.attack.level);
    lvlUp = this.player.gainXp('strength', 4 * pDmg + 1);
    if (lvlUp) this.ui.showLevelUp('Strength', this.player.skills.strength.level);

    if (npc.hp <= 0) { this._killNPC(npc); return; }

    // NPC retaliates
    const nAtk = npc.def.attack;
    const nDmg = Math.max(0, Math.floor(Math.random() * nAtk * 1.5 + 1) - this.player.getDefence());
    this.player.hp -= nDmg;
    this.renderer3d.showDamage(this.player.x * TILE_SIZE, 1.5, this.player.y * TILE_SIZE, nDmg, true);
    this.ui.log(`${npc.def.name} hits you for ${nDmg} damage!`, 'combat');

    lvlUp = this.player.gainXp('defence', 4 * nDmg + 1);
    if (lvlUp) this.ui.showLevelUp('Defence', this.player.skills.defence.level);

    if (this.player.hp <= 0) this._playerDeath();
  }

  _killNPC(npc) {
    this.ui.log(`You defeat the ${npc.def.name}!`, 'combat');
    if (npc.def.xpReward > 0) {
      this.player.gainXp('hp', npc.def.xpReward);
      this.ui.log(`You gain ${npc.def.xpReward} HP XP.`, 'skill');
    }
    const drops = npc.rollLoot();
    if (drops.length > 0) {
      for (let i = 0; i < drops.length; i++) {
        this.world.dropItem(npc.x + (i > 0 ? 1 : 0), npc.y, drops[i].item, drops[i].qty);
      }
      this.ui.log(`Loot: ${drops.map(d => `${ITEMS[d.item]?.name} x${d.qty}`).join(', ')}`, 'loot');
    }
    this.npcMgr.kill(npc);
    this._endCombat();
  }

  _playerDeath() {
    this.player.hp   = 0;
    this.player.dead = true;
    this._endCombat();
    this.ui.log('You have been defeated! You wake up on the beach...', 'combat');
    setTimeout(() => {
      this.player.revive();
      this.ui.log('You feel groggy, but alive.', 'system');
      this.ui.updateStats(this.player);
    }, 3000);
  }

  _endCombat() {
    const npc = this.player.combatTarget;
    if (npc) { npc.inCombat = false; npc.combatTarget = null; }
    this.player.inCombat     = false;
    this.player.combatTarget = null;
    this.combatTimer         = 0;
    this.hpRegenTimer        = 0;
  }

  _checkAggro() {
    if (this.player.inCombat) return;
    for (const npc of this.npcMgr.npcs) {
      if (!npc.def.hostile || !npc.alive) continue;
      if (npc.distanceTo(this.player.x, this.player.y) <= 2) {
        this.startCombat(npc);
        this.ui.log(`The ${npc.def.name} attacks you!`, 'combat');
        return;
      }
    }
  }

  // ---- Skill actions ----
  _startMining(tx, ty) {
    if (!this.player.hasTool('PICKAXE') && this.player.equipment.tool !== 'PICKAXE') {
      this.ui.log("You need a pickaxe to mine! Buy one at the Market.", 'system'); return;
    }
    if (this.player.inventoryFull()) { this.ui.log("Inventory full!", 'system'); return; }
    const adj = this._findAdjacentWalkable(tx, ty);
    if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    this.player.action = { type: 'mine', tx, ty, timer: 0 };
    this.ui.log("You begin mining...", 'skill');
  }

  _startWoodcutting(tx, ty) {
    if (!this.player.hasTool('AXE') && this.player.equipment.tool !== 'AXE') {
      this.ui.log("You need an axe! Buy one at the Market.", 'system'); return;
    }
    if (this.player.inventoryFull()) { this.ui.log("Inventory full!", 'system'); return; }
    const adj = this._findAdjacentWalkable(tx, ty);
    if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    this.player.action = { type: 'chop', tx, ty, timer: 0 };
    this.ui.log("You begin chopping...", 'skill');
  }

  _startFishing(tx, ty) {
    if (!this.player.hasItem('FISHING_ROD') && this.player.equipment.tool !== 'FISHING_ROD') {
      this.ui.log("You need a fishing rod! Buy one at the Market.", 'system'); return;
    }
    if (this.player.inventoryFull()) { this.ui.log("Inventory full!", 'system'); return; }
    const adj = this._findAdjacentWalkable(tx, ty);
    if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    this.player.action = { type: 'fish', tx, ty, timer: 0 };
    this.ui.log("You cast your line...", 'skill');
  }

  _updateAction(dt) {
    if (this.player.path.length > 0) return;
    const action = this.player.action;
    if (!action) return;
    action.timer += dt;

    if (action.type === 'mine') {
      const tile = this.world.getTile(action.tx, action.ty);
      if (!tile || tile.id !== 'COAL') { this.ui.log("The coal seam is depleted.", 'info'); this.player.action = null; return; }
      if (this.player.inventoryFull()) { this.ui.log("Inventory full!", 'system'); this.player.action = null; return; }
      const delay = Math.max(1.5, 5 - this.player.skills.mining.level * 0.04);
      if (action.timer >= delay) {
        action.timer = 0;
        if (Math.random() < 0.4 + this.player.skills.mining.level * 0.004) {
          this.player.addItem('COAL', 1);
          const xp = 50 + this.player.skills.mining.level * 2;
          const lvlUp = this.player.gainXp('mining', xp);
          this.ui.log(`You mine some coal. (+${xp} Mining XP)`, 'loot');
          if (lvlUp) this.ui.showLevelUp('Mining', this.player.skills.mining.level);
          this.ui.updateInventory(this.player);
          if (Math.random() < 0.3) {
            this.world.depleteResource(action.tx, action.ty);
            this.ui.log("The coal seam is temporarily exhausted.", 'info');
            this.player.action = null;
          }
        } else {
          this.ui.log("You swing your pickaxe but find nothing yet...", 'info');
        }
      }
    } else if (action.type === 'chop') {
      const tile = this.world.getTile(action.tx, action.ty);
      if (!tile || tile.id !== 'TREE') { this.ui.log("The tree is gone.", 'info'); this.player.action = null; return; }
      if (this.player.inventoryFull()) { this.ui.log("Inventory full!", 'system'); this.player.action = null; return; }
      const delay = Math.max(1.5, 6 - this.player.skills.woodcut.level * 0.05);
      if (action.timer >= delay) {
        action.timer = 0;
        if (Math.random() < 0.5) {
          this.player.addItem('LOGS', 1);
          const xp = 25 + this.player.skills.woodcut.level;
          const lvlUp = this.player.gainXp('woodcut', xp);
          this.ui.log(`You chop some logs. (+${xp} Woodcutting XP)`, 'loot');
          if (lvlUp) this.ui.showLevelUp('Woodcutting', this.player.skills.woodcut.level);
          this.ui.updateInventory(this.player);
          if (Math.random() < 0.25) {
            this.world.depleteResource(action.tx, action.ty);
            this.ui.log("The tree falls down.", 'info');
            this.player.action = null;
          }
        }
      }
    } else if (action.type === 'fish') {
      if (this.player.inventoryFull()) { this.ui.log("Inventory full!", 'system'); this.player.action = null; return; }
      const delay = Math.max(2, 8 - this.player.skills.fishing.level * 0.06);
      if (action.timer >= delay) {
        action.timer = 0;
        const roll = Math.random();
        if (roll < 0.5) {
          const isCrab = Math.random() < 0.3;
          const fish   = isCrab ? 'RAW_CRAB' : 'RAW_COD';
          this.player.addItem(fish, 1);
          const xp    = isCrab ? 80 : 40;
          const lvlUp = this.player.gainXp('fishing', xp);
          this.ui.log(`You catch a ${ITEMS[fish].name}! (+${xp} Fishing XP)`, 'loot');
          if (lvlUp) this.ui.showLevelUp('Fishing', this.player.skills.fishing.level);
          this.ui.updateInventory(this.player);
        } else if (roll < 0.55) {
          this.player.addItem('SEAWEED', 1);
          this.ui.log("You pull up some seaweed.", 'info');
          this.ui.updateInventory(this.player);
        } else {
          this.ui.log("The fish aren't biting today...", 'info');
        }
      }
    }
  }

  _pickupLoot(x, y) {
    const items = this.world.pickupLoot(x, y);
    if (!items) return;
    for (const { item, qty } of items) {
      if (!this.player.addItem(item, qty)) {
        this.world.dropItem(x, y, item, qty);
        this.ui.log("Inventory full! Can't pick everything up.", 'system');
      } else {
        this.ui.log(`You pick up ${ITEMS[item]?.name} x${qty}.`, 'loot');
      }
    }
    this.ui.updateInventory(this.player);
  }

  _examinePlayerTile() {
    const tile = this.world.getTile(this.player.x, this.player.y);
    if (tile) this.ui.log(`Standing on: ${tile.name}. ${tile.desc}`, 'info');
    this.ui.log(`Location: ${this.world.getZone(this.player.x, this.player.y)}`, 'info');
  }

  _toggleInventoryPanel() {
    const inv = document.getElementById('right-panel');
    inv.style.display = inv.style.display === 'none' ? 'flex' : 'none';
  }

  _findAdjacentWalkable(tx, ty) {
    const dirs = [{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},
                  {x:-1,y:-1},{x:1,y:1},{x:-1,y:1},{x:1,y:-1}];
    for (const d of dirs) {
      const nx = tx + d.x, ny = ty + d.y;
      if (this.world.isWalkable(nx, ny)) return { x:nx, y:ny };
    }
    return null;
  }
}

// ---- Boot sequence ----
window.addEventListener('load', () => {
  const fill   = document.getElementById('loading-fill');
  const text   = document.getElementById('loading-text');
  const screen = document.getElementById('loading-screen');
  const cont   = document.getElementById('game-container');

  const steps = [
    [10, 'Initialising Three.js WebGL renderer...'],
    [25, 'Building 3D terrain geometry...'],
    [45, 'Placing South Shields landmarks...'],
    [60, 'Creating environment objects...'],
    [72, 'Sculpting 3D character models...'],
    [85, 'Spawning NPCs...'],
    [95, 'Setting the North Sea breeze...'],
    [100,'Ready!'],
  ];

  let i = 0;
  const game = new Game();

  const tick = () => {
    if (i >= steps.length) {
      setTimeout(() => {
        screen.style.display = 'none';
        cont.style.display   = 'flex';
        game.start();
        // Initial minimap
        game.renderer3d.drawMinimap(
          game.minimap, game.world, game.player, game.npcMgr.npcs
        );
      }, 300);
      return;
    }
    const [pct, msg] = steps[i++];
    fill.style.width = pct + '%';
    text.textContent = msg;
    setTimeout(tick, 250 + Math.random() * 200);
  };

  tick();
});
