const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const questText = document.getElementById("questText");
const statEls = {
  fishing: document.getElementById("fishing"),
  crafting: document.getElementById("crafting"),
  foraging: document.getElementById("foraging"),
  renown: document.getElementById("renown"),
};
const inventoryList = document.getElementById("inventoryList");

const player = {
  x: 480,
  y: 400,
  speed: 2.8,
  size: 14,
  color: "#fee08b",
};

const state = {
  fishing: 1,
  crafting: 1,
  foraging: 1,
  renown: 0,
  inventory: [],
  gatheredNodes: new Set(),
  questProgress: 0,
};

const keys = new Set();

const zones = [
  {
    id: "sandhaven",
    name: "Sandhaven Beach",
    x: 0,
    y: 240,
    w: 360,
    h: 360,
    color: "#d9be7f",
    details: "Golden shoreline with wave foam and fishing spots.",
  },
  {
    id: "leas",
    name: "The Leas",
    x: 360,
    y: 220,
    w: 290,
    h: 380,
    color: "#6da86d",
    details: "Windy green cliffs and old stone pathways.",
  },
  {
    id: "market",
    name: "South Shields Market",
    x: 650,
    y: 250,
    w: 310,
    h: 350,
    color: "#8e6760",
    details: "Lantern stalls, herbs, and local chatter.",
  },
  {
    id: "pier",
    name: "Herd Groyne Pier",
    x: 180,
    y: 170,
    w: 170,
    h: 70,
    color: "#5a6e85",
    details: "Rocky pier stretching into the North Sea.",
  },
];

const nodes = [
  {
    id: "driftwood",
    label: "Driftwood",
    x: 130,
    y: 470,
    zone: "sandhaven",
    color: "#7e5b3f",
    reward: "crafting",
  },
  {
    id: "sea_glass",
    label: "Sea Glass",
    x: 280,
    y: 530,
    zone: "sandhaven",
    color: "#7de3d8",
    reward: "foraging",
  },
  {
    id: "mackerel",
    label: "Mackerel",
    x: 250,
    y: 205,
    zone: "pier",
    color: "#b7d7ef",
    reward: "fishing",
  },
  {
    id: "market_herbs",
    label: "Market Herbs",
    x: 850,
    y: 500,
    zone: "market",
    color: "#5ec869",
    reward: "foraging",
  },
];

function drawSkyAndSea() {
  const sky = ctx.createLinearGradient(0, 0, 0, 230);
  sky.addColorStop(0, "#8fd4ff");
  sky.addColorStop(1, "#d7f1ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, 230);

  const sea = ctx.createLinearGradient(0, 120, 0, 300);
  sea.addColorStop(0, "#529cc8");
  sea.addColorStop(1, "#2a5d89");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 140, canvas.width, 100);

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(20 + i * 110, 172 + Math.sin(i) * 8, 60, 3);
  }
}

function drawZones() {
  zones.forEach((zone) => {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    ctx.fillStyle = "rgba(8, 16, 24, 0.75)";
    ctx.font = "16px Trebuchet MS";
    ctx.fillText(zone.name, zone.x + 10, zone.y + 22);
  });

  drawLandmarks();
}

function drawLandmarks() {
  ctx.fillStyle = "#f4e1a8";
  for (let i = 0; i < 50; i += 1) {
    const x = 10 + i * 7;
    ctx.fillRect(x, 246 + Math.sin(i * 0.8) * 5, 5, 4);
  }

  ctx.strokeStyle = "#d8ead8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(385, 520);
  ctx.quadraticCurveTo(420, 430, 510, 360);
  ctx.quadraticCurveTo(560, 320, 620, 280);
  ctx.stroke();

  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = "#315739";
    const x = 410 + i * 28;
    const y = 430 - (i % 2) * 16;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 4; i += 1) {
    const sx = 700 + i * 55;
    const sy = 338 + (i % 2) * 17;
    ctx.fillStyle = "#e4cf9f";
    ctx.fillRect(sx, sy, 32, 25);
    ctx.fillStyle = "#983a46";
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy);
    ctx.lineTo(sx + 16, sy - 16);
    ctx.lineTo(sx + 34, sy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawNodes() {
  nodes.forEach((node) => {
    const collected = state.gatheredNodes.has(node.id);
    ctx.fillStyle = collected ? "#5f6d78" : node.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, collected ? 8 : 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#11202b";
    ctx.font = "14px Trebuchet MS";
    ctx.fillText(node.label, node.x + 14, node.y + 5);
  });
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 18);
  ctx.lineTo(player.x, player.y + 18);
  ctx.stroke();
}

function updatePlayer() {
  if (keys.has("ArrowUp") || keys.has("w")) player.y -= player.speed;
  if (keys.has("ArrowDown") || keys.has("s")) player.y += player.speed;
  if (keys.has("ArrowLeft") || keys.has("a")) player.x -= player.speed;
  if (keys.has("ArrowRight") || keys.has("d")) player.x += player.speed;

  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function currentZone() {
  return zones.find(
    (zone) =>
      player.x >= zone.x &&
      player.x <= zone.x + zone.w &&
      player.y >= zone.y &&
      player.y <= zone.y + zone.h,
  );
}

function tryGather() {
  const nearest = nodes.find((node) => {
    const dx = player.x - node.x;
    const dy = player.y - node.y;
    const distance = Math.hypot(dx, dy);
    return distance < 40;
  });

  if (!nearest) {
    questText.textContent = "Nothing to gather here. Search the beach, pier, or market stalls.";
    return;
  }

  if (state.gatheredNodes.has(nearest.id)) {
    questText.textContent = `${nearest.label} has already been gathered. Explore another landmark.`;
    return;
  }

  state.gatheredNodes.add(nearest.id);
  state.inventory.push(nearest.label);
  state[nearest.reward] += 1;
  state.renown += 3;
  state.questProgress += 1;

  if (state.questProgress >= 3) {
    questText.textContent = "Quest complete! South Shields celebrates your coastal mastery.";
  } else {
    questText.textContent = `Collected ${nearest.label}! Keep gathering treasures around South Shields.`;
  }

  refreshHud();
}

function refreshHud() {
  statEls.fishing.textContent = state.fishing;
  statEls.crafting.textContent = state.crafting;
  statEls.foraging.textContent = state.foraging;
  statEls.renown.textContent = state.renown;

  inventoryList.innerHTML = "";
  if (!state.inventory.length) {
    const li = document.createElement("li");
    li.textContent = "Empty satchel";
    inventoryList.appendChild(li);
    return;
  }

  state.inventory.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    inventoryList.appendChild(li);
  });
}

function render() {
  drawSkyAndSea();
  drawZones();
  drawNodes();
  drawPlayer();

  const zone = currentZone();
  if (zone) {
    ctx.fillStyle = "rgba(11, 21, 30, 0.75)";
    ctx.fillRect(14, 12, 460, 44);
    ctx.fillStyle = "#d8eeff";
    ctx.font = "18px Trebuchet MS";
    ctx.fillText(`${zone.name}: ${zone.details}`, 24, 40);
  }

  updatePlayer();
  requestAnimationFrame(render);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }

  if (key === " ") {
    tryGather();
    return;
  }

  keys.add(key);
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

refreshHud();
render();
