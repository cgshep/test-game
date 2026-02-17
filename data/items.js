/* ===================================================
   ITEM DEFINITIONS
   =================================================== */
const ITEMS = {
  // --- Resources ---
  COAL:         { id:'COAL',         name:'Coal',              icon:'⬛', desc:'Black coal from the Durham coalfield.', stackable:true,  value:5  },
  IRON_ORE:     { id:'IRON_ORE',     name:'Iron Ore',          icon:'🔴', desc:'Raw iron ore.',                        stackable:true,  value:8  },
  RAW_COD:      { id:'RAW_COD',      name:'Raw Cod',           icon:'🐟', desc:'A fresh cod from the North Sea.',      stackable:true,  value:6  },
  COOKED_COD:   { id:'COOKED_COD',   name:'Cooked Cod',        icon:'🍖', desc:'Delicious pan-fried cod.',             stackable:true,  value:12, healHp:6 },
  RAW_CRAB:     { id:'RAW_CRAB',     name:'Raw Crab',          icon:'🦀', desc:'A North Sea crab.',                   stackable:true,  value:10 },
  COOKED_CRAB:  { id:'COOKED_CRAB',  name:'Cooked Crab',       icon:'🦀', desc:'Tasty dressed crab.',                 stackable:true,  value:20, healHp:10 },
  LOGS:         { id:'LOGS',         name:'Logs',              icon:'🪵', desc:'Freshly cut timber.',                  stackable:true,  value:4  },
  OAK_LOGS:     { id:'OAK_LOGS',     name:'Oak Logs',          icon:'🪵', desc:'Sturdy oak logs.',                    stackable:true,  value:8  },
  HERBS:        { id:'HERBS',        name:'Herbs',             icon:'🌿', desc:'Wild herbs from the coastal path.',    stackable:true,  value:3  },
  SEAWEED:      { id:'SEAWEED',      name:'Seaweed',           icon:'🌊', desc:'Washed-up seaweed.',                  stackable:true,  value:1  },
  SAND_DOLLAR:  { id:'SAND_DOLLAR',  name:'Sand Dollar',       icon:'🌀', desc:'A pretty sand dollar from the beach.',stackable:true,  value:15 },
  AMBER:        { id:'AMBER',        name:'Amber',             icon:'🟡', desc:'Ancient amber washed up on the shore.',stackable:false, value:50 },

  // --- Artefacts (Arbeia/Roman) ---
  ROMAN_COIN:   { id:'ROMAN_COIN',   name:'Roman Coin',        icon:'🪙', desc:'An ancient Roman coin. It bears the face of a forgotten emperor.', stackable:true, value:30 },
  ROMAN_SHARD:  { id:'ROMAN_SHARD',  name:'Pottery Shard',     icon:'🏺', desc:'A fragment of Roman pottery from Arbeia fort.', stackable:true, value:20 },
  ROMAN_FIBULA: { id:'ROMAN_FIBULA', name:'Roman Fibula',      icon:'📎', desc:'A Roman brooch pin. Impressive find!',  stackable:false, value:80 },
  ROMAN_SWORD:  { id:'ROMAN_SWORD',  name:'Roman Gladius',     icon:'⚔️',  desc:'A short Roman sword. Still sharp!',     stackable:false, value:200,
    equip:'weapon', attack:8, def:2 },

  // --- Weapons ---
  FISTS:        { id:'FISTS',        name:'Bare Fists',        icon:'👊', desc:'Your fists. Better than nothing.',     stackable:false, equip:'weapon', attack:1,  def:0, value:0 },
  DRIFTWOOD:    { id:'DRIFTWOOD',    name:'Driftwood Club',    icon:'🪵', desc:'A bit of driftwood. Effective enough.',stackable:false, equip:'weapon', attack:3,  def:0, value:5 },
  FISHING_ROD:  { id:'FISHING_ROD',  name:'Fishing Rod',       icon:'🎣', desc:'For catching fish off the pier.',      stackable:false, equip:'tool',   attack:1,  def:0, value:20 },
  PICKAXE:      { id:'PICKAXE',      name:'Pickaxe',           icon:'⛏️',  desc:'For mining coal and ore.',             stackable:false, equip:'tool',   attack:2,  def:0, value:30 },
  AXE:          { id:'AXE',          name:'Woodcutting Axe',   icon:'🪓', desc:'For chopping trees.',                  stackable:false, equip:'tool',   attack:2,  def:0, value:25 },
  IRON_SWORD:   { id:'IRON_SWORD',   name:'Iron Sword',        icon:'🗡️',  desc:'A trusty iron sword, forge in Gateshead.',stackable:false, equip:'weapon', attack:6, def:1, value:80 },

  // --- Armour ---
  LEATHER_VEST: { id:'LEATHER_VEST', name:'Leather Vest',      icon:'🦺', desc:'Basic leather protection.',            stackable:false, equip:'armour', attack:0, def:3, value:40 },
  CHAIN_MAIL:   { id:'CHAIN_MAIL',   name:'Chain Mail',        icon:'⛓️',  desc:'Sturdy chain mail armour.',            stackable:false, equip:'armour', attack:0, def:6, value:120 },

  // --- Food ----
  STOTTIE:      { id:'STOTTIE',      name:'Stottie Cake',      icon:'🥖', desc:'A classic Geordie stottie cake. Proper tasty!', stackable:true, value:5, healHp:4 },
  PIE:          { id:'PIE',          name:'Meat Pie',          icon:'🥧', desc:'A hearty meat pie from the market.',   stackable:true,  value:10, healHp:8 },
  ALE:          { id:'ALE',          name:'Brown Ale',         icon:'🍺', desc:'A pint of Newcastle Brown. Cheers!',   stackable:true,  value:4, healHp:2 },

  // --- Currency ---
  COIN:         { id:'COIN',         name:'Coins',             icon:'🪙', desc:'Standard currency of the realm.',      stackable:true,  value:1  },
};
