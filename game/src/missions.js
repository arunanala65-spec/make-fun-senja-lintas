// Senja Lintas — the five-sortie chain: slalom, survey, rescue, cargo, home.
import { SORTIES } from './config.js';
import { groundHeightAt } from './terrain.js';

const RING_SPOTS = [
  { x: 320, y: 55, z: -180 },
  { x: 560, y: 70, z: -420 },
  { x: 880, y: 62, z: -330 },
  { x: 1080, y: 80, z: 60 },
  { x: 760, y: 58, z: 380 },
];

export function createMissionState() {
  return {
    sortieIndex: 0,
    ringIndex: 0,
    photographed: false,
    rescued: false,
    cargoDropped: false,
    finished: false,
    score: 0,
    elapsed: 0,
    message: '',
    messageTimer: 0,
  };
}

export function buildMissionMarkers(scene) {
  const rings = RING_SPOTS.map((spot) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16, 1.1, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0xffc94d }),
    );
    ring.position.set(spot.x, spot.y, spot.z);
    ring.lookAt(0, spot.y, 0);
    scene.add(ring);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 220, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    beacon.position.set(spot.x, spot.y + 60, spot.z);
    beacon.name = 'ringBeacon';
    scene.add(beacon);
    return ring;
  });
  const clearing = new THREE.Mesh(
    new THREE.CircleGeometry(34, 24),
    new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.55 }),
  );
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(-170, groundHeightAt(-170, 390) + 0.4, 390);
  scene.add(clearing);
  return { rings, clearing };
}

function say(missions, text, seconds) {
  missions.message = text;
  missions.messageTimer = seconds;
}

export function updateMissions(missions, flight, markers, boat, actionPressed, dt, onEvent) {
  missions.elapsed += dt;
  if (missions.messageTimer > 0) missions.messageTimer -= dt;
  if (missions.finished) return;
  const sortie = SORTIES[missions.sortieIndex];
  const p = flight.position;

  if (sortie.id === 'slalom') {
    markers.rings.forEach((ring, i) => {
      ring.visible = i >= missions.ringIndex;
      ring.material.color.set(i === missions.ringIndex ? 0xffc94d : 0x8a6d2f);
      if (i === missions.ringIndex) ring.rotation.z += dt * 0.4;
    });
    const ring = markers.rings[missions.ringIndex];
    if (ring && p.distanceTo(ring.position) < 17) {
      missions.ringIndex++;
      missions.score += 150;
      onEvent('ring');
      if (missions.ringIndex >= markers.rings.length) {
        missions.sortieIndex++;
        missions.score += 250;
        say(missions, 'SLALOM CLEAR — NEXT: SURVEY PASS', 4);
        onEvent('sortie');
      } else {
        say(missions, 'RING ' + missions.ringIndex + ' / 5', 2);
      }
    }
  } else if (sortie.id === 'survey') {
    markers.rings.forEach((ring) => { ring.visible = false; });
    const lighthouseTop = new THREE.Vector3(1150, groundHeightAt(1150, -500) + 37, -500);
    const near = p.distanceTo(lighthouseTop) < 130 && p.y < lighthouseTop.y + 60;
    if (actionPressed && near && !missions.photographed) {
      missions.photographed = true;
      missions.score += 300;
      missions.sortieIndex++;
      say(missions, 'SURVEY PHOTO TAKEN — NEXT: WATER RESCUE', 4);
      onEvent('photo');
    } else if (actionPressed && !near) {
      say(missions, 'TOO FAR — GET CLOSER TO THE LIGHTHOUSE', 2.5);
    }
  } else if (sortie.id === 'rescue') {
    const boatPos = boat.position;
    const dist = Math.hypot(p.x - boatPos.x, p.z - boatPos.z);
    if (!flight.airborne && p.y < 4 && dist < 55 && flight.speed * 3.6 < 25) {
      missions.rescued = true;
      missions.score += 350;
      missions.sortieIndex++;
      say(missions, 'SURVIVOR ABOARD — NEXT: CARGO DROP', 4);
      onEvent('rescue');
    }
  } else if (sortie.id === 'cargo') {
    const target = markers.clearing.position;
    const dist = Math.hypot(p.x - target.x, p.z - target.z);
    if (actionPressed && !missions.cargoDropped) {
      missions.cargoDropped = true;
      const accuracy = Math.max(0, 1 - dist / 220);
      const points = Math.round(120 + accuracy * 280);
      missions.score += points;
      missions.sortieIndex++;
      say(missions, 'CARGO AWAY — +' + points + ' PTS. NEXT: FLY HOME', 4);
      onEvent('cargo');
    }
  } else if (sortie.id === 'home') {
    const t = flight.lastTouchdown;
    if (t && t.onRunway && !flight.airborne && flight.speed * 3.6 < 15) {
      missions.score += t.quality === 'smooth' ? 500 : 250;
      missions.score += Math.round(flight.fuel * 4 + flight.hull * 3);
      missions.finished = true;
      say(missions, 'HOME SAFE — DAY COMPLETE', 99);
      onEvent('finish');
    }
  }
}

export function currentSortie(missions) {
  return SORTIES[Math.min(missions.sortieIndex, SORTIES.length - 1)];
}
