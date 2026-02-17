/* ===================================================
   WORLD MAP DATA - South Shields inspired, 60x60
   Zone layout:
     - North (rows 0-14):  North Sea / Beach (east cols) + Town (west cols)
     - Mid   (rows 15-35): Town centre, Market, Colliery, Arbeia
     - South (rows 36-59): The Leas cliffs, River Tyne, Docks, Pier
   =================================================== */

const MAP_W = 60;
const MAP_H = 60;

// Shorthand aliases
const G  = T.GRASS;
const S  = T.SAND;
const W  = T.WATER;
const SH = T.SHALLOW;
const CL = T.CLIFF;
const MU = T.MUD;
const RK = T.ROCK;
const CB = T.COBBLE;
const RD = T.ROAD;
const PV = T.PAVEMENT;
const MK = T.MARKET;
const WL = T.WALL;
const FL = T.FLOOR;
const DO = T.DOOR;
const RU = T.RUINS;
const CO = T.COAL;
const MS = T.MINESHAFT;
const DK = T.DOCK;
const PR = T.PIER;
const TR = T.TREE;
const BU = T.BUSH;
const FW = T.FLOWER;
const SN = T.SNOW;

// prettier-ignore
const RAW_MAP = [
// 0         1         2         3         4         5
// 0123456789012345678901234567890123456789012345678901234567890
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSS", // 0
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 1
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 2
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 3
  "WWWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 4
  "WWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 5 (extra S, we'll trim to 60)
  "WWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 6
  "WWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 7
  "WWWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 8
  "WWWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 9
  "WWWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 10
  "WWWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 11
  "WWWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 12
  "WWWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 13
  "WWWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 14
  "WWWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 15
  "WWWWWWWWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 16
  "WWWWWWWWWWWWWSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 17  shallow starts
  "WWWWWWWWWWWWSHSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 18
  "WWWWWWWWWWWSHSHSHSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 19
  "WWWWWWWWWWWSHSHSHSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 20
  "WWWWWWWWWWSHSHSHSHSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 21 beach starts here east
  "WWWWWWWWWSHSHSHSHSHSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 22
  "WWWWWWWWSHSHSHSHSHSHSHSHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 23
  "WWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 24 full beach strip
  "WWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 25
  "WWWWWWWWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 26
  "WWWWWWWWRRRRRRRRRRRRRRRRRRRRRRRRRRRRSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 27 road across
  "GGGGGGGGRRRRRRRRRRRRRRRRRRRRRRRRRRRRSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 28 road continues, grass begins
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 29
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGSSSSSSSSSSSSSSSSSSSSSSSSSSSSS", // 30
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGPPPPPPPSSSSSSSSSSSSSSSSSSSSSS", // 31 pavement near beach
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGPPPPPPPPPPPPPPPPPPPPPPPPPPPPP", // 32 main prom
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGPPPPPPPPPPPPPPPPPPPPPPPPPPPPP", // 33
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGPPPPPPPPPPPPPPPPPPPPPPPPPPPPP", // 34
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGPPPPPPPPPPPPPPPPPPPPPPPPPPPPP", // 35
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGRRRRRRRRRRRRRRRRRRRRRRRRRRRR", // 36 promenade road
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 37
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 38
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 39
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 40
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 41
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 42
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 43
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 44
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 45
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 46
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 47
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 48
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 49
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 50
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 51
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 52
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 53
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 54
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // 55
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", // 56 River Tyne
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", // 57
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", // 58
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", // 59
];

// Parse raw map into 2D tile array
function buildMap() {
  const map = [];
  const charToTile = {
    'W': T.WATER, 'S': T.SAND, 'H': T.SHALLOW, 'G': T.GRASS,
    'R': T.ROAD,  'P': T.PAVEMENT, 'C': T.COBBLE, 'M': T.MARKET,
    'L': T.WALL,  'F': T.FLOOR,   'D': T.DOOR,   'U': T.RUINS,
    'O': T.COAL,  'N': T.MINESHAFT,'K': T.DOCK,   'I': T.PIER,
    'T': T.TREE,  'B': T.BUSH,    'X': T.FLOWER,  'Z': T.CLIFF,
    'r': T.ROCK,  'm': T.MUD,
  };
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    const row = RAW_MAP[y] || '';
    for (let x = 0; x < MAP_W; x++) {
      const ch = row[x] || 'G';
      map[y][x] = charToTile[ch] !== undefined ? charToTile[ch] : T.GRASS;
    }
  }
  return map;
}

// Overlay: special tile placements for South Shields landmarks
function applyOverlays(map) {
  // ---- Arbeia Roman Fort (rows 38-48, cols 5-18) ----
  for (let y = 39; y <= 47; y++)
    for (let x = 6; x <= 17; x++)
      map[y][x] = T.RUINS;

  // Fort outer walls
  for (let x = 5; x <= 18; x++) { map[38][x] = T.WALL; map[48][x] = T.WALL; }
  for (let y = 38; y <= 48; y++) { map[y][5]  = T.WALL; map[y][18] = T.WALL; }
  // Fort gates
  map[38][11] = T.DOOR; map[38][12] = T.DOOR;
  map[48][11] = T.DOOR; map[48][12] = T.DOOR;

  // ---- South Shields Market (rows 30-37, cols 22-33) ----
  for (let y = 31; y <= 36; y++)
    for (let x = 23; x <= 32; x++)
      map[y][x] = T.MARKET;
  // Market walls
  for (let x = 22; x <= 33; x++) { map[30][x] = T.WALL; map[37][x] = T.WALL; }
  for (let y = 30; y <= 37; y++) { map[y][22] = T.WALL; map[y][33] = T.WALL; }
  map[37][27] = T.DOOR; map[37][28] = T.DOOR;
  map[30][27] = T.DOOR;

  // ---- Colliery / Pit (rows 42-52, cols 38-50) ----
  for (let y = 43; y <= 51; y++)
    for (let x = 39; x <= 49; x++)
      map[y][x] = T.ROCK;
  // Coal seams
  for (let x = 40; x <= 48; x += 3) {
    map[44][x] = T.COAL; map[46][x] = T.COAL; map[48][x] = T.COAL;
  }
  // Mine shafts
  map[45][42] = T.MINESHAFT; map[45][46] = T.MINESHAFT;
  map[49][44] = T.MINESHAFT;

  // ---- River Tyne Dockside (rows 53-55, cols 0-30) ----
  for (let x = 0; x <= 30; x++) {
    map[55][x] = T.DOCK; map[54][x] = T.DOCK;
  }
  // Dock mud / shallow
  for (let x = 0; x <= 30; x++) map[53][x] = T.MUD;

  // ---- South Pier (rows 8-26, cols 55-59) ----
  for (let y = 8; y <= 26; y++) {
    map[y][55] = T.PIER; map[y][56] = T.PIER;
  }
  // Pier head
  for (let y = 6; y <= 9; y++)
    for (let x = 54; x <= 58; x++)
      map[y][x] = T.PIER;

  // ---- The Leas (cliffs, rows 30-36, cols 0-10) ----
  for (let y = 30; y <= 38; y++)
    for (let x = 0; x <= 10; x++)
      map[y][x] = T.CLIFF;
  // Cliff-top path
  for (let y = 30; y <= 38; y++) map[y][11] = T.PAVEMENT;

  // ---- Town roads (cobblestone) ----
  for (let x = 18; x <= 55; x++) { map[29][x] = T.COBBLE; } // main street
  for (let y = 29; y <= 55; y++) { map[y][20] = T.COBBLE; } // north-south
  for (let y = 29; y <= 40; y++) { map[y][36] = T.COBBLE; } // another street

  // ---- Trees / green areas ----
  const treespots = [
    [32,4],[33,4],[34,4],[32,7],[33,7],
    [40,20],[40,21],[41,20],[42,22],
    [27,5],[28,5],[29,6],
    [50,20],[51,20],[50,23],[51,23],
  ];
  for (const [r,c] of treespots) map[r][c] = T.TREE;

  // ---- Beach rocks ----
  const rockspots = [[24,30],[25,33],[26,36],[23,28],[22,40]];
  for (const [r,c] of rockspots) map[r][c] = T.ROCK;

  // ---- Flowers on grass ----
  for (let i = 0; i < 40; i++) {
    const r = 29 + Math.floor(Math.random()*24);
    const c = 12 + Math.floor(Math.random()*20);
    if (map[r] && map[r][c] === T.GRASS) map[r][c] = T.FLOWER;
  }

  return map;
}

// Zone names for each tile position (approximate)
function getZoneName(x, y) {
  if (y <= 28 && x >= 30) return 'The Beach';
  if (x >= 54 && y <= 28) return 'South Pier';
  if (y <= 28 && x < 30)  return 'North Sea';
  if (y >= 56)             return 'River Tyne';
  if (y >= 53 && y <= 55 && x <= 30) return 'The Docks';
  if (y >= 38 && y <= 48 && x >= 5 && x <= 18) return 'Arbeia Roman Fort';
  if (y >= 30 && y <= 37 && x >= 22 && x <= 33) return 'South Shields Market';
  if (y >= 42 && y <= 52 && x >= 38 && x <= 50) return 'Harton Colliery';
  if (y >= 30 && y <= 38 && x <= 11) return 'The Leas';
  if (y >= 29 && y <= 40 && x >= 12 && x <= 21) return 'Old Town';
  if (y >= 28 && y <= 35 && x >= 34 && x <= 59) return 'Littlehaven Beach';
  if (y >= 29 && y <= 55 && x >= 22 && x <= 35) return 'Town Centre';
  if (y >= 40 && y <= 55 && x >= 20 && x <= 37) return 'West Shields';
  return 'South Shields';
}

// NPC spawn points (x, y per zone)
const SPAWN_POINTS = {
  PIER:     [{ x:55, y:16 }, { x:56, y:20 }],
  MARKET:   [{ x:27, y:33 }, { x:29, y:33 }],
  ARBEIA:   [{ x:11, y:43 }, { x:13, y:45 }],
  BEACH:    [{ x:38, y:25 }, { x:45, y:24 }, { x:50, y:24 }],
  COLLIERY: [{ x:43, y:47 }],
  TOWN:     [{ x:22, y:31 }, { x:25, y:32 }],
};

// Player start
const PLAYER_START = { x: 42, y: 28 }; // on the beach
