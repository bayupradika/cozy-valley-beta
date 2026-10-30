import * as THREE from 'three';

const matCache = new Map();

export function getMat(color, roughness = 0.85, emissive = 0x000000) {
  const key = `${color}_${roughness}_${emissive}`;
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness: 0.05,
        emissive: new THREE.Color(emissive)
      })
    );
  }
  return matCache.get(key);
}

// Membuat label nama melayang di atas karakter (Canvas Sprite 2D di ruang 3D)
export function createNameTag(text, subColor = '#ffe082') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(20, 15, 10, 0.72)';
  ctx.beginPath();
  ctx.roundRect(18, 12, 220, 40, 14);
  ctx.fill();
  ctx.strokeStyle = subColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = 'bold 24px Segoe UI, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.set(0, 1.55, 0);
  return sprite;
}

// Membuat model karakter Chibi 2.5D yang bisa dikustomisasi penuh
export function buildCharacterMesh(appearance, labelText = '') {
  const root = new THREE.Group();

  const pantsMat = new THREE.MeshStandardMaterial({ color: appearance.pants || '#1d3557', roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: appearance.shirt || '#e63946', roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: appearance.skin || '#f1c27d', roughness: 0.75 });
  const hatMat = new THREE.MeshStandardMaterial({ color: appearance.hatColor || '#e9c46a', roughness: 0.75 });
  const eyeMat = getMat(0x1b1b1b, 0.4);

  // Kaki kiri & kanan
  const legGeo = new THREE.BoxGeometry(0.17, 0.28, 0.18);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.1, 0.14, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.1, 0.14, 0);
  rightLeg.castShadow = true;

  // Badan
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.26), shirtMat);
  body.position.set(0, 0.46, 0);
  body.castShadow = true;

  // Tangan kiri & kanan
  const armGeo = new THREE.BoxGeometry(0.13, 0.34, 0.14);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.28, 0.46, 0);
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.28, 0.46, 0);
  rightArm.castShadow = true;

  // Kepala
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.42), skinMat);
  head.position.set(0, 0.89, 0);
  head.castShadow = true;

  // Mata (menghadap +Z)
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.03);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 0.9, 0.21);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 0.9, 0.21);

  // Grup Topi / Rambut
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 1.11, 0);
  populateHat(hatGroup, appearance.hat || 'straw', hatMat);

  root.add(leftLeg, rightLeg, body, leftArm, rightArm, head, eyeL, eyeR, hatGroup);

  let nameSprite = null;
  if (labelText) {
    nameSprite = createNameTag(labelText);
    root.add(nameSprite);
  }

  root.userData = {
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    body,
    head,
    hatGroup,
    pantsMat,
    shirtMat,
    skinMat,
    hatMat,
    nameSprite
  };

  return root;
}

export function populateHat(hatGroup, hatType, hatMat) {
  while (hatGroup.children.length) {
    hatGroup.remove(hatGroup.children[0]);
  }
  if (hatType === 'straw') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.06, 12), hatMat);
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.16, 12), hatMat);
    dome.position.y = 0.1;
    brim.castShadow = true;
    hatGroup.add(brim, dome);
  } else if (hatType === 'cap') {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), hatMat);
    crown.position.y = 0.04;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.2), hatMat);
    visor.position.set(0, 0.0, 0.28);
    hatGroup.add(crown, visor);
  } else if (hatType === 'hair') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.48), hatMat);
    top.position.y = 0.03;
    const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), hatMat);
    tuft.position.set(0, 0.13, 0.08);
    tuft.rotation.z = 0.3;
    hatGroup.add(top, tuft);
  }
}

export function updateCharacterAppearance(mesh, appearance, playerName) {
  const u = mesh.userData;
  u.skinMat.color.set(appearance.skin);
  u.shirtMat.color.set(appearance.shirt);
  u.pantsMat.color.set(appearance.pants);
  u.hatMat.color.set(appearance.hatColor);
  populateHat(u.hatGroup, appearance.hat, u.hatMat);

  if (playerName) {
    if (u.nameSprite) mesh.remove(u.nameSprite);
    u.nameSprite = createNameTag(playerName, '#9de070');
    mesh.add(u.nameSprite);
  }
}

// Objek Pohon
export function createTreeMesh() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 7), getMat(0x7f5539));
  trunk.position.y = 0.35;
  trunk.castShadow = true;

  const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.9, 8), getMat(0x386641));
  foliage1.position.y = 0.95;
  foliage1.castShadow = true;

  const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.75, 8), getMat(0x6a994e));
  foliage2.position.y = 1.4;
  foliage2.castShadow = true;

  g.add(trunk, foliage1, foliage2);
  return g;
}

// Objek Batu & Bijih Tambang
export function createRockMesh(rockKind = 'stone') {
  const g = new THREE.Group();
  const baseColor = rockKind === 'gold' ? 0x6c757d : rockKind === 'copper' ? 0x5c677d : 0x7d8597;
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), getMat(baseColor, 0.9));
  rock.position.y = 0.32;
  rock.scale.set(1, 0.82, 1);
  rock.castShadow = true;
  g.add(rock);

  if (rockKind === 'copper' || rockKind === 'gold') {
    const oreColor = rockKind === 'gold' ? 0xffbe0b : 0xfb8500;
    const emissive = rockKind === 'gold' ? 0x553800 : 0x331500;
    const oreMat = getMat(oreColor, 0.4, emissive);
    for (let i = 0; i < 4; i++) {
      const nugget = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), oreMat);
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      nugget.position.set(Math.cos(angle) * 0.26, 0.36 + (i % 2) * 0.1, Math.sin(angle) * 0.26);
      nugget.rotation.set(0.5, angle, 0.3);
      g.add(nugget);
    }
  }
  return g;
}

// Tanaman sesuai tahap tumbuh (0 = benih, 1 = tunas, 2 = siap panen)
export function createCropMesh(cropDef, stageRatio) {
  const g = new THREE.Group();
  if (stageRatio < 0.45) {
    // Benih kecil
    for (let i = -1; i <= 1; i += 2) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), getMat(0xc9ada7));
      s.position.set(i * 0.14, 0.08, i * 0.08);
      g.add(s);
    }
  } else if (stageRatio < 1) {
    // Tunas hijau
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.32, 6), getMat(cropDef.leafColor));
    stem.position.y = 0.16;
    const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.12), getMat(cropDef.leafColor));
    leaf1.position.y = 0.28;
    leaf1.rotation.z = 0.25;
    g.add(stem, leaf1);
  } else {
    // Siap panen!
    const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.32, 7), getMat(cropDef.leafColor));
    bush.position.y = 0.16;
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      getMat(cropDef.color, 0.5, 0x1a0f00)
    );
    fruit.position.y = 0.38;
    fruit.castShadow = true;
    g.add(bush, fruit);
  }
  return g;
}

// Objek hasil Crafting yang ditaruh di tanah
export function createPlacedObjectMesh(placeType) {
  const g = new THREE.Group();
  if (placeType === 'fence') {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), getMat(0x9c6644));
    p1.position.set(-0.32, 0.32, 0);
    const p2 = p1.clone();
    p2.position.set(0.32, 0.32, 0);
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.08), getMat(0xb08968));
    rail1.position.set(0, 0.46, 0);
    const rail2 = rail1.clone();
    rail2.position.set(0, 0.24, 0);
    p1.castShadow = p2.castShadow = true;
    g.add(p1, p2, rail1, rail2);
  } else if (placeType === 'lamp') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.95, 6), getMat(0x343a40));
    pole.position.y = 0.47;
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), getMat(0xffd166, 0.3, 0xff9f1c));
    bulb.position.y = 1.02;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), getMat(0x212529));
    roof.position.y = 1.22;
    roof.rotation.y = Math.PI / 4;
    const light = new THREE.PointLight(0xffb703, 1.4, 5.5);
    light.position.y = 1.05;
    g.add(pole, bulb, roof, light);
  } else if (placeType === 'sprinkler') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 8), getMat(0x6c757d, 0.5));
    base.position.y = 0.08;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8), getMat(0xfb8500, 0.4));
    neck.position.y = 0.24;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.08), getMat(0xffbe0b, 0.3));
    bar.position.y = 0.36;
    g.add(base, neck, bar);
    g.userData.spinPart = bar;
  } else if (placeType === 'path') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.92), getMat(0xadb5bd, 0.9));
    slab.position.y = 0.025;
    slab.receiveShadow = true;
    g.add(slab);
  }
  return g;
}

// Rumah Petani & Shipping Bin & Kios Toko
export function createHouseMesh() {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2.2), getMat(0xfae1dd));
  walls.position.y = 0.85;
  walls.castShadow = true;
  walls.receiveShadow = true;

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.25, 4), getMat(0xbc4749));
  roof.position.y = 2.3;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.08), getMat(0x7f4f24));
  door.position.set(0, 0.48, 1.11);

  const sign = createNameTag('🏠 Rumah (Tidur: E)', '#90be6d');
  sign.position.set(0, 3.1, 0.5);

  g.add(walls, roof, door, sign);
  return g;
}

export function createShippingBinMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.65), getMat(0x9c6644));
  box.position.y = 0.3;
  box.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.7), getMat(0x7f4f24));
  lid.position.y = 0.64;
  const tag = createNameTag('📦 Jual Hasil (E)', '#ffd166');
  tag.position.set(0, 1.35, 0);
  g.add(box, lid, tag);
  return g;
}

export function createShopStallMesh() {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 0.9), getMat(0xb08968));
  counter.position.y = 0.32;
  counter.castShadow = true;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.2), getMat(0xe63946));
  canopy.position.y = 1.55;
  canopy.castShadow = true;
  for (const sx of [-0.82, 0.82]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), getMat(0x7f4f24));
    post.position.set(sx, 0.75, -0.35);
    g.add(post);
  }
  const tag = createNameTag('🏪 Toko Bibit Pak Budi', '#ffd166');
  tag.position.set(0, 2.15, 0);
  g.add(counter, canopy, tag);
  return g;
}
