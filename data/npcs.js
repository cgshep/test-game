/* ===================================================
   NPC DEFINITIONS - South Shields characters
   =================================================== */
const NPC_DEFS = [
  {
    id: 'fisherman_bert',
    name: 'Fisherman Bert',
    icon: '🎣',
    colour: '#607090',
    hp: 20, maxHp: 20,
    attack: 2, defence: 1, xpReward: 0,
    hostile: false,
    dialogue: [
      { text: "Alreet pet! I've been fishin' the Tyne all me life. Nowt better than a fresh cod from these waters!", options: [
        { text: "Can you teach me to fish?", next: 'teach' },
        { text: "What's the best spot?",     next: 'spots' },
        { text: "Goodbye.",                  next: null    },
      ]},
      { id: 'teach', text: "Aye, gan down to the pier with a fishin' rod and click on the water. Mind, ye need a rod first — try the market!", options: [
        { text: "Thanks!",  next: null },
      ]},
      { id: 'spots', text: "The pier's best for cod and crab. Down by the river mouth ye might catch summat special. Watch oot for the current though!", options: [
        { text: "Cheers!", next: null },
      ]},
    ],
    loot: [],
    spawnZone: 'PIER',
    wanderRadius: 3,
  },
  {
    id: 'market_trader_gladys',
    name: 'Gladys the Trader',
    icon: '🛒',
    colour: '#907050',
    hp: 15, maxHp: 15,
    attack: 1, defence: 0, xpReward: 0,
    hostile: false,
    shop: {
      buy: [
        { item:'FISHING_ROD', price:20 },
        { item:'PICKAXE',     price:30 },
        { item:'AXE',         price:25 },
        { item:'STOTTIE',     price:5  },
        { item:'PIE',         price:10 },
        { item:'ALE',         price:4  },
        { item:'DRIFTWOOD',   price:5  },
        { item:'LEATHER_VEST',price:40 },
      ],
      sell: 'all',
    },
    dialogue: [
      { text: "Welcome to South Shields Market, pet! Best market in the North East. What can I do for ye?", options: [
        { text: "I'd like to buy something.",  next: 'shop'   },
        { text: "I'd like to sell something.", next: 'sell'   },
        { text: "What do you sell?",           next: 'info'   },
        { text: "Goodbye.",                    next: null     },
      ]},
      { id: 'shop',  text: "Right, have a look at me wares!", options: [{ text: "Close.", next: null }], openShop: true },
      { id: 'sell',  text: "Aye, I'll take owt useful off ye hands!", options: [{ text: "Close.", next: null }], openSell: true },
      { id: 'info',  text: "I've got rods, pickaxes, axes, food and armour. All crafted local, mind!", options: [{ text: "Thanks.", next: null }] },
    ],
    loot: [{ item:'COIN', qty:[5,15] }],
    spawnZone: 'MARKET',
    wanderRadius: 1,
  },
  {
    id: 'roman_soldier',
    name: 'Roman Ghost',
    icon: '👻',
    colour: '#a090c0',
    hp: 25, maxHp: 25,
    attack: 5, defence: 3, xpReward: 30,
    hostile: true,
    dialogue: [
      { text: "*The spectre turns to face ye, its hollow eyes burning with ancient fury!*", options: [
        { text: "Fight!", next: null, combat: true },
        { text: "Run!",   next: null, flee: true   },
      ]},
    ],
    loot: [
      { item:'ROMAN_COIN',   qty:[1,3],  chance:0.9 },
      { item:'ROMAN_SHARD',  qty:[1,2],  chance:0.7 },
      { item:'ROMAN_FIBULA', qty:[1,1],  chance:0.1 },
    ],
    spawnZone: 'ARBEIA',
    wanderRadius: 4,
  },
  {
    id: 'sea_goblin',
    name: 'Sea Goblin',
    icon: '👺',
    colour: '#406050',
    hp: 12, maxHp: 12,
    attack: 3, defence: 1, xpReward: 15,
    hostile: true,
    dialogue: [
      { text: "GRAAAAK! The sea goblin screeches and bares its claws!", options: [
        { text: "Fight!", next: null, combat: true },
        { text: "Run!",   next: null, flee: true   },
      ]},
    ],
    loot: [
      { item:'SEAWEED',  qty:[1,3],  chance:0.8 },
      { item:'COIN',     qty:[1,5],  chance:0.6 },
      { item:'AMBER',    qty:[1,1],  chance:0.05 },
    ],
    spawnZone: 'BEACH',
    wanderRadius: 5,
  },
  {
    id: 'pier_guard',
    name: 'Pier Guard',
    icon: '💂',
    colour: '#708060',
    hp: 30, maxHp: 30,
    attack: 6, defence: 4, xpReward: 0,
    hostile: false,
    dialogue: [
      { text: "Ayup. Keep it orderly on the pier, ye hear me? No funny business.", options: [
        { text: "Of course.",             next: null },
        { text: "What's beyond the pier?",next: 'beyond'},
      ]},
      { id: 'beyond', text: "Just the open sea, pet. And the lighthouse. Strange lights have been seen there at night, mind...", options: [
        { text: "Interesting...", next: null },
      ]},
    ],
    loot: [],
    spawnZone: 'PIER',
    wanderRadius: 2,
  },
  {
    id: 'old_miner_eddie',
    name: "Miner Eddie",
    icon: '⛏️',
    colour: '#604840',
    hp: 22, maxHp: 22,
    attack: 4, defence: 2, xpReward: 0,
    hostile: false,
    dialogue: [
      { text: "By 'eck, these pits have been runnin' since me grandfather's day. Hardest graft in the world, son.", options: [
        { text: "Can you teach me to mine?",   next: 'teach' },
        { text: "What do you find down there?",next: 'finds' },
        { text: "Goodbye.",                    next: null    },
      ]},
      { id: 'teach', text: "Get yerself a pickaxe — Gladys at the market sells 'em. Then click on any coal seam ye see. Mind yer 'ead underground!", options: [
        { text: "Thanks Eddie!", next: null },
      ]},
      { id: 'finds', text: "Mostly coal, iron. But me da once found an old Roman helmet down shaft three. Sold it for a fortune, he did!", options: [
        { text: "Fascinating.", next: null },
      ]},
    ],
    loot: [{ item:'COAL', qty:[1,3] }],
    spawnZone: 'COLLIERY',
    wanderRadius: 3,
  },
  {
    id: 'seagull',
    name: 'Seagull',
    icon: '🦅',
    colour: '#c0c0b8',
    hp: 3, maxHp: 3,
    attack: 1, defence: 0, xpReward: 2,
    hostile: true,
    dialogue: [
      { text: "SQUAAAWK! The seagull dives at your chips!", options: [
        { text: "Shoo it away!",   next: null, flee: true   },
        { text: "Defend yourself!",next: null, combat: true },
      ]},
    ],
    loot: [
      { item:'SEAWEED',    qty:[1,1], chance:0.3 },
      { item:'SAND_DOLLAR',qty:[1,1], chance:0.1 },
    ],
    spawnZone: 'BEACH',
    wanderRadius: 8,
  },
  {
    id: 'museum_curator',
    name: 'Dr. Harrison',
    icon: '🧑‍🔬',
    colour: '#607080',
    hp: 10, maxHp: 10,
    attack: 1, defence: 0, xpReward: 0,
    hostile: false,
    dialogue: [
      { text: "Ah, welcome to the site of Arbeia Roman Fort! Fascinatting place. Built by the Romans around 160 AD, you know.", options: [
        { text: "Tell me more.",                 next: 'more'  },
        { text: "Can you buy Roman artefacts?",  next: 'buy'   },
        { text: "Goodbye.",                      next: null    },
      ]},
      { id: 'more', text: "Arbeia was the supply base for Hadrian's Wall. Soldiers from all across the Empire passed through here. The ghosts still linger, I fear...", options: [
        { text: "The ghosts?!", next: 'ghost' },
        { text: "Amazing.",     next: null    },
      ]},
      { id: 'ghost', text: "Oh yes. Roman spectres haunt the ruins at night. Very bad for tourism, I'm afraid. Perhaps you could deal with a few...", options: [
        { text: "I'll try!",  next: null },
        { text: "No thanks.", next: null },
      ]},
      { id: 'buy', text: "Indeed! Bring me Roman coins, shards, or fibulae. I'll pay handsomely. Science, you understand.", options: [
        { text: "Understood!", next: null }, // TODO: open artefact shop
      ]},
    ],
    loot: [],
    spawnZone: 'ARBEIA',
    wanderRadius: 1,
  },
];
