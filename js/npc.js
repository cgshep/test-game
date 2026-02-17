/* ===================================================
   NPC - instances, behaviour, spawning
   =================================================== */

class NPC {
  constructor(def, x, y) {
    this.def  = def;
    this.x    = x;
    this.y    = y;
    this.hp   = def.hp;
    this.maxHp = def.maxHp;
    this.alive = true;
    this.wanderTimer = 0;
    this.wanderDelay = 2 + Math.random() * 4; // seconds
    this.inCombat    = false;
    this.combatTarget = null;
    this.combatTimer  = 0;
    this.respawnTimer = 0;
    this.spawnX = x;
    this.spawnY = y;
    this.walkAnim = 0;
    this.dialoguePage = 0;
  }

  rollLoot() {
    const drops = [];
    for (const drop of (this.def.loot || [])) {
      const chance = drop.chance !== undefined ? drop.chance : 1;
      if (Math.random() < chance) {
        const qty = Array.isArray(drop.qty)
          ? drop.qty[0] + Math.floor(Math.random() * (drop.qty[1] - drop.qty[0] + 1))
          : drop.qty || 1;
        drops.push({ item: drop.item, qty });
      }
    }
    return drops;
  }

  update(dt, world, player) {
    if (!this.alive) return;

    this.walkAnim += dt * 0.5;

    if (this.inCombat && this.combatTarget) {
      // Combat tick handled by game.js
      return;
    }

    // Wander
    this.wanderTimer += dt;
    if (this.wanderTimer >= this.wanderDelay) {
      this.wanderTimer = 0;
      this.wanderDelay = 2 + Math.random() * 5;
      this.wander(world);
    }
  }

  wander(world) {
    const radius = this.def.wanderRadius || 4;
    const dx = Math.floor((Math.random() - 0.5) * radius * 2);
    const dy = Math.floor((Math.random() - 0.5) * radius * 2);
    const nx = Math.max(0, Math.min(MAP_W - 1, this.spawnX + dx));
    const ny = Math.max(0, Math.min(MAP_H - 1, this.spawnY + dy));

    if (world.isWalkable(nx, ny)) {
      this.x = nx;
      this.y = ny;
    }
  }

  distanceTo(x, y) {
    return Math.abs(this.x - x) + Math.abs(this.y - y);
  }
}

class NPCManager {
  constructor() {
    this.npcs = [];
    this.respawnQueue = []; // { def, x, y, spawnX, spawnY, at }
  }

  spawnAll() {
    for (const def of NPC_DEFS) {
      const zone = def.spawnZone;
      const spots = SPAWN_POINTS[zone] || [];
      if (spots.length === 0) continue;

      // Spawn 1-2 instances per def
      const count = def.hostile ? 2 : 1;
      for (let i = 0; i < count && i < spots.length; i++) {
        const sp = spots[i % spots.length];
        const offset = { x: sp.x + Math.floor(Math.random()*3 - 1),
                         y: sp.y + Math.floor(Math.random()*3 - 1) };
        this.npcs.push(new NPC(def, offset.x, offset.y));
      }
    }
    // Extra seagulls on beach
    for (let i = 0; i < 4; i++) {
      const def = NPC_DEFS.find(d => d.id === 'seagull');
      const x = 35 + Math.floor(Math.random() * 20);
      const y = 22 + Math.floor(Math.random() * 6);
      this.npcs.push(new NPC(def, x, y));
    }
    // Extra sea goblins
    for (let i = 0; i < 3; i++) {
      const def = NPC_DEFS.find(d => d.id === 'sea_goblin');
      const x = 36 + Math.floor(Math.random() * 18);
      const y = 24 + Math.floor(Math.random() * 4);
      this.npcs.push(new NPC(def, x, y));
    }
    // Extra Roman ghosts in Arbeia
    for (let i = 0; i < 3; i++) {
      const def = NPC_DEFS.find(d => d.id === 'roman_soldier');
      const x = 7 + Math.floor(Math.random() * 9);
      const y = 40 + Math.floor(Math.random() * 7);
      this.npcs.push(new NPC(def, x, y));
    }
  }

  getAt(x, y) {
    return this.npcs.filter(n => n.alive && Math.round(n.x) === x && Math.round(n.y) === y);
  }

  getAdjacent(x, y) {
    return this.npcs.filter(n => n.alive && Math.abs(n.x - x) <= 1 && Math.abs(n.y - y) <= 1);
  }

  update(dt, world, player) {
    for (const npc of this.npcs) npc.update(dt, world, player);

    // Handle respawn queue
    const now = Date.now();
    this.respawnQueue = this.respawnQueue.filter(r => {
      if (now >= r.at) {
        const npc = new NPC(r.def, r.spawnX, r.spawnY);
        this.npcs.push(npc);
        return false;
      }
      return true;
    });
  }

  kill(npc) {
    npc.alive = false;
    const idx = this.npcs.indexOf(npc);
    if (idx !== -1) this.npcs.splice(idx, 1);
    // Queue respawn for hostile NPCs
    if (npc.def.hostile) {
      const delay = 60000 + Math.random() * 60000;
      this.respawnQueue.push({
        def:    npc.def,
        spawnX: npc.spawnX,
        spawnY: npc.spawnY,
        at:     Date.now() + delay,
      });
    }
  }
}
