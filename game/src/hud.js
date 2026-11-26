// Senja Lintas — HUD instruments: altitude, airspeed, heading, horizon, fuel, hull.
import { headingDegrees, pitchRollDegrees } from './flight.js';
import { currentSortie } from './missions.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    alt: el('altValue'), spd: el('spdValue'), hdg: el('hdgValue'), vs: el('vsValue'),
    fuel: el('fuelFill'), hull: el('hullFill'), throttle: el('throttleFill'),
    missionTitle: el('missionTitle'), missionText: el('missionText'),
    banner: el('banner'), warning: el('warning'),
    score: el('scoreValue'), clock: el('clockValue'),
    horizon: el('horizon').getContext('2d'),
    status: el('status'),
  };
}

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function drawHorizon(ctx, pitchDeg, rollDeg) {
  const w = 112;
  const h = 112;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 52, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(THREE.MathUtils.degToRad(-rollDeg));
  const pitchPx = THREE.MathUtils.clamp(pitchDeg, -40, 40) * 2.2;
  ctx.fillStyle = '#5aa7d6';
  ctx.fillRect(-w, -h - pitchPx, w * 2, h);
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(-w, -pitchPx, w * 2, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w, -pitchPx - 1, w * 2, 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(180,230,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 34, h / 2);
  ctx.lineTo(w / 2 - 10, h / 2);
  ctx.moveTo(w / 2 + 10, h / 2);
  ctx.lineTo(w / 2 + 34, h / 2);
  ctx.stroke();
}

export function updateHud(hud, flight, missions) {
  const alt = Math.max(0, Math.round(flight.position.y));
  const spd = Math.round(flight.speed * 3.6);
  const hdg = Math.round(headingDegrees(flight));
  hud.alt.textContent = String(alt);
  hud.spd.textContent = String(spd);
  hud.hdg.textContent = String(hdg).padStart(3, '0');
  hud.vs.textContent = flight.verticalSpeed.toFixed(1);
  hud.fuel.style.width = flight.fuel.toFixed(0) + '%';
  hud.hull.style.width = flight.hull.toFixed(0) + '%';
  hud.throttle.style.width = (flight.throttle * 100).toFixed(0) + '%';
  const sortie = currentSortie(missions);
  hud.missionTitle.textContent = missions.finished ? 'ALL SORTIES COMPLETE' : sortie.title;
  hud.missionText.textContent = missions.finished
    ? 'Final score ' + missions.score + ' — press R to fly the day again.'
    : sortie.text;
  hud.score.textContent = String(missions.score);
  hud.clock.textContent = formatClock(missions.elapsed);
  if (missions.messageTimer > 0 && missions.message) {
    hud.banner.textContent = missions.message;
    hud.banner.style.opacity = '1';
  } else {
    hud.banner.style.opacity = '0';
  }
  if (flight.crashed) {
    hud.warning.textContent = 'AIRCRAFT DOWN — PRESS R';
    hud.warning.style.display = 'block';
  } else if (flight.stall) {
    hud.warning.textContent = 'STALL — NOSE DOWN, ADD POWER';
    hud.warning.style.display = 'block';
  } else if (flight.fuel <= 0 && flight.airborne) {
    hud.warning.textContent = 'FUEL EMPTY — GLIDE HOME';
    hud.warning.style.display = 'block';
  } else {
    hud.warning.style.display = 'none';
  }
  const pr = pitchRollDegrees(flight);
  drawHorizon(hud.horizon, pr.pitch, pr.roll);
  hud.status.textContent = 'Altitude ' + alt + ' meters, speed ' + spd + ' kilometers per hour, heading ' + hdg + ' degrees.';
}
