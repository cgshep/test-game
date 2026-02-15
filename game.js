import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const viewport = document.getElementById("viewport");
const questText = document.getElementById("questText");
const inventoryEl = document.getElementById("inventory");
const statEls = {
  fishing: document.getElementById("fishing"),
  crafting: document.getElementById("crafting"),
  foraging: document.getElementById("foraging"),
  renown: document.getElementById("renown"),
};

const world = { width: 260, depth: 180 };
const keyState = new Set();
const clock = new THREE.Clock();

const state = {
  fishing: 1,
  crafting: 1,
  foraging: 1,
  renown: 0,
  inventory: [],
  gathered: new Set(),
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8cc5e6, 90, 340);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
camera.position.set(0, 15, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xa6ddff, 0x31593a, 1.05);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1cb, 1.4);
sun.position.set(70, 95, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 140;
sun.shadow.camera.bottom = -140;
scene.add(sun);

const skyGeo = new THREE.SphereGeometry(650, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({ color: 0x94d7ff, side: THREE.BackSide });
scene.add(new THREE.Mesh(skyGeo, skyMat));

const terrain = new THREE.Mesh(
  new THREE.PlaneGeometry(world.width, world.depth, 120, 100),
  new THREE.MeshStandardMaterial({ color: 0x74b06e, roughness: 0.95, metalness: 0.02 }),
);
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
scene.add(terrain);

const beach = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 160),
  new THREE.MeshStandardMaterial({ color: 0xd8c18a, roughness: 0.9 }),
);
beach.rotation.x = -Math.PI / 2;
beach.position.set(-78, 0.02, 0);
beach.receiveShadow = true;
scene.add(beach);

const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 190, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x307bb0, transparent: true, opacity: 0.9, roughness: 0.2, metalness: 0.12 }),
);
sea.rotation.x = -Math.PI / 2;
sea.position.set(-128, -0.2, 0);
scene.add(sea);

const cliff = new THREE.Mesh(
  new THREE.BoxGeometry(52, 17, 85),
  new THREE.MeshStandardMaterial({ color: 0x5d7f55, roughness: 1 }),
);
cliff.position.set(15, 8.5, 48);
cliff.castShadow = true;
cliff.receiveShadow = true;
scene.add(cliff);

const path = new THREE.Mesh(
  new THREE.PlaneGeometry(9, 95),
  new THREE.MeshStandardMaterial({ color: 0x97a796, roughness: 1 }),
);
path.rotation.x = -Math.PI / 2;
path.position.set(28, 0.03, 26);
scene.add(path);

function createMarketStall(x, z) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(7, 4, 5),
    new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.85 }),
  );
  base.position.y = 2;
  base.castShadow = true;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(5.2, 2.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xaa3648, roughness: 0.65 }),
  );
  roof.position.y = 5.2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(base, roof);
  group.position.set(x, 0, z);
  scene.add(group);
}

for (let i = 0; i < 6; i += 1) {
  createMarketStall(75 + (i % 3) * 14, -35 + Math.floor(i / 3) * 18);
}

function createLighthouse() {
  const lighthouse = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 6.3, 26, 18),
    new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.7 }),
  );
  tower.position.y = 13;
  tower.castShadow = true;
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 4.5, 4, 16),
    new THREE.MeshStandardMaterial({ color: 0x2d3f5b, roughness: 0.5 }),
  );
  top.position.y = 27;
  top.castShadow = true;
  lighthouse.add(tower, top);
  lighthouse.position.set(-10, 0, -68);
  scene.add(lighthouse);
}
createLighthouse();

function plantTuft(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x4f3a23, roughness: 1 }),
  );
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e6c3e, roughness: 0.95 }),
  );
  trunk.position.set(x, 3, z);
  crown.position.set(x, 8, z);
  trunk.castShadow = true;
  crown.castShadow = true;
  scene.add(trunk, crown);
}
for (let i = 0; i < 28; i += 1) {
  plantTuft(
    THREE.MathUtils.randFloatSpread(160) + 20,
    THREE.MathUtils.randFloatSpread(160),
  );
}

const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(1.2, 2.6, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xf6e0a1, roughness: 0.65 }),
);
player.castShadow = true;
player.position.set(25, 2.3, 18);
scene.add(player);

const gatherables = [
  { id: "driftwood", name: "Driftwood", x: -73, z: 26, color: 0x77573a, skill: "crafting" },
  { id: "sea_glass", name: "Sea Glass", x: -67, z: -18, color: 0x6ce6d4, skill: "foraging" },
  { id: "market_spices", name: "Market Spices", x: 85, z: -26, color: 0x87c85c, skill: "foraging" },
  { id: "mackerel", name: "Mackerel", x: -103, z: 58, color: 0xa8d6ea, skill: "fishing" },
];

gatherables.forEach((item) => {
  const node = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 0),
    new THREE.MeshStandardMaterial({ color: item.color, emissive: item.color, emissiveIntensity: 0.22, roughness: 0.4 }),
  );
  node.position.set(item.x, 2.1, item.z);
  node.castShadow = true;
  item.mesh = node;
  scene.add(node);
});

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener("resize", resize);
resize();

function refreshHud() {
  statEls.fishing.textContent = state.fishing;
  statEls.crafting.textContent = state.crafting;
  statEls.foraging.textContent = state.foraging;
  statEls.renown.textContent = state.renown;

  inventoryEl.innerHTML = "";
  if (state.inventory.length === 0) {
    inventoryEl.innerHTML = "<li>Empty satchel</li>";
    return;
  }

  state.inventory.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    inventoryEl.append(li);
  });
}

function tryGather() {
  let best = null;
  let bestDist = Infinity;

  gatherables.forEach((node) => {
    if (state.gathered.has(node.id)) return;
    const d = player.position.distanceTo(node.mesh.position);
    if (d < bestDist) {
      best = node;
      bestDist = d;
    }
  });

  if (!best || bestDist > 8) {
    questText.textContent = "No materials nearby. Search the beach, market, and pier.";
    return;
  }

  state.gathered.add(best.id);
  state.inventory.push(best.name);
  state[best.skill] += 1;
  state.renown += 4;
  best.mesh.material.color.setHex(0x54606e);
  best.mesh.material.emissive.setHex(0x21252a);

  const essentials = ["driftwood", "sea_glass", "market_spices"];
  const done = essentials.every((id) => state.gathered.has(id));
  questText.textContent = done
    ? "Quest complete! South Shields hails you as Keeper of the Tides."
    : `Collected ${best.name}. Track down the remaining quest materials.`;

  refreshHud();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === " ") {
    tryGather();
    return;
  }
  keyState.add(key);
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keyState.delete(key);
});

function updatePlayer(delta) {
  const speed = 24 * delta;
  let moveX = 0;
  let moveZ = 0;

  if (keyState.has("w") || keyState.has("ArrowUp")) moveZ -= speed;
  if (keyState.has("s") || keyState.has("ArrowDown")) moveZ += speed;
  if (keyState.has("a") || keyState.has("ArrowLeft")) moveX -= speed;
  if (keyState.has("d") || keyState.has("ArrowRight")) moveX += speed;

  player.position.x = THREE.MathUtils.clamp(player.position.x + moveX, -118, 118);
  player.position.z = THREE.MathUtils.clamp(player.position.z + moveZ, -84, 84);

  if (moveX !== 0 || moveZ !== 0) {
    const angle = Math.atan2(moveX, moveZ);
    player.rotation.y = angle;
  }
}

function updateCamera() {
  const followOffset = new THREE.Vector3(0, 16, 25);
  const targetPos = player.position.clone().add(followOffset);
  camera.position.lerp(targetPos, 0.08);
  camera.lookAt(player.position.x, player.position.y + 2, player.position.z - 4);
}

function animate() {
  const delta = clock.getDelta();
  sea.position.y = -0.2 + Math.sin(clock.elapsedTime * 1.8) * 0.08;

  gatherables.forEach((node, i) => {
    if (state.gathered.has(node.id)) return;
    node.mesh.rotation.y += delta * 0.9;
    node.mesh.position.y = 2.1 + Math.sin(clock.elapsedTime * 1.8 + i) * 0.28;
  });

  updatePlayer(delta);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

refreshHud();
animate();
