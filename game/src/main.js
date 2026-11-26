// Senja Lintas — game loop, cameras, keyboard + mouse input, sortie flow.
import { WORLD, PLANE_START } from './config.js';
import { buildArchipelago, groundHeightAt } from './terrain.js';
import { buildSeaplane } from './aircraft.js';
import { createFlightState, stepFlight } from './flight.js';
import { createMissionState, buildMissionMarkers, updateMissions } from './missions.js';
import { createHud, updateHud } from './hud.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(WORLD.fogColor, WORLD.fogNear, WORLD.fogFar);

const skyGeo = new THREE.SphereGeometry(6000, 24, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    topColor: { value: new THREE.Color(WORLD.skyTop) },
    horizonColor: { value: new THREE.Color(WORLD.skyHorizon) },
  },
  vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vPos; void main(){ float h = clamp(normalize(vPos).y * 1.6 + 0.25, 0.0, 1.0); gl_FragColor = vec4(mix(horizonColor, topColor, pow(h, 0.75)), 1.0); }',
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

const sun = new THREE.DirectionalLight(0xffc98a, 2.4);
sun.position.set(WORLD.sunDirection.x * 900, WORLD.sunDirection.y * 900, WORLD.sunDirection.z * 900);
sun.castShadow = true;
sun.shadow.camera.left = -160;
sun.shadow.camera.right = 160;
sun.shadow.camera.top = 160;
sun.shadow.camera.bottom = -160;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a6a42, 0.75));
scene.add(new THREE.AmbientLight(0xffe0b8, 0.25));

const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(120, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd98a, fog: false }));
sunDisc.position.set(WORLD.sunDirection.x * 5200, WORLD.sunDirection.y * 5200, WORLD.sunDirection.z * 5200);
scene.add(sunDisc);

const world = buildArchipelago(scene);
const plane = buildSeaplane();
scene.add(plane);
const markers = buildMissionMarkers(scene);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 12000);

let flight = createFlightState(PLANE_START);
let missions = createMissionState();
const hud = createHud();
const audio = createAudio();

const keys = {};
let mouseSteer = false;
let mouseX = 0;
let mouseY = 0;
let cameraMode = 0; // 0 chase, 1 cockpit, 2 orbit show
let actionPressed = false;
let started = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') { actionPressed = true; e.preventDefault(); }
  if (e.code === 'KeyC') cameraMode = (cameraMode + 1) % 3;
  if (e.code === 'KeyR') restart();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', () => { mouseSteer = true; });
window.addEventListener('mouseup', () => { mouseSteer = false; });
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function restart() {
  flight = createFlightState(PLANE_START);
  missions = createMissionState();
}

function readInput() {
  const input = {
    throttleUp: !!keys['KeyW'],
    throttleDown: !!keys['KeyS'],
    pitch: (keys['ArrowUp'] ? 1 : 0) + (keys['ArrowDown'] ? -1 : 0),
    roll: (keys['ArrowLeft'] ? 1 : 0) + (keys['ArrowRight'] ? -1 : 0),
    yaw: (keys['KeyA'] ? 1 : 0) + (keys['KeyD'] ? -1 : 0),
  };
  if (mouseSteer) {
    input.pitch = THREE.MathUtils.clamp(-mouseY * 1.4, -1, 1);
    input.roll = THREE.MathUtils.clamp(-mouseX * 1.4, -1, 1);
  }
  return input;
}

const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
function updateCamera(dt) {
  const cockpit = plane.getObjectByName('cockpit');
  if (cameraMode === 1) {
    const eye = new THREE.Vector3(0, 1.95, 3.2).applyQuaternion(flight.quaternion).add(flight.position);
    const ahead = new THREE.Vector3(0, 1.15, 30).applyQuaternion(flight.quaternion).add(flight.position);
    camera.position.copy(eye);
    camera.lookAt(ahead);
    if (cockpit) cockpit.visible = true;
  } else if (cameraMode === 2) {
    const t = performance.now() * 0.00012;
    camera.position.set(flight.position.x + Math.sin(t) * 26, flight.position.y + 8, flight.position.z + Math.cos(t) * 26);
    camera.lookAt(flight.position);
    if (cockpit) cockpit.visible = false;
  } else {
    const back = new THREE.Vector3(0, 3.6, -12.5).applyQuaternion(flight.quaternion).add(flight.position);
    camPos.lerp(back, Math.min(1, dt * 4.5));
    if (camPos.lengthSq() === 0) camPos.copy(back);
    camera.position.copy(camPos);
    camTarget.copy(flight.position).add(new THREE.Vector3(0, 1.5, 14).applyQuaternion(flight.quaternion));
    camera.lookAt(camTarget);
    if (cockpit) cockpit.visible = false;
  }
}

function applyShotPose(shot) {
  // Deterministic poses for the maker's screenshots: real renders of this code.
  started = true;
  document.getElementById('title').style.display = 'none';
  const poses = {
    1: { pos: [150, 58, -120], heading: 126, speed: 46, throttle: 0.72, camera: 0, pitch: -4, roll: -12 },
    2: { pos: [980, 78, -380], heading: 100, speed: 38, throttle: 0.6, camera: 1, pitch: -2, roll: 6 },
    3: { pos: [540, 22, 660], heading: 34, speed: 28, throttle: 0.45, camera: 0, pitch: -6, roll: 10 },
    4: { pos: [-420, 34, 30], heading: 90, speed: 34, throttle: 0.5, camera: 0, pitch: -5, roll: 0 },
  };
  const pose = poses[shot] || poses[1];
  flight.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
  flight.quaternion.setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(pose.pitch),
    THREE.MathUtils.degToRad(pose.heading),
    THREE.MathUtils.degToRad(pose.roll),
    'YXZ',
  ));
  flight.speed = pose.speed;
  flight.throttle = pose.throttle;
  flight.airborne = true;
  flight.fuel = 78;
  cameraMode = pose.camera;
  if (shot === 3) { missions.sortieIndex = 2; markers.rings.forEach((r) => { r.visible = false; }); }
  if (shot === 4) { missions.sortieIndex = 4; markers.rings.forEach((r) => { r.visible = false; }); }
  if (shot === 2) { missions.sortieIndex = 1; missions.ringIndex = 5; }
  if (shot === 1) { missions.ringIndex = 1; missions.score = 150; }
  camPos.set(0, 0, 0);
}

const shotParam = new URLSearchParams(window.location.search).get('shot');
if (shotParam) applyShotPose(Number(shotParam));

document.getElementById('startBtn').addEventListener('click', () => {
  started = true;
  document.getElementById('title').style.display = 'none';
  audio.start();
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (started) {
    const input = readInput();
    stepFlight(flight, input, dt);
    updateMissions(missions, flight, markers, world.boat, actionPressed, dt, (name) => audio.event(name));
    actionPressed = false;
    audio.update(flight.throttle, flight.speed * 3.6);
  }
  plane.position.copy(flight.position);
  plane.quaternion.copy(flight.quaternion);
  const prop = plane.getObjectByName('propeller');
  if (prop) prop.rotation.z += dt * (4 + flight.throttle * 55);
  const beacon = plane.getObjectByName('beacon');
  if (beacon) beacon.visible = Math.floor(performance.now() / 450) % 2 === 0;
  const beam = world.lighthouse.getObjectByName('lighthouseBeam');
  if (beam) beam.parent.rotation.y += dt * 0.25;
  const flare = world.boat.getObjectByName('rescueFlare');
  if (flare) flare.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.35);
  updateCamera(dt);
  updateHud(hud, flight, missions);
  renderer.render(scene, camera);
}
animate();

// Exposed for the maker's playtest harness only; the game needs none of it.
window.__senja = { flight: () => flight, missions: () => missions, restart, groundHeightAt };
