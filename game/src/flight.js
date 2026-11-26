// Senja Lintas — flight model: throttle, lift, stall, fuel, hull damage, landing.
import { FLIGHT_LIMITS } from './config.js';
import { groundHeightAt } from './terrain.js';

export function createFlightState(start) {
  return {
    position: new THREE.Vector3(start.position.x, start.position.y, start.position.z),
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(start.headingDeg), 0)),
    speed: 0,
    throttle: 0,
    pitchInput: 0,
    rollInput: 0,
    yawInput: 0,
    fuel: FLIGHT_LIMITS.fuelCapacity,
    hull: 100,
    airborne: false,
    crashed: false,
    verticalSpeed: 0,
    stall: false,
    lastTouchdown: null,
  };
}

const forward = new THREE.Vector3();
const euler = new THREE.Euler();

export function stepFlight(state, input, dt) {
  if (state.crashed) return state;
  const throttleRate = 0.85;
  if (input.throttleUp) state.throttle = Math.min(1, state.throttle + throttleRate * dt);
  if (input.throttleDown) state.throttle = Math.max(0, state.throttle - throttleRate * dt);

  const pitchRate = 0.85;
  const rollRate = 1.6;
  const yawRate = 0.55;
  state.pitchInput = THREE.MathUtils.lerp(state.pitchInput, input.pitch, Math.min(1, dt * 6));
  state.rollInput = THREE.MathUtils.lerp(state.rollInput, input.roll, Math.min(1, dt * 6));
  state.yawInput = THREE.MathUtils.lerp(state.yawInput, input.yaw, Math.min(1, dt * 6));

  const controlAuthority = THREE.MathUtils.clamp(state.speed / 18, 0.25, 1);
  const q = new THREE.Quaternion();
  q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -state.pitchInput * pitchRate * controlAuthority * dt);
  state.quaternion.multiply(q);
  q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), state.rollInput * rollRate * controlAuthority * dt);
  state.quaternion.multiply(q);
  q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.yawInput * yawRate * dt);
  state.quaternion.multiply(q);

  // Coordinated turn: banking yaws the nose.
  euler.setFromQuaternion(state.quaternion, 'YXZ');
  const bankYaw = Math.sin(euler.z) * Math.min(state.speed, 40) * 0.028 * dt;
  q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), bankYaw);
  state.quaternion.premultiply(q);

  const maxSpeed = FLIGHT_LIMITS.maxSpeedKmh / 3.6;
  const enginePower = state.fuel > 0 ? state.throttle : 0;
  const drag = 0.012 * state.speed * state.speed * 0.02 + 0.4;
  const gravityPull = -Math.sin(euler.x) * 9.81 * 0.55;
  state.speed += (enginePower * 23 - drag + gravityPull) * dt;
  state.speed = THREE.MathUtils.clamp(state.speed, 0, maxSpeed);

  forward.set(0, 0, 1).applyQuaternion(state.quaternion);
  const liftFactor = THREE.MathUtils.clamp(state.speed / (FLIGHT_LIMITS.stallSpeedKmh / 3.6), 0, 1.4);
  state.stall = state.airborne && liftFactor < 0.85 && state.speed > 4;
  const sink = state.airborne ? (1 - Math.min(liftFactor, 1)) * 7 : 0;

  const prevY = state.position.y;
  state.position.addScaledVector(forward, state.speed * dt);
  state.position.y -= sink * dt;
  state.position.y = Math.min(state.position.y, FLIGHT_LIMITS.ceilingMeters);
  state.verticalSpeed = dt > 0 ? (state.position.y - prevY) / dt : 0;

  const ground = Math.max(groundHeightAt(state.position.x, state.position.z), 0);
  const surface = ground > 0.4 ? ground + 2.6 : 1.6; // floats sit on water at 1.6
  if (state.position.y <= surface) {
    const sinkRate = -state.verticalSpeed;
    const onRunway = Math.abs(state.position.z) < 22 && Math.abs(state.position.x) < 215 && ground > 0.4;
    const onWater = ground <= 0.4;
    state.position.y = surface;
    if (state.airborne) {
      const gentle = sinkRate < 4.2 && Math.abs(euler.z) < 0.35;
      const rough = sinkRate < 7.5;
      if (!gentle && !rough) {
        state.hull = Math.max(0, state.hull - 55);
        state.lastTouchdown = { quality: 'crash', onRunway, onWater, speedKmh: state.speed * 3.6 };
        if (state.hull <= 0) state.crashed = true;
      } else {
        if (!gentle) state.hull = Math.max(0, state.hull - 14);
        state.lastTouchdown = { quality: gentle ? 'smooth' : 'firm', onRunway, onWater, speedKmh: state.speed * 3.6 };
      }
      state.airborne = false;
    }
    const rollingResistance = onWater ? 2.4 : 1.5;
    const braking = state.throttle < 0.05 ? 6 : 0;
    state.speed = Math.max(0, state.speed - (rollingResistance + braking) * dt);
    // Level out on the surface.
    euler.setFromQuaternion(state.quaternion, 'YXZ');
    euler.x *= Math.max(0, 1 - dt * 4);
    euler.z *= Math.max(0, 1 - dt * 4);
    state.quaternion.setFromEuler(euler);
  } else if (state.position.y > surface + 1.2) {
    state.airborne = true;
  }

  if (state.fuel > 0 && state.throttle > 0.02) {
    state.fuel = Math.max(0, state.fuel - FLIGHT_LIMITS.fuelBurnPerSecond * state.throttle * dt * 3.2);
  }
  return state;
}

export function headingDegrees(state) {
  forward.set(0, 0, 1).applyQuaternion(state.quaternion);
  let deg = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
  if (deg < 0) deg += 360;
  return deg;
}

export function pitchRollDegrees(state) {
  euler.setFromQuaternion(state.quaternion, 'YXZ');
  return { pitch: THREE.MathUtils.radToDeg(euler.x), roll: THREE.MathUtils.radToDeg(euler.z) };
}
