// Senja Lintas — world and sortie constants shared by every module.
export const WORLD = {
  seaLevel: 0,
  islandRadius: 900,
  sunDirection: { x: -0.55, y: 0.28, z: -0.79 },
  skyTop: 0x2b4a7a,
  skyHorizon: 0xffb26b,
  fogColor: 0xf2a56b,
  fogNear: 900,
  fogFar: 5200,
};

export const RUNWAY = {
  center: { x: 0, z: 0 },
  length: 420,
  width: 34,
  headingDeg: 90,
};

export const PLANE_START = {
  position: { x: -150, y: 5, z: 0 },
  headingDeg: 90,
};

export const FLIGHT_LIMITS = {
  stallSpeedKmh: 62,
  maxSpeedKmh: 260,
  ceilingMeters: 620,
  fuelBurnPerSecond: 0.55,
  fuelCapacity: 100,
};

export const SORTIES = [
  { id: 'slalom', title: 'SORTIE 1 — RING SLALOM', text: 'Thread all 5 glowing rings over the bay. Follow the gold beacon.' },
  { id: 'survey', title: 'SORTIE 2 — LOW SURVEY PASS', text: 'Fly low past the lighthouse and press SPACE to photograph it.' },
  { id: 'rescue', title: 'SORTIE 3 — WATER RESCUE', text: 'Land on the water beside the stranded boat and stop next to it.' },
  { id: 'cargo', title: 'SORTIE 4 — CARGO DROP', text: 'Fly over the village clearing and press SPACE to drop supplies.' },
  { id: 'home', title: 'SORTIE 5 — THE FLIGHT HOME', text: 'Land on the home runway, gentle and straight, to finish the day.' },
];

export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
