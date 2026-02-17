/* ===================================================
   ISOMETRIC RENDERER
   Converts tile grid coordinates to screen positions
   and draws everything using Canvas 2D API.
   =================================================== */

const TILE_W = 64;   // width of iso tile
const TILE_H = 32;   // height of iso tile
const TILE_DEPTH = 16; // side-face depth for 3D look

class IsoRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.camX   = 0;   // camera offset in pixels
    this.camY   = 0;
    this.waterAnim = 0; // water shimmer frame
    this.selectedTile = null; // {x,y} hover highlight
  }

  // --- Coordinate conversions ---
  tileToScreen(tx, ty) {
    return {
      x: (tx - ty) * (TILE_W / 2) - this.camX,
      y: (tx + ty) * (TILE_H / 2) - this.camY,
    };
  }

  screenToTile(sx, sy) {
    // Inverse of iso transform
    const wx = sx + this.camX;
    const wy = sy + this.camY;
    const tx = Math.floor((wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2);
    const ty = Math.floor((wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2);
    return { x: tx, y: ty };
  }

  // Centre camera on world tile position
  centreOn(tx, ty) {
    const s = this.tileToScreen_raw(tx, ty);
    this.camX = s.x - this.canvas.width  / 2;
    this.camY = s.y - this.canvas.height / 2;
  }

  tileToScreen_raw(tx, ty) {
    return {
      x: (tx - ty) * (TILE_W / 2),
      y: (tx + ty) * (TILE_H / 2),
    };
  }

  // --- Main render call ---
  render(world, player, npcs) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    this.waterAnim += 0.03;

    ctx.clearRect(0, 0, W, H);

    // sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    sky.addColorStop(0, '#1a2a3a');
    sky.addColorStop(1, '#2a4a5a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Determine visible tile range
    const margin = 4;
    const topLeft     = this.screenToTile(-margin * TILE_W, -margin * TILE_H);
    const bottomRight = this.screenToTile(W + margin * TILE_W, H + margin * TILE_H);

    const minX = Math.max(0, topLeft.x - 2);
    const maxX = Math.min(MAP_W - 1, bottomRight.x + 2);
    const minY = Math.max(0, topLeft.y - 2);
    const maxY = Math.min(MAP_H - 1, bottomRight.y + 2);

    // Draw tiles in painter's order (back to front)
    for (let iy = minY; iy <= maxY; iy++) {
      for (let ix = minX; ix <= maxX; ix++) {
        this.drawTile(ctx, ix, iy, world.map[iy][ix]);
      }
    }

    // Draw objects on tiles (tree trunks/tops, coal etc.)
    for (let iy = minY; iy <= maxY; iy++) {
      for (let ix = minX; ix <= maxX; ix++) {
        this.drawTileObject(ctx, ix, iy, world.map[iy][ix]);
      }
    }

    // Draw NPCs (painter's order)
    const sortedNpcs = [...npcs].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const npc of sortedNpcs) {
      this.drawEntity(ctx, npc.x, npc.y, npc.def.icon, npc.def.colour, npc.def.name, npc.hp, npc.def.maxHp, npc.def.hostile);
    }

    // Draw player
    this.drawPlayer(ctx, player);

    // Draw selected tile highlight
    if (this.selectedTile) {
      this.drawTileHighlight(ctx, this.selectedTile.x, this.selectedTile.y, '#f0d06080', 2);
    }

    // Draw player's path target
    if (player.pathTarget) {
      this.drawTileHighlight(ctx, player.pathTarget.x, player.pathTarget.y, '#50d05080', 1);
    }
  }

  drawTile(ctx, tx, ty, tileId) {
    const tile = TILES._byNum[tileId];
    if (!tile) return;

    const { x, y } = this.tileToScreen(tx, ty);
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    // Water animation shimmer
    let topCol = tile.topColour;
    if (tile.id === 'WATER') {
      const wave = Math.sin(this.waterAnim + tx * 0.3 + ty * 0.2) * 0.08;
      topCol = this.adjustBrightness(tile.topColour, wave);
    } else if (tile.id === 'SHALLOW') {
      const wave = Math.sin(this.waterAnim * 1.2 + tx * 0.4 + ty * 0.3) * 0.1;
      topCol = this.adjustBrightness(tile.topColour, wave);
    }

    // Top face (diamond)
    ctx.beginPath();
    ctx.moveTo(x,        y - hh);       // top
    ctx.lineTo(x + hw,   y);            // right
    ctx.lineTo(x,        y + hh);       // bottom
    ctx.lineTo(x - hw,   y);            // left
    ctx.closePath();
    ctx.fillStyle = topCol;
    ctx.fill();

    // Skip depth face for flat tiles
    if (tile.id === 'WATER' || tile.id === 'SHALLOW') return;

    // Left side face
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x,      y + hh);
    ctx.lineTo(x,      y + hh + TILE_DEPTH);
    ctx.lineTo(x - hw, y + TILE_DEPTH);
    ctx.closePath();
    ctx.fillStyle = this.darken(tile.colour, 0.55);
    ctx.fill();

    // Right side face
    ctx.beginPath();
    ctx.moveTo(x,      y + hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw, y + TILE_DEPTH);
    ctx.lineTo(x,      y + hh + TILE_DEPTH);
    ctx.closePath();
    ctx.fillStyle = this.darken(tile.colour, 0.75);
    ctx.fill();

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(x,        y - hh);
    ctx.lineTo(x + hw,   y);
    ctx.lineTo(x,        y + hh);
    ctx.lineTo(x - hw,   y);
    ctx.closePath();
    ctx.stroke();
  }

  drawTileObject(ctx, tx, ty, tileId) {
    const tile = TILES._byNum[tileId];
    if (!tile) return;
    const { x, y } = this.tileToScreen(tx, ty);

    if (tile.id === 'TREE') {
      // Trunk
      ctx.fillStyle = '#5a3820';
      ctx.fillRect(x - 4, y - 14, 8, 20);
      // Canopy (3 circles)
      ctx.fillStyle = '#2a6820';
      ctx.beginPath(); ctx.arc(x, y - 28, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a7830';
      ctx.beginPath(); ctx.arc(x - 8, y - 22, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 8, y - 24, 11, 0, Math.PI * 2); ctx.fill();
    }
    else if (tile.id === 'COAL') {
      // Rock with dark streaks
      ctx.fillStyle = '#302828';
      ctx.beginPath(); ctx.arc(x, y - 12, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#181818';
      ctx.beginPath(); ctx.arc(x - 3, y - 14, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, y - 10, 5, 0, Math.PI * 2); ctx.fill();
    }
    else if (tile.id === 'CLIFF') {
      // Extra height blocks for cliff
      ctx.fillStyle = '#5a4028';
      ctx.beginPath();
      ctx.moveTo(x - TILE_W/2, y);
      ctx.lineTo(x, y - TILE_H/2);
      ctx.lineTo(x + TILE_W/2, y);
      ctx.lineTo(x + TILE_W/2, y + 20);
      ctx.lineTo(x, y + TILE_H/2 + 20);
      ctx.lineTo(x - TILE_W/2, y + 20);
      ctx.closePath();
      ctx.fill();
    }
    else if (tile.id === 'WALL') {
      // Wall block
      ctx.fillStyle = '#7a6848';
      const bh = 22;
      ctx.beginPath();
      ctx.moveTo(x, y - bh - TILE_H/2);
      ctx.lineTo(x + TILE_W/2, y - bh);
      ctx.lineTo(x + TILE_W/2, y);
      ctx.lineTo(x, y + TILE_H/2);
      ctx.lineTo(x - TILE_W/2, y);
      ctx.lineTo(x - TILE_W/2, y - bh);
      ctx.closePath();
      ctx.fillStyle = '#8a7858';
      ctx.fill();
      // Left face
      ctx.beginPath();
      ctx.moveTo(x - TILE_W/2, y - bh);
      ctx.lineTo(x, y + TILE_H/2 - bh);
      ctx.lineTo(x, y + TILE_H/2);
      ctx.lineTo(x - TILE_W/2, y);
      ctx.closePath();
      ctx.fillStyle = '#5a4828';
      ctx.fill();
    }
    else if (tile.id === 'RUINS') {
      // Crumbled stone blocks
      ctx.fillStyle = '#7a7860';
      const offsets = [[-10,-8],[8,-6],[-5,4],[12,2]];
      for (const [ox,oy] of offsets) {
        const h = 6 + Math.abs(ox) % 5;
        ctx.fillRect(x + ox - 4, y + oy - h, 8, h);
        ctx.fillStyle = '#6a6850';
        ctx.fillRect(x + ox - 4, y + oy - h + 2, 8, 2);
        ctx.fillStyle = '#7a7860';
      }
    }
    else if (tile.id === 'FLOWER') {
      // Small flowers
      ctx.fillStyle = '#e0d040';
      ctx.beginPath(); ctx.arc(x - 4, y - 4, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e040a0';
      ctx.beginPath(); ctx.arc(x + 5, y - 6, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#40e060';
      ctx.beginPath(); ctx.arc(x, y - 2, 1.5, 0, Math.PI*2); ctx.fill();
    }
    else if (tile.id === 'MINESHAFT') {
      // Dark shaft opening
      ctx.fillStyle = '#080808';
      ctx.beginPath();
      ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#3a2808';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Support beams
      ctx.strokeStyle = '#5a3820';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-8, y+2); ctx.lineTo(x-8, y-10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+8, y+2); ctx.lineTo(x+8, y-10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-8, y-10); ctx.lineTo(x+8, y-10); ctx.stroke();
    }
    else if (tile.id === 'PIER') {
      // Pier planks
      ctx.strokeStyle = '#8a6840';
      ctx.lineWidth = 1;
      for (let i = -12; i <= 12; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + i, y - 4); ctx.lineTo(x + i, y + 4);
        ctx.stroke();
      }
    }
    else if (tile.id === 'DOCK') {
      // Dock bollard
      if ((tx + ty) % 5 === 0) {
        ctx.fillStyle = '#3a2808';
        ctx.beginPath(); ctx.arc(x, y - 8, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#6a4820';
        ctx.fillRect(x-2, y - 8, 4, 10);
      }
    }
  }

  drawEntity(ctx, tx, ty, icon, colour, name, hp, maxHp, hostile) {
    const { x, y } = this.tileToScreen(tx, ty);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body circle
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y - 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hostile ? '#cc3030' : '#c8a050';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Emoji icon
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y - 14);

    // Name label
    ctx.font = 'bold 9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = hostile ? '#ff8888' : '#e0d080';
    ctx.fillText(name, x, y - 30);

    // HP bar (small, above name)
    const bw = 28, bh = 3;
    const hpFrac = hp / maxHp;
    ctx.fillStyle = '#300000';
    ctx.fillRect(x - bw/2, y - 40, bw, bh);
    ctx.fillStyle = hpFrac > 0.5 ? '#30cc30' : hpFrac > 0.25 ? '#cccc30' : '#cc3030';
    ctx.fillRect(x - bw/2, y - 40, bw * hpFrac, bh);
  }

  drawPlayer(ctx, player) {
    const { x, y } = this.tileToScreen(player.x, player.y);

    // Animate bob
    const bob = Math.sin(player.walkAnim * 6) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#c09060';
    ctx.beginPath();
    ctx.arc(x, y - 16 + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f0d060';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Face
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧑', x, y - 16 + bob);

    // Player name
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f080';
    ctx.fillText(player.name, x, y - 34 + bob);

    // HP bar
    const bw = 32, bh = 4;
    const hpFrac = player.hp / player.maxHp;
    ctx.fillStyle = '#300000';
    ctx.fillRect(x - bw/2, y - 44 + bob, bw, bh);
    ctx.fillStyle = hpFrac > 0.5 ? '#30cc30' : hpFrac > 0.25 ? '#cccc30' : '#cc3030';
    ctx.fillRect(x - bw/2, y - 44 + bob, bw * hpFrac, bh);
  }

  drawTileHighlight(ctx, tx, ty, colour, lineWidth) {
    const { x, y } = this.tileToScreen(tx, ty);
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    ctx.beginPath();
    ctx.moveTo(x,      y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x,      y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.strokeStyle = colour;
    ctx.lineWidth   = lineWidth;
    ctx.stroke();
  }

  // --- Colour helpers ---
  adjustBrightness(hex, factor) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const f = 1 + factor;
    return `rgb(${Math.min(255,r*f|0)},${Math.min(255,g*f|0)},${Math.min(255,b*f|0)})`;
  }
  darken(hex, factor) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgb(${(r*factor)|0},${(g*factor)|0},${(b*factor)|0})`;
  }

  // Draw minimap
  drawMinimap(canvas, world, player, npcs) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const tw = cw / MAP_W, th = ch / MAP_H;

    ctx.clearRect(0, 0, cw, ch);

    // Tile colours (top-down)
    const miniColour = {
      [T.WATER]:    '#1a3a50',
      [T.SHALLOW]:  '#2a5060',
      [T.SAND]:     '#b0904a',
      [T.GRASS]:    '#304e20',
      [T.ROAD]:     '#404040',
      [T.COBBLE]:   '#504838',
      [T.PAVEMENT]: '#707060',
      [T.MARKET]:   '#786858',
      [T.WALL]:     '#6a5838',
      [T.FLOOR]:    '#7a6848',
      [T.RUINS]:    '#7a7860',
      [T.COAL]:     '#282820',
      [T.CLIFF]:    '#504028',
      [T.DOCK]:     '#4a3820',
      [T.PIER]:     '#5a4830',
      [T.TREE]:     '#205018',
      [T.FLOWER]:   '#305020',
      [T.MUD]:      '#5a4018',
      [T.ROCK]:     '#484848',
      [T.MINESHAFT]:'#181818',
      [T.DOOR]:     '#7a4018',
      [T.BUSH]:     '#2a4818',
    };

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tid = world.map[y][x];
        ctx.fillStyle = miniColour[tid] || '#303028';
        ctx.fillRect(x * tw, y * th, tw + 0.5, th + 0.5);
      }
    }

    // NPCs
    for (const npc of npcs) {
      ctx.fillStyle = npc.def.hostile ? '#cc3030' : '#30cc30';
      ctx.fillRect(npc.x * tw - 1, npc.y * th - 1, 3, 3);
    }

    // Player dot
    ctx.fillStyle = '#f0f060';
    ctx.beginPath();
    ctx.arc(player.x * tw, player.y * th, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
