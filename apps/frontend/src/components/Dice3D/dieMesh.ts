import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DiceValue } from '@shared/types/game';

export const FACE_VALUES: DiceValue[] = [1, 6, 2, 5, 3, 4]; // +X,-X,+Y,-Y,+Z,-Z

export function makeFaceTexture(value: number, opts: { bg?: string; pip?: string; border?: string } = {}): THREE.CanvasTexture {
  const { bg = '#faf8f4', pip = '#1d1d1f', border = '#dcdcdc' } = opts;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const r = 36;

  // Fill entire canvas first so RoundedBoxGeometry UV edges don't show black
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.stroke();

  const drawPip = (x: number, y: number) => {
    ctx.fillStyle = pip;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const a = 64,
    b = 128,
    d = 192;
  const positions: Record<number, [number, number][]> = {
    1: [[b, b]],
    2: [
      [a, a],
      [d, d],
    ],
    3: [
      [a, a],
      [b, b],
      [d, d],
    ],
    4: [
      [a, a],
      [d, a],
      [a, d],
      [d, d],
    ],
    5: [
      [a, a],
      [d, a],
      [b, b],
      [a, d],
      [d, d],
    ],
    6: [
      [a, a],
      [d, a],
      [a, b],
      [d, b],
      [a, d],
      [d, d],
    ],
  };

  for (const [x, y] of positions[value]) drawPip(x, y);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function makeUprightQuaternion(value: number, spinY = 0): THREE.Quaternion {
  const e = new THREE.Euler();
  switch (value) {
    case 1:
      e.set(0, 0, Math.PI / 2);
      break;
    case 6:
      e.set(0, 0, -Math.PI / 2);
      break;
    case 2:
      e.set(0, 0, 0);
      break;
    case 5:
      e.set(Math.PI, 0, 0);
      break;
    case 3:
      e.set(-Math.PI / 2, 0, 0);
      break;
    case 4:
      e.set(Math.PI / 2, 0, 0);
      break;
  }
  const q = new THREE.Quaternion().setFromEuler(e);
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinY);
  return q.premultiply(yaw);
}

export function createDieMesh(): THREE.Mesh {
  const HALF = 0.24;
  const size = HALF * 2;
  const geo = new RoundedBoxGeometry(size, size, size, 4, 0.10);
  const mats = FACE_VALUES.map(
    (v) =>
      new THREE.MeshStandardMaterial({
        map: makeFaceTexture(v),
        roughness: 0.38,
        metalness: 0.06,
      })
  );
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  return mesh;
}
