/* ===================================================
   PLAYER - state, movement, skills, inventory
   =================================================== */

const SKILL_DEFS = [
  { id:'attack',     name:'Attack',     icon:'⚔️',  maxLevel:99 },
  { id:'defence',    name:'Defence',    icon:'🛡️',  maxLevel:99 },
  { id:'hp',         name:'Hitpoints',  icon:'❤️',  maxLevel:99 },
  { id:'mining',     name:'Mining',     icon:'⛏️',  maxLevel:99 },
  { id:'woodcut',    name:'Woodcutting',icon:'🪓', maxLevel:99 },
  { id:'fishing',    name:'Fishing',    icon:'🎣', maxLevel:99 },
  { id:'cooking',    name:'Cooking',    icon:'🍳', maxLevel:99 },
  { id:'smithing',   name:'Smithing',   icon:'🔨', maxLevel:99 },
  { id:'strength',   name:'Strength',   icon:'💪', maxLevel:99 },
  { id:'runecrafting',name:'History',   icon:'📜', maxLevel:99 },
];

function xpForLevel(lvl) {
  let x = 0;
  for (let i = 1; i < lvl; i++) x += Math.floor(i + 300 * Math.pow(2, i / 7));
  return Math.floor(x / 4);
}

function levelForXp(xp) {
  let lvl = 1;
  while (lvl < 99 && xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

class Player {
  constructor(name) {
    this.name   = name;
    this.x      = PLAYER_START.x;
    this.y      = PLAYER_START.y;
    this.walkAnim = 0;

    // Combat stats
    this.hp    = 10;
    this.maxHp = 10;

    // Skills
    this.skills = {};
    for (const s of SKILL_DEFS) {
      this.skills[s.id] = { xp: 0, level: 1 };
    }
    this.skills.hp.xp = xpForLevel(10);
    this.skills.hp.level = 10;

    // Inventory: 28 slots, each null or {item, qty}
    this.inventory = new Array(28).fill(null);

    // Equipment
    this.equipment = { weapon: null, armour: null, tool: null };
    this.equipment.weapon = 'FISTS';

    // Coins
    this.coins = 50;

    // Total XP (display)
    this.totalXp = 0;

    // Movement
    this.path       = [];
    this.pathTarget = null;
    this.moving     = false;
    this.moveTimer  = 0;
    this.moveSpeed  = 0.18; // seconds per tile

    // Action state
    this.action = null; // { type:'mine'/'fish'/'chop', tx, ty, timer }
    this.inCombat = false;
    this.combatTarget = null;

    // Flags
    this.dead = false;
  }

  // Gain XP in a skill, return true if levelled up
  gainXp(skillId, amount) {
    const s = this.skills[skillId];
    const oldLevel = s.level;
    s.xp += amount;
    s.level = levelForXp(s.xp);
    this.totalXp += amount;
    // If HP skill, update maxHp
    if (skillId === 'hp') {
      const newMax = s.level;
      this.maxHp = newMax;
      this.hp = Math.min(this.hp, this.maxHp);
    }
    return s.level > oldLevel;
  }

  // Inventory management
  addItem(itemId, qty = 1) {
    const def = ITEMS[itemId];
    if (!def) return false;
    if (def.stackable) {
      const slot = this.inventory.findIndex(s => s && s.item === itemId);
      if (slot !== -1) { this.inventory[slot].qty += qty; return true; }
    }
    const empty = this.inventory.findIndex(s => s === null);
    if (empty === -1) return false; // inventory full
    this.inventory[empty] = { item: itemId, qty };
    return true;
  }

  removeItem(itemId, qty = 1) {
    for (let i = 0; i < this.inventory.length; i++) {
      const s = this.inventory[i];
      if (s && s.item === itemId) {
        if (s.qty <= qty) { this.inventory[i] = null; qty -= s.qty; }
        else { s.qty -= qty; qty = 0; }
        if (qty <= 0) return true;
      }
    }
    return qty <= 0;
  }

  countItem(itemId) {
    return this.inventory.reduce((n, s) => n + (s && s.item === itemId ? s.qty : 0), 0);
  }

  hasItem(itemId) { return this.countItem(itemId) > 0; }

  hasTool(type) {
    // Check equipped tool or in inventory
    if (this.equipment.tool === type) return true;
    return this.hasItem(type);
  }

  inventoryFull() {
    return !this.inventory.some(s => s === null);
  }

  // Movement: A* pathfinding (simple BFS for this grid)
  findPath(world, tx, ty) {
    const sx = Math.round(this.x), sy = Math.round(this.y);
    if (sx === tx && sy === ty) return [];

    const key = (x,y) => `${x},${y}`;
    const queue = [{ x:sx, y:sy, path:[] }];
    const visited = new Set([key(sx,sy)]);

    while (queue.length > 0) {
      const { x, y, path } = queue.shift();
      const neighbours = [
        {x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1},
        {x:x+1,y:y+1},{x:x-1,y:y-1},{x:x+1,y:y-1},{x:x-1,y:y+1},
      ];
      for (const nb of neighbours) {
        if (nb.x < 0 || nb.y < 0 || nb.x >= MAP_W || nb.y >= MAP_H) continue;
        const k = key(nb.x, nb.y);
        if (visited.has(k)) continue;
        const newPath = [...path, {x:nb.x,y:nb.y}];
        if (nb.x === tx && nb.y === ty) return newPath;
        // Allow walking through adjacent-to-target even if blocked
        if (!world.isWalkable(nb.x, nb.y)) { visited.add(k); continue; }
        visited.add(k);
        queue.push({ x:nb.x, y:nb.y, path:newPath });
        if (newPath.length > 60) return newPath; // path too long, partial
      }
    }
    return [];
  }

  walkTo(world, tx, ty) {
    this.path = this.findPath(world, tx, ty);
    this.pathTarget = this.path.length > 0 ? { x:tx, y:ty } : null;
    this.action = null;
    this.inCombat = false;
    this.combatTarget = null;
  }

  getAttack() {
    const wDef = ITEMS[this.equipment.weapon || 'FISTS'];
    return (wDef?.attack || 1) + Math.floor(this.skills.attack.level / 5);
  }

  getDefence() {
    const aDef = ITEMS[this.equipment.armour];
    return (aDef?.def || 0) + Math.floor(this.skills.defence.level / 5);
  }

  equip(itemId) {
    const def = ITEMS[itemId];
    if (!def || !def.equip) return false;
    const slot = def.equip;
    if (this.equipment[slot]) {
      // Swap old item back to inventory
      this.addItem(this.equipment[slot], 1);
    }
    this.removeItem(itemId, 1);
    this.equipment[slot] = itemId;
    return true;
  }

  eat(itemId) {
    const def = ITEMS[itemId];
    if (!def || !def.healHp) return false;
    this.removeItem(itemId, 1);
    const healed = Math.min(def.healHp, this.maxHp - this.hp);
    this.hp += healed;
    return healed;
  }

  // Update movement each frame
  update(dt, world) {
    if (this.dead) return;

    // Walk animation
    if (this.path.length > 0) {
      this.walkAnim += dt;
      this.moveTimer += dt;
      if (this.moveTimer >= this.moveSpeed) {
        this.moveTimer = 0;
        const next = this.path.shift();
        if (next && world.isWalkable(next.x, next.y)) {
          this.x = next.x;
          this.y = next.y;
        } else {
          this.path = [];
          this.pathTarget = null;
        }
      }
    } else {
      this.walkAnim = 0;
      this.moveTimer = 0;
      this.pathTarget = null;
    }
  }

  revive() {
    this.hp   = Math.floor(this.maxHp * 0.5);
    this.dead = false;
    this.x    = PLAYER_START.x;
    this.y    = PLAYER_START.y;
    this.inCombat     = false;
    this.combatTarget = null;
    this.path         = [];
  }
}
