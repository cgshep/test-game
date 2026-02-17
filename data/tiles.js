/* ===================================================
   TILE DEFINITIONS
   Each tile has: id, name, walkable, colour, topColour, desc
   =================================================== */
const TILES = {
  // --- Natural ---
  GRASS:      { id:'GRASS',      name:'Grass',        walkable:true,  colour:'#3a6828', topColour:'#4a8030', desc:'Lush Northern grass.' },
  SAND:       { id:'SAND',       name:'Sand',         walkable:true,  colour:'#c8a060', topColour:'#d4b070', desc:'Golden beach sand.' },
  WATER:      { id:'WATER',      name:'Water',        walkable:false, colour:'#204870', topColour:'#2a5c90', desc:'The cold North Sea.' },
  SHALLOW:    { id:'SHALLOW',    name:'Shallows',     walkable:true,  colour:'#2a5878', topColour:'#3a6888', desc:'Shallow coastal water.' },
  CLIFF:      { id:'CLIFF',      name:'Cliff',        walkable:false, colour:'#604828', topColour:'#704030', desc:'The dramatic Leas cliffs.' },
  MUD:        { id:'MUD',        name:'Mud',          walkable:true,  colour:'#6a4820', topColour:'#7a5528', desc:'Muddy riverbank.' },
  ROCK:       { id:'ROCK',       name:'Rocky ground', walkable:true,  colour:'#585858', topColour:'#686868', desc:'Rocky coastal ground.' },
  SNOW:       { id:'SNOW',       name:'Snow',         walkable:true,  colour:'#b8c8d8', topColour:'#d0e0f0', desc:'A light dusting of snow.' },

  // --- Urban ----
  COBBLE:     { id:'COBBLE',     name:'Cobblestones', walkable:true,  colour:'#5a5040', topColour:'#6a6050', desc:'Old cobblestone road.' },
  ROAD:       { id:'ROAD',       name:'Road',         walkable:true,  colour:'#484848', topColour:'#585858', desc:'A tarmac road.' },
  PAVEMENT:   { id:'PAVEMENT',   name:'Pavement',     walkable:true,  colour:'#908878', topColour:'#a09888', desc:'Grey pavement.' },
  MARKET:     { id:'MARKET',     name:'Market floor', walkable:true,  colour:'#887060', topColour:'#988070', desc:'The busy South Shields Market.' },

  // --- Buildings / Walls ---
  WALL:       { id:'WALL',       name:'Wall',         walkable:false, colour:'#7a6848', topColour:'#8a7858', desc:'A stone wall.' },
  FLOOR:      { id:'FLOOR',      name:'Floor',        walkable:true,  colour:'#8a7858', topColour:'#9a8868', desc:'A stone floor.' },
  DOOR:       { id:'DOOR',       name:'Door',         walkable:true,  colour:'#8a5020', topColour:'#a06030', desc:'A wooden door.' },
  RUINS:      { id:'RUINS',      name:'Roman ruins',  walkable:true,  colour:'#909080', topColour:'#a0a090', desc:'Ancient ruins of Arbeia Roman Fort.' },

  // --- Industry ---
  COAL:       { id:'COAL',       name:'Coal seam',    walkable:false, colour:'#282820', topColour:'#383830', desc:'A rich coal seam. You could mine this!' },
  MINESHAFT:  { id:'MINESHAFT',  name:'Mine shaft',   walkable:true,  colour:'#1a1a18', topColour:'#2a2a28', desc:'A dark mineshaft into the earth.' },
  DOCK:       { id:'DOCK',       name:'Dockside',     walkable:true,  colour:'#5a4830', topColour:'#6a5840', desc:'Old wooden dockside planks.' },
  PIER:       { id:'PIER',       name:'Pier',         walkable:true,  colour:'#6a5838', topColour:'#7a6848', desc:'The South Pier. Sea air fills your lungs.' },

  // --- Nature objects ---
  TREE:       { id:'TREE',       name:'Tree',         walkable:false, colour:'#2a5020', topColour:'#3a6828', desc:'A sturdy oak tree. You could chop this!' },
  BUSH:       { id:'BUSH',       name:'Bush',         walkable:true,  colour:'#305020', topColour:'#406030', desc:'A bramble bush.' },
  FLOWER:     { id:'FLOWER',     name:'Wildflowers',  walkable:true,  colour:'#4a6830', topColour:'#5a7840', desc:'Wildflowers blowing in the sea breeze.' },
};

// Numeric IDs for compact map storage
const T = {};
let _tid = 0;
for (const key of Object.keys(TILES)) {
  T[key] = _tid++;
  TILES[key]._num = T[key];
}
TILES._byNum = Object.values(TILES).filter(t => typeof t === 'object' && t.id);
