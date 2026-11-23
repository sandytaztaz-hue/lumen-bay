// Police motorcycle and armored tank builders for the Lumen Bay staged shots.
//
// Both are built from simple box / cylinder / sphere / torus shapes in the
// game's blocky low-poly style, grouped so the staging code can place them
// by position and heading and add them to the scene. Local space follows
// the game's vehicle convention: plus-z is the nose, up is plus-y, so a
// group rotated by +PI/2 faces east and by -PI/2 faces west.
import * as THREE from 'three';

// Small helpers so every part is one readable line: a box centred at a
// point, and a cylinder centred at a point.
function box(w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

function tube(r, len, mat, x, y, z, rotX, rotZ) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
  mesh.position.set(x, y, z);
  if (rotX) mesh.rotation.x = rotX;
  if (rotZ) mesh.rotation.z = rotZ;
  return mesh;
}

// Soft round glow texture, drawn once and reused for headlight halos.
let glowTexture = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,244,200,0.55)');
  grad.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

function glowSprite(color, x, y, z, scale) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Police motorcycle: full faired body in white with a blue police stripe,
// clear windshield, wide tyres with visible tread, saddlebags, a red-and-blue
// light bar, and a rider in a dark police uniform with a helmet. It must
// read as a police motorcycle at shot distance, not a dark blob.
// ---------------------------------------------------------------------------
export function makePoliceBike() {
  const bike = new THREE.Group();
  bike.name = 'police-bike';

  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.45, metalness: 0.15, emissive: 0x232323 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.6, metalness: 0.4 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.95 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.25, metalness: 0.85 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x1c2440, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc4e8, roughness: 0.1, transparent: true, opacity: 0.45 });
  const redLamp = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const blueLamp = new THREE.MeshBasicMaterial({ color: 0x2a6bff });
  const headlamp = new THREE.MeshBasicMaterial({ color: 0xfff6dc });

  // Wide tyres with tread: a fat torus, a hub disc, and six tread blocks
  // spaced around each tyre so the tread reads at shot distance.
  for (const zc of [0.62, -0.62]) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 10, 20), tyreMat);
    tyre.position.set(0, 0.45, zc);
    tyre.rotation.y = Math.PI / 2;
    bike.add(tyre);
    bike.add(tube(0.2, 0.14, dark, 0, 0.45, zc, 0, Math.PI / 2));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const tread = box(0.24, 0.07, 0.13, tyreMat, 0, 0.45 + Math.sin(a) * 0.44, zc + Math.cos(a) * 0.44);
      tread.rotation.x = a;
      bike.add(tread);
    }
  }

  // Body: low dark frame, white fuel tank with a blue police stripe,
  // dark seat, sloped white front fairing and a clear windshield.
  bike.add(box(0.3, 0.34, 1.15, dark, 0, 0.55, 0));
  bike.add(box(0.44, 0.3, 0.6, white, 0, 0.82, 0.12));
  bike.add(box(0.46, 0.09, 1.05, blue, 0, 0.68, 0.05));
  bike.add(box(0.4, 0.12, 0.5, dark, 0, 0.78, -0.48));
  const fairing = box(0.46, 0.52, 0.3, white, 0, 0.78, 0.58);
  fairing.rotation.x = -0.18;
  bike.add(fairing);
  const shield = box(0.4, 0.44, 0.03, glass, 0, 1.08, 0.66);
  shield.rotation.x = -0.38;
  bike.add(shield);
  bike.add(box(0.3, 0.13, 0.06, headlamp, 0, 0.74, 0.76));
  bike.add(glowSprite(0xfff6dc, 0, 0.74, 0.82, 0.55));
  bike.add(box(0.34, 0.05, 0.5, white, 0, 0.93, 0.62));
  bike.add(box(0.34, 0.05, 0.45, white, 0, 0.93, -0.62));

  // Handlebars with grips, mirrors on stalks, chrome exhaust, saddlebags.
  bike.add(tube(0.03, 0.62, dark, 0, 1.02, 0.32, 0, Math.PI / 2));
  bike.add(tube(0.04, 0.14, dark, -0.3, 1.02, 0.32, 0, Math.PI / 2));
  bike.add(tube(0.04, 0.14, dark, 0.3, 1.02, 0.32, 0, Math.PI / 2));
  for (const sx of [-1, 1]) {
    bike.add(tube(0.015, 0.22, dark, sx * 0.22, 1.14, 0.34, 0, 0));
    bike.add(box(0.09, 0.06, 0.02, dark, sx * 0.24, 1.26, 0.34));
  }
  bike.add(tube(0.06, 0.75, chrome, 0.22, 0.38, -0.25, Math.PI / 2, 0));
  bike.add(box(0.16, 0.34, 0.48, white, -0.31, 0.6, -0.58));
  bike.add(box(0.16, 0.34, 0.48, white, 0.31, 0.6, -0.58));

  // Red-and-blue light bar on the rear rack.
  bike.add(box(0.42, 0.07, 0.16, dark, 0, 0.98, -0.68));
  bike.add(box(0.19, 0.09, 0.14, redLamp, -0.1, 1.04, -0.68));
  bike.add(box(0.19, 0.09, 0.14, blueLamp, 0.1, 1.04, -0.68));

  // Rider in a dark police uniform with a white helmet: seated thighs and
  // shins, a leaning torso, arms reaching forward to the handlebars.
  for (const sx of [-1, 1]) {
    const thigh = box(0.15, 0.15, 0.42, navy, sx * 0.17, 0.78, -0.08);
    thigh.rotation.x = 0.25;
    bike.add(thigh);
    bike.add(box(0.13, 0.4, 0.13, navy, sx * 0.17, 0.5, 0.12));
    bike.add(box(0.13, 0.09, 0.24, dark, sx * 0.17, 0.3, 0.14));
    const arm = box(0.12, 0.12, 0.55, navy, sx * 0.2, 1.17, 0.02);
    arm.rotation.x = 0.47;
    bike.add(arm);
  }
  const torso = box(0.44, 0.56, 0.26, navy, 0, 1.14, -0.3);
  torso.rotation.x = 0.18;
  bike.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), white);
  helmet.position.set(0, 1.52, -0.26);
  bike.add(helmet);
  bike.add(box(0.24, 0.07, 0.04, dark, 0, 1.52, -0.09));
  bike.add(box(0.2, 0.1, 0.1, skin, 0, 1.34, -0.22));

  return bike;
}

// ---------------------------------------------------------------------------
// Armored tank: a wide tracked base with visible track blocks, a low
// armored hull in olive drab green, a rotating turret on top with a long
// gun barrel, a white star marking on the hull side, and headlights on.
// Bigger and lower than a police cruiser. The olive paint carries a warm
// emissive lift, the same trick the hero car uses, so the hull still reads
// olive at night instead of going black.
// ---------------------------------------------------------------------------
function makeStarMesh(radius) {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
}

export function makeTank() {
  const tank = new THREE.Group();
  tank.name = 'tank';

  const olive = new THREE.MeshStandardMaterial({ color: 0x5a6b3a, roughness: 0.85, metalness: 0.05, emissive: 0x2e3620, emissiveIntensity: 0.8 });
  const oliveDark = new THREE.MeshStandardMaterial({ color: 0x4a5a30, roughness: 0.85, metalness: 0.05, emissive: 0x272f1c, emissiveIntensity: 0.8 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.95, emissive: 0x0c0c0c });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.7, metalness: 0.5 });
  const headlamp = new THREE.MeshBasicMaterial({ color: 0xfff6dc });

  // Tracked base: two dark track runs with tread blocks proud of the outer
  // face and road wheels between them.
  for (const sx of [-1, 1]) {
    tank.add(box(0.62, 0.72, 5.6, trackMat, sx * 1.12, 0.36, 0));
    for (const zc of [-2.2, -1.32, -0.44, 0.44, 1.32, 2.2]) {
      tank.add(box(0.1, 0.2, 0.55, trackMat, sx * 1.46, 0.36, zc));
    }
    for (const zc of [-1.6, 0, 1.6]) {
      tank.add(tube(0.3, 0.1, steel, sx * 1.45, 0.36, zc, 0, Math.PI / 2));
    }
  }

  // Low armored hull with a sloped front glacis plate and a rear deck.
  tank.add(box(2.5, 0.85, 5.0, olive, 0, 1.15, 0));
  const glacis = box(2.5, 0.75, 0.1, olive, 0, 1.05, 2.5);
  glacis.rotation.x = -0.45;
  tank.add(glacis);
  tank.add(box(2.3, 0.25, 0.8, oliveDark, 0, 1.6, -2.2));

  // Turret with a roof plate, a commander hatch, and a long gun barrel
  // pointing forward, tipped with a muzzle brake.
  tank.add(box(1.7, 0.65, 2.3, olive, 0, 1.9, -0.3));
  tank.add(box(1.5, 0.12, 2.0, oliveDark, 0, 2.26, -0.3));
  tank.add(tube(0.32, 0.12, steel, 0.42, 2.36, -0.7, 0, 0));
  tank.add(tube(0.11, 3.2, olive, 0, 1.95, 1.95, Math.PI / 2, 0));
  tank.add(tube(0.16, 0.32, steel, 0, 1.95, 3.35, Math.PI / 2, 0));

  // White star marking on each hull side, and a thin radio antenna.
  for (const sx of [-1, 1]) {
    const star = makeStarMesh(0.42);
    star.position.set(sx * 1.26, 1.15, 0);
    star.rotation.y = (sx * Math.PI) / 2;
    tank.add(star);
  }
  tank.add(tube(0.02, 1.3, steel, -0.62, 2.9, -1.3, 0, 0));

  // Headlights on, with a soft halo each so they read at night.
  for (const sx of [-1, 1]) {
    tank.add(box(0.2, 0.15, 0.08, headlamp, sx * 0.85, 1.0, 2.52));
    tank.add(glowSprite(0xfff6dc, sx * 0.85, 1.0, 2.62, 1.0));
  }

  tank.scale.setScalar(1.1);
  return tank;
}

// Short aliases in the same style as the vehicle module's short builder
// names, for staging code that prefers them.
export const policeBike = makePoliceBike;
export const tank = makeTank;
