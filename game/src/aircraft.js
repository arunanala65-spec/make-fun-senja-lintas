// Senja Lintas — the seaplane: a built prop aircraft with lit cockpit instruments.
export function buildSeaplane() {
  const plane = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.45, metalness: 0.15 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xe86a1e, roughness: 0.5, metalness: 0.1 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x146b7a, roughness: 0.5, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x232830, roughness: 0.6 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.7, 11, 14), cream);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.4;
  plane.add(fuselage);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 12), orange);
  nose.scale.set(1, 1, 1.15);
  nose.position.z = 5.6;
  plane.add(nose);

  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.53, 1.2, 3.2, 14), teal);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = 2.6;
  plane.add(stripe);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.35, 2.6), orange);
  wing.position.set(0, 1.55, 1.6);
  plane.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 2.2), teal);
  wingTipL.position.set(-7.9, 1.9, 1.6);
  plane.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 7.9;
  plane.add(wingTipR);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 1.5), orange);
  tailWing.position.set(0, 0.9, -4.9);
  plane.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 1.8), teal);
  fin.position.set(0, 1.6, -5);
  plane.add(fin);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x9fd8ef, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.75 }),
  );
  canopy.scale.set(1, 0.85, 1.7);
  canopy.position.set(0, 1.15, 2.2);
  plane.add(canopy);

  for (const side of [-1, 1]) {
    const floatPod = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 5.2, 4, 10), teal);
    floatPod.rotation.x = Math.PI / 2;
    floatPod.position.set(side * 2.6, -2.3, 1.4);
    plane.add(floatPod);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 6), dark);
    strut.position.set(side * 2.2, -1.2, 1.8);
    strut.rotation.z = side * 0.35;
    plane.add(strut);
  }

  const propGroup = new THREE.Group();
  propGroup.position.z = 7.1;
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.6, 0.12), bladeMat);
    blade.rotation.z = a;
    propGroup.add(blade);
  }
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 10), orange);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.5;
  propGroup.add(spinner);
  propGroup.name = 'propeller';
  plane.add(propGroup);

  const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
  navRed.position.set(-8, 1.6, 1.6);
  plane.add(navRed);
  const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0x40ff70 }));
  navGreen.position.set(8, 1.6, 1.6);
  plane.add(navGreen);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  beacon.position.set(0, 3, -5);
  beacon.name = 'beacon';
  plane.add(beacon);

  plane.add(buildCockpit());
  return plane;
}

function buildCockpit() {
  const cockpit = new THREE.Group();
  cockpit.name = 'cockpit';
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1c222b, roughness: 0.7 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.05, 0.35), panelMat);
  panel.position.set(0, 0.95, 4.9);
  panel.rotation.x = -0.18;
  cockpit.add(panel);
  const gaugeColors = [0x7dd3fc, 0xffd98a, 0xa7f3d0, 0xfda4af, 0x7dd3fc, 0xffd98a];
  gaugeColors.forEach((color, i) => {
    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.06, 18),
      new THREE.MeshBasicMaterial({ color }),
    );
    gauge.rotation.x = Math.PI / 2 - 0.18;
    gauge.position.set(-0.85 + (i % 3) * 0.85, 1.18 - Math.floor(i / 3) * 0.5, 4.71);
    cockpit.add(gauge);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    needle.position.copy(gauge.position);
    needle.position.z -= 0.05;
    needle.rotation.z = i * 0.7;
    needle.name = 'needle' + i;
    cockpit.add(needle);
  });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.8, 8), panelMat);
  stick.position.set(0, 0.1, 3.4);
  stick.rotation.x = 0.25;
  cockpit.add(stick);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.9 }));
  seat.position.set(0, 0.7, 1.1);
  seat.rotation.x = 0.15;
  cockpit.add(seat);
  return cockpit;
}
