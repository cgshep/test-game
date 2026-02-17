/* ===================================================
   WORLD - holds the map and world-state
   =================================================== */

class World {
  constructor() {
    this.map = applyOverlays(buildMap());
    this.lootPiles = []; // { x, y, items: [{item, qty}] }
    this.resourceStates = {}; // "x,y" -> { depleted, respawnAt }
  }

  getTile(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return null;
    return TILES._byNum[this.map[y][x]];
  }

  isWalkable(x, y) {
    const t = this.getTile(x, y);
    return t ? t.walkable : false;
  }

  getZone(x, y) {
    return getZoneName(x, y);
  }

  // Resource depletion (mining, fishing, woodcutting)
  depleteResource(x, y) {
    const key = `${x},${y}`;
    const tile = this.getTile(x, y);
    if (!tile) return;
    this.resourceStates[key] = {
      depleted: true,
      origTileId: this.map[y][x],
      respawnAt: Date.now() + 20000 + Math.random() * 20000,
    };
    // Replace with ground tile
    if (tile.id === 'TREE')       this.map[y][x] = T.GRASS;
    else if (tile.id === 'COAL')  this.map[y][x] = T.ROCK;
    else if (tile.id === 'WATER') { /* fishing doesn't deplete water */ }
  }

  // Check and respawn resources
  tickResources() {
    const now = Date.now();
    for (const key of Object.keys(this.resourceStates)) {
      const rs = this.resourceStates[key];
      if (rs.depleted && now >= rs.respawnAt) {
        const [x, y] = key.split(',').map(Number);
        this.map[y][x] = rs.origTileId;
        delete this.resourceStates[key];
      }
    }
  }

  // Drop items at position
  dropItem(x, y, itemId, qty = 1) {
    let pile = this.lootPiles.find(p => p.x === x && p.y === y);
    if (!pile) {
      pile = { x, y, items: [] };
      this.lootPiles.push(pile);
    }
    const existing = pile.items.find(i => i.item === itemId);
    if (existing) existing.qty += qty;
    else pile.items.push({ item: itemId, qty });
  }

  pickupLoot(x, y) {
    const idx = this.lootPiles.findIndex(p => p.x === x && p.y === y);
    if (idx === -1) return null;
    const pile = this.lootPiles[idx];
    this.lootPiles.splice(idx, 1);
    return pile.items;
  }

  getLootAt(x, y) {
    return this.lootPiles.find(p => p.x === x && p.y === y) || null;
  }
}
