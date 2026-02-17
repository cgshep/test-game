/* ===================================================
   CHARACTER3D — Procedural 3D humanoid models
   Built from Three.js BoxGeometry / CylinderGeometry
   Animated walk, idle, attack cycles.
   =================================================== */

// ---- Canvas texture helper for name labels ----
function makeNameSprite(name, hostile) {
  const canvas = document.createElement('canvas');
  canvas.width  = 192;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textAlign = 'center';
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 192, 36);
  // Text
  ctx.fillStyle = hostile ? '#ff8888' : '#f0e090';
  ctx.fillText(name, 96, 24);
  const tex  = new THREE.CanvasTexture(canvas);
  const mat  = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.0, 0.45, 1);
  return sprite;
}

// ---- HP bar sprite ----
function makeHpBarSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 8;
  const mat  = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5, 0.18, 1);
  sprite.userData.canvas = canvas;
  return sprite;
}

function updateHpBar(sprite, hp, maxHp) {
  const canvas = sprite.userData.canvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 8);
  ctx.fillStyle = '#300000';
  ctx.fillRect(0, 0, 64, 8);
  const frac = Math.max(0, hp / maxHp);
  ctx.fillStyle = frac > 0.5 ? '#22cc22' : frac > 0.25 ? '#cccc22' : '#cc2222';
  ctx.fillRect(1, 1, Math.floor(62 * frac), 6);
  sprite.material.map.needsUpdate = true;
}

// ---- Main Character class ----
class Character3D {
  constructor(scene, options = {}) {
    const {
      name     = 'Unknown',
      hostile  = false,
      showName = true,
      type     = 'human',   // 'human' | 'ghost' | 'goblin' | 'seagull' | 'bird'
      scale    = 1.0,
      // human appearance
      skinColor = 0xFFCBAD,
      hairColor = 0x3a2010,
      bodyColor = 0x3a5080,
      legsColor = 0x282828,
      bootColor = 0x1a1008,
    } = options;

    this.scene   = scene;
    this.group   = new THREE.Group();
    this.walkTime = 0;
    this.attackTimer = 0;
    this.isMoving   = false;
    this.type       = type;

    // Limb references for animation
    this.leftArm  = null;
    this.rightArm = null;
    this.leftLeg  = null;
    this.rightLeg = null;
    this.headGroup = null;
    this.torso    = null;

    // Build body
    switch (type) {
      case 'ghost':   this._buildGhost(skinColor, bodyColor);       break;
      case 'goblin':  this._buildGoblin(skinColor, bodyColor);      break;
      case 'seagull': this._buildSeagull();                         break;
      default:        this._buildHuman(skinColor, hairColor, bodyColor, legsColor, bootColor);
    }

    // Name label
    if (showName) {
      this.nameSprite = makeNameSprite(name, hostile);
      this.nameSprite.position.y = 2.6;
      this.group.add(this.nameSprite);
    }

    // HP bar
    this.hpSprite = makeHpBarSprite();
    this.hpSprite.position.y = 2.2;
    this.group.add(this.hpSprite);
    updateHpBar(this.hpSprite, 1, 1);

    this.group.scale.setScalar(scale);
    scene.add(this.group);
  }

  // ---- Human body ----
  _buildHuman(skinC, hairC, bodyC, legsC, bootC) {
    const B = (w,h,d) => new THREE.BoxGeometry(w, h, d);
    const C = (rt, rb, h, segs=8) => new THREE.CylinderGeometry(rt, rb, h, segs);
    const lam = c => new THREE.MeshLambertMaterial({ color: c });
    const phg = (c, s=0x111111, sh=20) => new THREE.MeshPhongMaterial({ color:c, specular:s, shininess:sh });

    // HEAD
    this.headGroup = new THREE.Group();
    // Head block
    const headMesh = new THREE.Mesh(B(0.42, 0.42, 0.42), phg(skinC, 0x221108, 8));
    this.headGroup.add(headMesh);
    // Hair cap
    const hair = new THREE.Mesh(B(0.44, 0.18, 0.44), lam(hairC));
    hair.position.y = 0.15;
    this.headGroup.add(hair);
    // Eyes
    const eyeGeo = B(0.07, 0.07, 0.02);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x101820 });
    const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(B(0.1, 0.09, 0.02), eyeWhiteMat);
      white.position.set(side * 0.12, 0.04, 0.22);
      this.headGroup.add(white);
      const pupil = new THREE.Mesh(eyeGeo, eyeMat);
      pupil.position.set(side * 0.12, 0.04, 0.235);
      this.headGroup.add(pupil);
    }
    // Mouth
    const mouth = new THREE.Mesh(B(0.14, 0.03, 0.02), lam(0x903030));
    mouth.position.set(0, -0.09, 0.22);
    this.headGroup.add(mouth);
    // Eyebrows
    const brow = new THREE.Mesh(B(0.3, 0.035, 0.02), lam(hairC));
    brow.position.set(0, 0.13, 0.215);
    this.headGroup.add(brow);

    this.headGroup.position.y = 1.48;
    this.group.add(this.headGroup);

    // NECK
    const neck = new THREE.Mesh(C(0.09, 0.11, 0.16), lam(skinC));
    neck.position.y = 1.2;
    this.group.add(neck);

    // TORSO
    this.torso = new THREE.Mesh(B(0.54, 0.68, 0.32), phg(bodyC, 0x080808, 5));
    this.torso.position.y = 0.84;
    this.group.add(this.torso);
    // Belt
    const belt = new THREE.Mesh(B(0.56, 0.09, 0.34), lam(legsC));
    belt.position.y = 0.54;
    this.group.add(belt);
    // Belt buckle
    const buckle = new THREE.Mesh(B(0.1, 0.1, 0.02), lam(0xc8a020));
    buckle.position.set(0, 0.54, 0.185);
    this.group.add(buckle);

    // ARMS (each as Group with pivot at shoulder top)
    const _makeArm = (side) => {
      const armG = new THREE.Group();
      // Upper arm
      const upper = new THREE.Mesh(B(0.21, 0.48, 0.22), phg(bodyC, 0x080808, 4));
      upper.position.y = -0.24;
      armG.add(upper);
      // Elbow joint
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), lam(bodyC));
      elbow.position.y = -0.5;
      armG.add(elbow);
      // Forearm
      const fore = new THREE.Mesh(B(0.18, 0.44, 0.19), lam(skinC));
      fore.position.y = -0.76;
      armG.add(fore);
      // Hand
      const hand = new THREE.Mesh(B(0.17, 0.15, 0.14), lam(skinC));
      hand.position.y = -1.02;
      armG.add(hand);
      armG.position.set(side * 0.4, 1.12, 0);
      return armG;
    };
    this.leftArm  = _makeArm(-1);
    this.rightArm = _makeArm( 1);
    this.group.add(this.leftArm, this.rightArm);

    // LEGS (pivot at hip top)
    const _makeLeg = (side) => {
      const legG = new THREE.Group();
      // Thigh
      const thigh = new THREE.Mesh(B(0.26, 0.5, 0.26), phg(legsC, 0x080808, 3));
      thigh.position.y = -0.25;
      legG.add(thigh);
      // Knee
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5), lam(legsC));
      knee.position.y = -0.52;
      legG.add(knee);
      // Shin
      const shin = new THREE.Mesh(B(0.22, 0.48, 0.23), lam(legsC));
      shin.position.y = -0.78;
      legG.add(shin);
      // Boot
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.38), lam(bootC));
      boot.position.set(0, -1.08, 0.06);
      legG.add(boot);
      legG.position.set(side * 0.15, 0.54, 0);
      return legG;
    };
    this.leftLeg  = _makeLeg(-1);
    this.rightLeg = _makeLeg( 1);
    this.group.add(this.leftLeg, this.rightLeg);
  }

  // ---- Ghost ----
  _buildGhost(skinC, bodyC) {
    const mat = new THREE.MeshPhongMaterial({
      color: 0xb8a8e0,
      emissive: new THREE.Color(0.06, 0.04, 0.15),
      transparent: true,
      opacity: 0.75,
      specular: 0x8888cc,
      shininess: 40,
    });

    // Main ghost body (teardrop-ish using scaled sphere)
    this.headGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat);
    body.scale.y = 1.6;
    body.position.y = 0.9;
    this.group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mat);
    head.position.y = 1.7;
    this.headGroup.add(head);
    // Empty eye sockets
    const eyeHole = new THREE.MeshPhongMaterial({ color: 0x220820, emissive: new THREE.Color(0.2,0,0.1), transparent: true, opacity: 0.9 });
    for (const side of [-1,1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeHole);
      eye.position.set(side * 0.14, 0.05, 0.28);
      this.headGroup.add(eye);
    }
    this.headGroup.position.y = 0;
    this.group.add(this.headGroup);

    // Wispy tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), mat);
    tail.rotation.x = Math.PI;
    tail.position.y = 0.25;
    this.group.add(tail);

    // Translucent arms
    const armMat = mat.clone();
    for (const side of [-1,1]) {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), armMat);
      arm.scale.set(1, 2.2, 1);
      arm.position.set(side * 0.62, 1.1, 0);
      this.group.add(arm);
    }
  }

  // ---- Goblin ----
  _buildGoblin(skinC, bodyC) {
    const lam = c => new THREE.MeshLambertMaterial({ color: c });
    const greenSkin = 0x487040;
    const darkGreen = 0x304828;

    // Large head
    this.headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.46), lam(greenSkin));
    this.headGroup.add(head);
    // Big ears
    for (const side of [-1,1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.18), lam(greenSkin));
      ear.position.set(side * 0.3, 0.05, 0);
      ear.rotation.z = side * 0.4;
      this.headGroup.add(ear);
    }
    // Glowing eyes
    const glowMat = new THREE.MeshPhongMaterial({ color: 0xff3300, emissive: new THREE.Color(0.5,0.1,0), shininess: 60 });
    for (const side of [-1,1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), glowMat);
      eye.position.set(side * 0.14, 0.06, 0.24);
      this.headGroup.add(eye);
    }
    // Tusks
    const tuskMat = lam(0xf0e0b0);
    for (const side of [-1,1]) {
      const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.18, 5), tuskMat);
      tusk.position.set(side * 0.1, -0.26, 0.2);
      tusk.rotation.x = -0.3;
      this.headGroup.add(tusk);
    }
    this.headGroup.position.y = 1.1;
    this.group.add(this.headGroup);

    // Squat body
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.55, 0.36), lam(darkGreen));
    this.torso.position.y = 0.65;
    this.group.add(this.torso);

    // Arms (longer than human)
    const _makeArm = (side) => {
      const g = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.52, 0.2), lam(greenSkin));
      upper.position.y = -0.26;
      g.add(upper);
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.14), lam(greenSkin));
      claw.position.y = -0.56;
      g.add(claw);
      // Claw tips
      for (const cv of [-1,0,1]) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 4), lam(0x1a1a10));
        tip.position.set(cv * 0.05, -0.68, 0.05);
        g.add(tip);
      }
      g.position.set(side * 0.38, 0.92, 0);
      return g;
    };
    this.leftArm  = _makeArm(-1);
    this.rightArm = _makeArm( 1);
    this.group.add(this.leftArm, this.rightArm);

    // Short legs
    const _makeLeg = (side) => {
      const g = new THREE.Group();
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.24), lam(darkGreen));
      leg.position.y = -0.21;
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.34), lam(0x1a2a10));
      foot.position.set(0, -0.47, 0.06);
      g.add(foot);
      g.position.set(side * 0.15, 0.42, 0);
      return g;
    };
    this.leftLeg  = _makeLeg(-1);
    this.rightLeg = _makeLeg( 1);
    this.group.add(this.leftLeg, this.rightLeg);
  }

  // ---- Seagull ----
  _buildSeagull() {
    const white = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const grey  = new THREE.MeshLambertMaterial({ color: 0xa0a8b0 });
    const black = new THREE.MeshLambertMaterial({ color: 0x202028 });
    const beak  = new THREE.MeshLambertMaterial({ color: 0xf0a020 });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), white);
    body.scale.set(1, 0.7, 1.6);
    body.position.y = 0.5;
    this.group.add(body);

    // Head
    this.headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), white);
    this.headGroup.add(head);
    const beakMesh = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 5), beak);
    beakMesh.rotation.z = -Math.PI / 2;
    beakMesh.position.set(0.22, 0, 0.06);
    this.headGroup.add(beakMesh);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x080808 });
    for (const side of [-1,1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), eyeMat);
      eye.position.set(side * 0.15, 0.04, 0.15);
      this.headGroup.add(eye);
    }
    this.headGroup.position.set(0.22, 0.72, 0.24);
    this.group.add(this.headGroup);

    // Wings (pivot for flap animation)
    const _makeWing = (side) => {
      const g = new THREE.Group();
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.28), side > 0 ? white : grey);
      wing.position.x = side * 0.3;
      g.add(wing);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.18), black);
      tip.position.set(side * 0.65, 0, 0.02);
      g.add(tip);
      g.position.set(0, 0.5, 0);
      return g;
    };
    this.leftArm  = _makeWing(-1);
    this.rightArm = _makeWing( 1);
    this.group.add(this.leftArm, this.rightArm);

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.22), white);
    tail.position.set(0, 0.44, -0.4);
    this.group.add(tail);

    // Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0xf09040 });
    for (const side of [-1,1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 4), legMat);
      leg.position.set(side * 0.08, 0.26, 0.1);
      this.group.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.12), legMat);
      foot.position.set(side * 0.08, 0.12, 0.14);
      this.group.add(foot);
    }
  }

  // ---- Animation update ----
  update(dt, isMoving) {
    this.walkTime += dt;
    this.isMoving = isMoving;

    if (this.type === 'seagull') {
      this._animateSeagull(dt, isMoving);
      return;
    }
    if (this.type === 'ghost') {
      this._animateGhost(dt, isMoving);
      return;
    }

    const t = this.walkTime;

    if (isMoving) {
      const swing = Math.sin(t * 5.5) * 0.65;
      if (this.leftArm)  this.leftArm.rotation.x  =  swing;
      if (this.rightArm) this.rightArm.rotation.x = -swing;
      if (this.leftLeg)  this.leftLeg.rotation.x  = -swing * 0.7;
      if (this.rightLeg) this.rightLeg.rotation.x =  swing * 0.7;
      // Walk bob
      this.group.position.y = Math.abs(Math.sin(t * 5.5)) * 0.06;
    } else {
      // Idle: gentle sway and breathing
      const idle = Math.sin(t * 1.1) * 0.04;
      if (this.leftArm)  this.leftArm.rotation.x  *= 0.85;
      if (this.rightArm) this.rightArm.rotation.x *= 0.85;
      if (this.leftLeg)  this.leftLeg.rotation.x  *= 0.85;
      if (this.rightLeg) this.rightLeg.rotation.x *= 0.85;
      if (this.torso) this.torso.scale.y = 1 + Math.sin(t * 0.9) * 0.018;
      if (this.headGroup) this.headGroup.rotation.y = Math.sin(t * 0.4) * 0.08;
      this.group.position.y = idle;
    }
  }

  _animateGhost(dt, isMoving) {
    const t = this.walkTime;
    // Floating bob
    this.group.position.y = Math.sin(t * 1.5) * 0.15 + 0.2;
    // Gentle rotation
    if (this.headGroup) {
      this.headGroup.rotation.y = Math.sin(t * 0.6) * 0.15;
    }
    // Wispy arm wave
    if (this.leftArm)  this.leftArm.rotation.z  = Math.sin(t * 1.2) * 0.3 + 0.2;
    if (this.rightArm) this.rightArm.rotation.z = Math.sin(t * 1.4 + 1) * 0.3 - 0.2;
    if (isMoving) {
      this.group.position.y += Math.sin(t * 4) * 0.08;
    }
  }

  _animateSeagull(dt, isMoving) {
    const t = this.walkTime;
    // Wing flap
    const flap = isMoving ? Math.sin(t * 8) * 0.6 : Math.sin(t * 2.5) * 0.2;
    if (this.leftArm)  this.leftArm.rotation.z  = -flap;
    if (this.rightArm) this.rightArm.rotation.z  = flap;
    if (isMoving) {
      this.group.position.y = Math.sin(t * 4) * 0.12 + 0.3;
    } else {
      this.group.position.y = 0;
    }
  }

  // ---- Attack flash ----
  triggerAttack() {
    this.attackTimer = 0.5;
    if (this.rightArm) {
      this.rightArm.rotation.x = -1.4;
    }
  }

  // ---- Position / rotation ----
  setPosition(wx, wy, wz) {
    // Position anchors to feet (base y)
    this.group.position.x = wx;
    this.group.position.z = wz;
    this.baseY = wy;
    // Y is managed by animation
    if (this.group.position.y === undefined) this.group.position.y = wy;
  }

  faceToward(wx, wz) {
    const dx = wx - this.group.position.x;
    const dz = wz - this.group.position.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  setHp(hp, maxHp) {
    if (this.hpSprite) updateHpBar(this.hpSprite, hp, maxHp);
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
      if (o.isSprite) {
        o.material.map.dispose();
        o.material.dispose();
      }
    });
  }
}
