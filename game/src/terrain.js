// Senja Lintas — the archipelago: sea, islands, runway, lighthouse, village, trees.
import { WORLD, RUNWAY, seededRandom } from './config.js';

export function groundHeightAt(x, z) {
  const dMain = Math.hypot(x, z);
  let h = 0;
  if (dMain < 780) {
    const fall = 1 - dMain / 780;
    h = Math.max(h, fall * fall * 46 + Math.sin(x * 0.011) * Math.cos(z * 0.013) * 7 * fall);
  }
  const dHill = Math.hypot(x + 420, z - 380);
  if (dHill < 300) h = Math.max(h, (1 - dHill / 300) ** 2 * 95);
  const dIsle = Math.hypot(x - 1150, z + 500);
  if (dIsle < 330) h = Math.max(h, (1 - dIsle / 330) ** 2 * 38);
  const dIsle2 = Math.hypot(x + 900, z + 1050);
  if (dIsle2 < 280) h = Math.max(h, (1 - dIsle2 / 280) ** 2 * 30);
  // Flatten the airfield plateau around the runway.
  const dField = Math.hypot(x - RUNWAY.center.x, z - RUNWAY.center.z);
  if (dField < 320) {
    const t = Math.min(1, Math.max(0, (dField - 230) / 90));
    h = 2.2 * (1 - t) + h * t;
  }
  return h;
}

function buildIslandGeometry() {
  const geo = new THREE.PlaneGeometry(3600, 3600, 110, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const sand = new THREE.Color(0xe8cf9a);
  const grass = new THREE.Color(0x5da24e);
  const terrace = new THREE.Color(0x8fbf5a);
  const rock = new THREE.Color(0x8a7a68);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = groundHeightAt(x, z);
    pos.setY(i, h - 1.2);
    if (h < 1.6) c.copy(sand);
    else if (h > 42) c.copy(rock);
    else if (Math.sin(x * 0.02) > 0.4 && h < 26) c.copy(terrace);
    else c.copy(grass);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildRunway() {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.length, 0.5, RUNWAY.width),
    new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.95 }),
  );
  strip.position.set(RUNWAY.center.x, 2.45, RUNWAY.center.z);
  group.add(strip);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5f2e8 });
  for (let i = -8; i <= 8; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 1.6), lineMat);
    dash.position.set(RUNWAY.center.x + i * 24, 2.75, RUNWAY.center.z);
    group.add(dash);
  }
  const lightGeo = new THREE.SphereGeometry(0.55, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  for (let i = -9; i <= 9; i++) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(lightGeo, lightMat);
      lamp.position.set(RUNWAY.center.x + i * 23, 3.1, RUNWAY.center.z + side * (RUNWAY.width / 2 + 1.5));
      group.add(lamp);
    }
  }
  return group;
}

function buildLighthouse() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd94f3d, roughness: 0.7 });
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - i * 0.45, 5 - i * 0.45, 7, 14), i % 2 ? red : white);
    seg.position.y = 3.5 + i * 7;
    group.add(seg);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 3.4, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  lampRoom.position.y = 37;
  group.add(lampRoom);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3, 12), red);
  roof.position.y = 40.2;
  group.add(roof);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(7, 130, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.13, depthWrite: false }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(65, 37, 0);
  beam.name = 'lighthouseBeam';
  group.add(beam);
  const x = 1150;
  const z = -500;
  group.position.set(x, groundHeightAt(x, z), z);
  return group;
}

function buildVillage() {
  const group = new THREE.Group();
  const rand = seededRandom(77);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0e2c8, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb5502e, roughness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffca7a });
  for (let i = 0; i < 16; i++) {
    const x = -260 + rand() * 200;
    const z = 300 + rand() * 180;
    const y = groundHeightAt(x, z);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 8), wallMat);
    walls.position.y = 3;
    house.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 4, 4), roofMat);
    roof.position.y = 8;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.2), glowMat);
    win.position.set(0, 3.2, 4.1);
    house.add(win);
    house.position.set(x, y, z);
    house.rotation.y = rand() * Math.PI;
    group.add(house);
  }
  return group;
}

function buildTrees() {
  const rand = seededRandom(1234);
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 6);
  const crownGeo = new THREE.ConeGeometry(3.4, 9, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f7a3d, roughness: 0.9 });
  const count = 420;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
  const m = new THREE.Matrix4();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < 6000) {
    guard++;
    const x = (rand() - 0.5) * 3000;
    const z = (rand() - 0.5) * 3000;
    const h = groundHeightAt(x, z);
    if (h < 2 || h > 60) continue;
    if (Math.hypot(x - RUNWAY.center.x, z - RUNWAY.center.z) < 260) continue;
    const s = 0.8 + rand() * 0.9;
    m.makeScale(s, s, s).setPosition(x, h + 2.5 * s, z);
    trunks.setMatrixAt(placed, m);
    m.makeScale(s, s, s).setPosition(x, h + 9 * s, z);
    crowns.setMatrixAt(placed, m);
    placed++;
  }
  trunks.count = placed;
  crowns.count = placed;
  const group = new THREE.Group();
  group.add(trunks, crowns);
  return group;
}

function buildClouds() {
  const group = new THREE.Group();
  const rand = seededRandom(42);
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 26; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(16 + rand() * 22, 10, 8), mat);
      s.position.set(p * 22 - puffs * 10, rand() * 6, rand() * 14);
      s.scale.y = 0.45;
      cloud.add(s);
    }
    cloud.position.set((rand() - 0.5) * 4200, 260 + rand() * 180, (rand() - 0.5) * 4200);
    group.add(cloud);
  }
  return group;
}

export function buildArchipelago(scene) {
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 9000),
    new THREE.MeshStandardMaterial({ color: 0x2a86a8, roughness: 0.4, metalness: 0.05 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WORLD.seaLevel;
  scene.add(sea);

  const land = new THREE.Mesh(buildIslandGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  scene.add(land);
  scene.add(buildRunway());
  const lighthouse = buildLighthouse();
  scene.add(lighthouse);
  scene.add(buildVillage());
  scene.add(buildTrees());
  scene.add(buildClouds());

  // Stranded boat for the rescue sortie.
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 5), new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.7 }));
  hull.position.y = 1.2;
  boat.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), new THREE.MeshStandardMaterial({ color: 0xf4f1ea }));
  cabin.position.set(-1, 4, 0);
  boat.add(cabin);
  const flare = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff5a3c }));
  flare.position.set(0, 9, 0);
  flare.name = 'rescueFlare';
  boat.add(flare);
  boat.position.set(620, 0, 780);
  boat.rotation.y = 0.6;
  scene.add(boat);

  return { lighthouse, boat };
}
