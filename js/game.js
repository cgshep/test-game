/* ===================================================
   GAME - main loop, input, combat, skills
   =================================================== */

class Game {
  constructor() {
    this.canvas    = document.getElementById('game-canvas');
    this.minimap   = document.getElementById('minimap-canvas');
    this.renderer  = new IsoRenderer(this.canvas);
    this.world     = new World();
    this.player    = new Player('Geordie');
    this.npcMgr    = new NPCManager();
    this.ui        = new UI(this);

    this.lastTime  = 0;
    this.running   = false;

    // Timers
    this.hpRegenTimer  = 0;
    this.actionTimer   = 0;
    this.combatTimer   = 0;
    this.minimapTimer  = 0;
    this.uiUpdateTimer = 0;

    // Input
    this.keys = {};
    this.keyMoveTimer = 0;

    this._setup();
  }

  _setup() {
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    this.npcMgr.spawnAll();

    // Keyboard
    window.addEventListener('keydown', e => this._onKey(e));
    window.addEventListener('keyup',   e => { delete this.keys[e.code]; });

    // Mouse
    this.canvas.addEventListener('click',       e => this._onClick(e));
    this.canvas.addEventListener('contextmenu', e => this._onRightClick(e));
    this.canvas.addEventListener('mousemove',   e => this._onMouseMove(e));
    document.addEventListener('click', e => {
      if (!this.ui.ctxMenu.contains(e.target)) this.ui.hideContextMenu();
    });

    // Centre camera on player
    this.renderer.centreOn(this.player.x, this.player.y);

    // Initial UI
    this.ui.updateStats(this.player);
    this.ui.updateInventory(this.player);
    this.ui.updateLocation(this.player, this.world);

    // Give starter items
    this.player.addItem('STOTTIE', 3);
    this.player.addItem('ALE', 2);
    this.player.coins = 50;

    // Welcome messages
    this.ui.log("Welcome to Shields of the Tyne!", 'system');
    this.ui.log("You find yerself on the golden sands of South Shields beach.", 'game');
    this.ui.log("The North Sea wind bites at your face. Adventure awaits!", 'game');
    this.ui.log("Tip: Click on NPCs to talk. Click tiles to walk.", 'info');
    this.ui.log("Tip: Visit the Market (north-west) for supplies.", 'info');
  }

  _resizeCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    this.canvas.width  = wrap.clientWidth;
    this.canvas.height = wrap.clientHeight;
  }

  start() {
    this.running  = true;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this._update(dt);
    this._draw();

    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this.player.dead) return;

    // Keyboard movement
    this._handleKeyMovement(dt);

    // Player walk
    this.player.update(dt, this.world);

    // NPCs
    this.npcMgr.update(dt, this.world, this.player);

    // Combat
    if (this.player.inCombat && this.player.combatTarget) {
      this._updateCombat(dt);
    }

    // Skill action (mining, fishing, woodcutting)
    if (this.player.action) {
      this._updateAction(dt);
    }

    // HP regeneration (1 HP every 30s out of combat)
    if (!this.player.inCombat) {
      this.hpRegenTimer += dt;
      if (this.hpRegenTimer >= 30) {
        this.hpRegenTimer = 0;
        if (this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        }
      }
    }

    // Resource respawn
    this.world.tickResources();

    // Camera follows player
    this.renderer.centreOn(this.player.x, this.player.y);

    // Periodic UI updates
    this.uiUpdateTimer += dt;
    if (this.uiUpdateTimer >= 0.5) {
      this.uiUpdateTimer = 0;
      this.ui.updateStats(this.player);
      this.ui.updateLocation(this.player, this.world);
    }

    // Minimap update
    this.minimapTimer += dt;
    if (this.minimapTimer >= 1) {
      this.minimapTimer = 0;
      this.renderer.drawMinimap(this.minimap, this.world, this.player, this.npcMgr.npcs);
    }

    // Hostile NPC aggro
    this._checkAggro();
  }

  _draw() {
    this.renderer.render(this.world, this.player, this.npcMgr.npcs);
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
    if (this.keys['ArrowUp']    || this.keys['KeyW']) { dx = -1; dy = -1; }
    if (this.keys['ArrowDown']  || this.keys['KeyS']) { dx =  1; dy =  1; }
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) { dx = -1; dy =  1; }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) { dx =  1; dy = -1; }

    if (dx !== 0 || dy !== 0) {
      this.keyMoveTimer = 0;
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      if (this.world.isWalkable(nx, ny)) {
        this.player.x = nx;
        this.player.y = ny;
        this.player.action = null;
      }
    }
  }

  _onClick(e) {
    if (this.ui.ctxMenu && !this.ui.ctxMenu.classList.contains('hidden')) {
      return; // click handled by context menu
    }
    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const tile = this.renderer.screenToTile(mx, my);

    if (tile.x < 0 || tile.y < 0 || tile.x >= MAP_W || tile.y >= MAP_H) return;

    // Check NPC at tile
    const npcs = this.npcMgr.getAt(tile.x, tile.y);
    if (npcs.length > 0) {
      this._interactNPC(npcs[0], e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

    // Check loot pile
    const loot = this.world.getLootAt(tile.x, tile.y);
    if (loot) {
      this.player.walkTo(this.world, tile.x, tile.y);
      this.player.path.push({ x: tile.x, y: tile.y, callback: () => this._pickupLoot(tile.x, tile.y) });
      return;
    }

    // Check interactive tile (coal, tree, water for fishing)
    const tileObj = this.world.getTile(tile.x, tile.y);
    if (tileObj) {
      if (tileObj.id === 'COAL') {
        this._startMining(tile.x, tile.y);
        return;
      }
      if (tileObj.id === 'TREE') {
        this._startWoodcutting(tile.x, tile.y);
        return;
      }
      if ((tileObj.id === 'WATER' || tileObj.id === 'SHALLOW') &&
          this._isAdjacentToPier(tile.x, tile.y)) {
        this._startFishing(tile.x, tile.y);
        return;
      }
    }

    // Walk to tile
    if (this.world.isWalkable(tile.x, tile.y)) {
      this.player.walkTo(this.world, tile.x, tile.y);
      this.player.action = null;
    } else {
      // Try to walk adjacent
      const adj = this._findAdjacentWalkable(tile.x, tile.y);
      if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    }
  }

  _onRightClick(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const tile = this.renderer.screenToTile(mx, my);
    if (tile.x < 0 || tile.y < 0 || tile.x >= MAP_W || tile.y >= MAP_H) return;

    const tileObj = this.world.getTile(tile.x, tile.y);
    const npcs    = this.npcMgr.getAt(tile.x, tile.y);
    const actions = [];

    if (npcs.length > 0) {
      const npc = npcs[0];
      actions.push({ label: `Talk to ${npc.def.name}`, fn: () => this._talkTo(npc) });
      if (npc.def.hostile) {
        actions.push({ label: `Attack ${npc.def.name}`, fn: () => this.startCombat(npc) });
      }
    }

    if (tileObj) {
      actions.push({ label: `Examine: ${tileObj.name}`, fn: () => {
        this.ui.log(tileObj.desc, 'info');
      }});
      if (tileObj.id === 'COAL') {
        actions.push({ label: 'Mine Coal', fn: () => this._startMining(tile.x, tile.y) });
      }
      if (tileObj.id === 'TREE') {
        actions.push({ label: 'Chop Tree', fn: () => this._startWoodcutting(tile.x, tile.y) });
      }
      if (tileObj.id === 'WATER' || tileObj.id === 'SHALLOW') {
        actions.push({ label: 'Fish here', fn: () => this._startFishing(tile.x, tile.y) });
      }
    }

    const loot = this.world.getLootAt(tile.x, tile.y);
    if (loot) {
      actions.push({ label: 'Pick up items', fn: () => this._pickupLoot(tile.x, tile.y) });
    }

    if (this.world.isWalkable(tile.x, tile.y)) {
      actions.push({ label: `Walk here (${tile.x}, ${tile.y})`, fn: () => {
        this.player.walkTo(this.world, tile.x, tile.y);
      }});
    }

    if (actions.length > 0) {
      this.ui.showContextMenu(mx, my, actions);
    }
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const tile = this.renderer.screenToTile(mx, my);
    if (tile.x >= 0 && tile.y >= 0 && tile.x < MAP_W && tile.y < MAP_H) {
      this.renderer.selectedTile = tile;
    } else {
      this.renderer.selectedTile = null;
    }
  }

  // ---- NPC Interaction ----
  _interactNPC(npc, mx, my) {
    if (!npc.def.hostile) {
      this._talkTo(npc);
    } else {
      this.ui.showContextMenu(mx, my, [
        { label: `Attack ${npc.def.name}`, fn: () => this.startCombat(npc) },
        { label: `Talk to ${npc.def.name}`, fn: () => this._talkTo(npc) },
      ]);
    }
  }

  _talkTo(npc) {
    // Walk adjacent first
    const dx = npc.x - this.player.x;
    const dy = npc.y - this.player.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
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
    if (!npc || !npc.alive) {
      this._endCombat();
      return;
    }

    // Move adjacent
    if (npc.distanceTo(this.player.x, this.player.y) > 1.5) {
      const adj = this._findAdjacentWalkable(npc.x, npc.y);
      if (adj) {
        this.player.x = adj.x;
        this.player.y = adj.y;
      }
    }

    const attackSpeed = 2.4; // seconds per round
    if (this.combatTimer >= attackSpeed) {
      this.combatTimer = 0;
      this._combatRound(npc);
    }
  }

  _combatRound(npc) {
    // Player attacks
    const pAtk = this.player.getAttack();
    const pDmg = Math.max(0, Math.floor(Math.random() * pAtk * 1.5 + 1) - npc.def.defence);
    npc.hp -= pDmg;

    // Show damage on canvas
    const pScreen = this.renderer.tileToScreen(npc.x, npc.y);
    this.ui.showDamage(
      pScreen.x + this.canvas.getBoundingClientRect().left - document.getElementById('canvas-wrap').getBoundingClientRect().left,
      pScreen.y - 40,
      pDmg,
      false
    );

    this.ui.log(`You hit ${npc.def.name} for ${pDmg} damage.`, 'combat');

    // Skill XP for attack/strength
    const lvlUp = this.player.gainXp('attack', 4 * pDmg);
    if (lvlUp) this.ui.showLevelUp('Attack', this.player.skills.attack.level);
    const lvlUp2 = this.player.gainXp('strength', 4 * pDmg);
    if (lvlUp2) this.ui.showLevelUp('Strength', this.player.skills.strength.level);

    if (npc.hp <= 0) {
      this._killNPC(npc);
      return;
    }

    // NPC attacks
    const nAtk = npc.def.attack;
    const nDmg = Math.max(0, Math.floor(Math.random() * nAtk * 1.5 + 1) - this.player.getDefence());
    this.player.hp -= nDmg;

    const plScreen = this.renderer.tileToScreen(this.player.x, this.player.y);
    this.ui.showDamage(
      plScreen.x + this.canvas.getBoundingClientRect().left - document.getElementById('canvas-wrap').getBoundingClientRect().left,
      plScreen.y - 40,
      nDmg,
      true
    );

    this.ui.log(`${npc.def.name} hits you for ${nDmg} damage!`, 'combat');

    // Defence XP
    const lvlUp3 = this.player.gainXp('defence', 4 * nDmg);
    if (lvlUp3) this.ui.showLevelUp('Defence', this.player.skills.defence.level);

    if (this.player.hp <= 0) {
      this._playerDeath();
    }
  }

  _killNPC(npc) {
    this.ui.log(`You defeat the ${npc.def.name}!`, 'combat');

    // XP reward
    if (npc.def.xpReward > 0) {
      this.player.gainXp('hp', npc.def.xpReward);
      this.ui.log(`You gain ${npc.def.xpReward} HP XP.`, 'skill');
    }

    // Drop loot
    const drops = npc.rollLoot();
    if (drops.length > 0) {
      this.world.dropItem(npc.x, npc.y, drops[0].item, drops[0].qty);
      for (let i = 1; i < drops.length; i++) {
        this.world.dropItem(npc.x + i, npc.y, drops[i].item, drops[i].qty);
      }
      this.ui.log(`${npc.def.name} drops: ${drops.map(d => `${ITEMS[d.item]?.name} x${d.qty}`).join(', ')}`, 'loot');
    }

    this.npcMgr.kill(npc);
    this._endCombat();
  }

  _playerDeath() {
    this.player.hp = 0;
    this.player.dead = true;
    this._endCombat();
    this.ui.log('You have been defeated! You wake up on the beach...', 'combat');
    setTimeout(() => {
      this.player.revive();
      this.ui.log('You feel a little groggy, but alive. Some items may have been lost.', 'system');
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

  // ---- Aggro ----
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

  // ---- Skill Actions ----
  _startMining(tx, ty) {
    if (!this.player.hasTool('PICKAXE') && this.player.equipment.tool !== 'PICKAXE') {
      this.ui.log("You need a pickaxe to mine! Buy one at the Market.", 'system');
      return;
    }
    if (this.player.inventoryFull()) {
      this.ui.log("Your inventory is full!", 'system');
      return;
    }
    const adj = this._findAdjacentWalkable(tx, ty);
    if (adj) {
      this.player.walkTo(this.world, adj.x, adj.y);
    }
    this.player.action = { type: 'mine', tx, ty, timer: 0, ticks: 0 };
    this.ui.log("You begin mining...", 'skill');
  }

  _startWoodcutting(tx, ty) {
    if (!this.player.hasTool('AXE') && this.player.equipment.tool !== 'AXE') {
      this.ui.log("You need an axe to chop! Buy one at the Market.", 'system');
      return;
    }
    if (this.player.inventoryFull()) {
      this.ui.log("Your inventory is full!", 'system');
      return;
    }
    const adj = this._findAdjacentWalkable(tx, ty);
    if (adj) this.player.walkTo(this.world, adj.x, adj.y);
    this.player.action = { type: 'chop', tx, ty, timer: 0 };
    this.ui.log("You begin chopping...", 'skill');
  }

  _startFishing(tx, ty) {
    if (!this.player.hasItem('FISHING_ROD') && this.player.equipment.tool !== 'FISHING_ROD') {
      this.ui.log("You need a fishing rod! Buy one at the Market.", 'system');
      return;
    }
    if (this.player.inventoryFull()) {
      this.ui.log("Your inventory is full!", 'system');
      return;
    }
    // Find pier tile to stand on
    const pierAdj = this._findAdjacentPier(tx, ty);
    if (pierAdj) this.player.walkTo(this.world, pierAdj.x, pierAdj.y);
    this.player.action = { type: 'fish', tx, ty, timer: 0 };
    this.ui.log("You cast your line...", 'skill');
  }

  _updateAction(dt) {
    if (this.player.path.length > 0) return; // still walking
    const action = this.player.action;
    if (!action) return;

    action.timer += dt;

    if (action.type === 'mine') {
      const tile = this.world.getTile(action.tx, action.ty);
      if (!tile || tile.id !== 'COAL') {
        this.ui.log("The coal seam is depleted.", 'info');
        this.player.action = null;
        return;
      }
      if (this.player.inventoryFull()) {
        this.ui.log("Your inventory is full!", 'system');
        this.player.action = null;
        return;
      }
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
          // Chance to deplete seam
          if (Math.random() < 0.3) {
            this.world.depleteResource(action.tx, action.ty);
            this.ui.log("The coal seam is temporarily exhausted.", 'info');
            this.player.action = null;
          }
        } else {
          this.ui.log("You swing your pickaxe but find nothing yet...", 'info');
        }
      }
    }
    else if (action.type === 'chop') {
      const tile = this.world.getTile(action.tx, action.ty);
      if (!tile || tile.id !== 'TREE') {
        this.ui.log("The tree is gone.", 'info');
        this.player.action = null;
        return;
      }
      if (this.player.inventoryFull()) {
        this.ui.log("Your inventory is full!", 'system');
        this.player.action = null;
        return;
      }
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
    }
    else if (action.type === 'fish') {
      if (this.player.inventoryFull()) {
        this.ui.log("Your inventory is full!", 'system');
        this.player.action = null;
        return;
      }
      const delay = Math.max(2, 8 - this.player.skills.fishing.level * 0.06);
      if (action.timer >= delay) {
        action.timer = 0;
        const roll = Math.random();
        if (roll < 0.5) {
          const isCrab = Math.random() < 0.3;
          const fish   = isCrab ? 'RAW_CRAB' : 'RAW_COD';
          this.player.addItem(fish, 1);
          const xp = isCrab ? 80 : 40;
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

  // ---- Loot Pickup ----
  _pickupLoot(x, y) {
    const items = this.world.pickupLoot(x, y);
    if (!items) return;
    for (const { item, qty } of items) {
      if (!this.player.addItem(item, qty)) {
        // Inventory full — drop back
        this.world.dropItem(x, y, item, qty);
        this.ui.log("Inventory full! Can't pick everything up.", 'system');
      } else {
        const def = ITEMS[item];
        this.ui.log(`You pick up ${def.name} x${qty}.`, 'loot');
      }
    }
    this.ui.updateInventory(this.player);
  }

  // ---- Examine ----
  _examinePlayerTile() {
    const tile = this.world.getTile(this.player.x, this.player.y);
    if (tile) this.ui.log(`You are standing on: ${tile.name}. ${tile.desc}`, 'info');
    const zone = this.world.getZone(this.player.x, this.player.y);
    this.ui.log(`Location: ${zone}`, 'info');
  }

  _toggleInventoryPanel() {
    const inv = document.getElementById('right-panel');
    inv.style.display = inv.style.display === 'none' ? 'flex' : 'none';
  }

  // ---- Helpers ----
  _findAdjacentWalkable(tx, ty) {
    const dirs = [{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},
                  {x:-1,y:-1},{x:1,y:1},{x:-1,y:1},{x:1,y:-1}];
    for (const d of dirs) {
      const nx = tx + d.x, ny = ty + d.y;
      if (this.world.isWalkable(nx, ny)) return { x:nx, y:ny };
    }
    return null;
  }

  _isAdjacentToPier(tx, ty) {
    const dirs = [{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}];
    for (const d of dirs) {
      const nt = this.world.getTile(tx + d.x, ty + d.y);
      if (nt && (nt.id === 'PIER' || nt.id === 'SAND' || nt.id === 'PAVEMENT')) return true;
    }
    return true; // Allow fishing near any walkable shore
  }

  _findAdjacentPier(tx, ty) {
    const dirs = [{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}];
    for (const d of dirs) {
      const nx = tx + d.x, ny = ty + d.y;
      const nt = this.world.getTile(nx, ny);
      if (nt && nt.walkable) return { x:nx, y:ny };
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
    [20,  'Building the world map...'],
    [40,  'Placing South Shields landmarks...'],
    [60,  'Spawning NPCs...'],
    [75,  'Preparing the North Sea...'],
    [90,  'Polishing the cobblestones...'],
    [100, 'Ready!'],
  ];

  let i = 0;
  const tick = () => {
    if (i >= steps.length) {
      setTimeout(() => {
        screen.style.display = 'none';
        cont.style.display   = 'flex';
        game.start();
      }, 300);
      return;
    }
    const [pct, msg] = steps[i++];
    fill.style.width = pct + '%';
    text.textContent = msg;
    setTimeout(tick, 300 + Math.random() * 200);
  };

  const game = new Game();
  tick();
});
