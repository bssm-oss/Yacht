import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { TRAY, HOLD_SLOTS } from './tray';
import { CUP } from './cup';
import { makeUprightQuaternion, createDieMesh } from './dieMesh';

export const HALF = 0.24;
export const FLOOR_Y = TRAY.floorY + HALF;
export const G = -32;
export const RESTITUTION = 0.42;
export const FRICTION = 0.78;
export const ANG_FRICTION = 0.78;
export const COLL_R = HALF * 1.02;
export const DIE_RESTITUTION = 0.4;

export { HOLD_SLOTS };

export interface DiceBody {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  ang: THREE.Vector3;
  resting: boolean;
  inCup: boolean;
  held: boolean;
  targetValue: DiceValue;
  settleT: number;
  snapping: boolean;
  snapT: number;
  snapStartQ: THREE.Quaternion;
  snapTargetQ: THREE.Quaternion;
}

export function createDice(): DiceBody[] {
  const dice: DiceBody[] = [];
  for (let i = 0; i < 5; i++) {
    const mesh = createDieMesh();
    const inCupX = CUP.x + (Math.random() - 0.5) * 0.4;
    const inCupY = CUP.y + (i - 2) * 0.18;
    const inCupZ = CUP.z + (Math.random() - 0.5) * 0.4;

    mesh.position.set(inCupX, inCupY, inCupZ);
    mesh.quaternion.setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );

    dice.push({
      mesh,
      pos: mesh.position.clone(),
      vel: new THREE.Vector3(),
      ang: new THREE.Vector3(),
      resting: false,
      inCup: true,
      held: false,
      targetValue: 1,
      settleT: 0,
      snapping: false,
      snapT: 0,
      snapStartQ: new THREE.Quaternion(),
      snapTargetQ: new THREE.Quaternion(),
    });
  }
  return dice;
}

export function layoutInTray(dice: DiceBody[], values: DiceValue[]) {
  const rollCenterZ = 0.8;
  const xStep = (TRAY.maxX - TRAY.minX - HALF * 2) / (dice.length - 1);
  const xStart = TRAY.minX + HALF + 0.1;
  dice.forEach((d, i) => {
    d.pos.set(xStart + xStep * i, HALF, rollCenterZ);
    d.vel.set(0, 0, 0);
    d.ang.set(0, 0, 0);
    d.resting = true;
    d.inCup = false;
    d.held = false;
    d.targetValue = values[i] ?? 1;
    d.mesh.position.copy(d.pos);
    d.mesh.quaternion.copy(makeUprightQuaternion(values[i] ?? 1, (i - 2) * 0.06));
  });
}

export function stepPhysics(dice: DiceBody[], dt: number): boolean {
  let rollingAny = false;

  for (const d of dice) {
    if (d.resting || d.inCup) continue;
    rollingAny = true;

    d.vel.y += G * dt;
    d.pos.addScaledVector(d.vel, dt);

    if (d.pos.y < FLOOR_Y) {
      d.pos.y = FLOOR_Y;
      if (d.vel.y < 0) d.vel.y = -d.vel.y * RESTITUTION;
      d.vel.x *= FRICTION;
      d.vel.z *= FRICTION;
      d.ang.multiplyScalar(ANG_FRICTION);
    }

    if (d.pos.y < TRAY.wallH + HALF + 0.2) {
      if (d.pos.x < TRAY.minX + HALF) {
        d.pos.x = TRAY.minX + HALF;
        d.vel.x = Math.abs(d.vel.x) * 0.55;
      }
      if (d.pos.x > TRAY.maxX - HALF) {
        d.pos.x = TRAY.maxX - HALF;
        d.vel.x = -Math.abs(d.vel.x) * 0.55;
      }
      if (d.pos.z < TRAY.minZ + HALF) {
        d.pos.z = TRAY.minZ + HALF;
        d.vel.z = Math.abs(d.vel.z) * 0.55;
      }
      if (d.pos.z > TRAY.maxZ - HALF) {
        d.pos.z = TRAY.maxZ - HALF;
        d.vel.z = -Math.abs(d.vel.z) * 0.55;
      }
    }

    d.vel.multiplyScalar(0.995);
    d.ang.multiplyScalar(0.992);

    const angle = d.ang.length() * dt;
    if (angle > 1e-5) {
      const axis = d.ang.clone().normalize();
      const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      d.mesh.quaternion.premultiply(dq);
    }

    d.mesh.position.copy(d.pos);

    const onFloor = Math.abs(d.pos.y - FLOOR_Y) < 0.05;
    if (onFloor && d.vel.length() < 0.4 && d.ang.length() < 0.7) {
      d.settleT += dt;
      if (d.settleT > 0.18) {
        d.resting = true;
        d.settleT = 0;
        const yaw = (Math.random() - 0.5) * 0.4;
        d.snapping = true;
        d.snapT = 0;
        d.snapStartQ.copy(d.mesh.quaternion);
        d.snapTargetQ.copy(makeUprightQuaternion(d.targetValue, yaw));
      }
    } else {
      d.settleT = 0;
    }
  }

  return rollingAny;
}

export function stepSnap(dice: DiceBody[], dt: number): boolean {
  let anySnapping = false;
  for (const d of dice) {
    if (!d.snapping) continue;
    anySnapping = true;
    d.snapT += dt;
    const t = Math.min(1, d.snapT / 0.35);
    // easeInOutQuad
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    d.mesh.quaternion.slerpQuaternions(d.snapStartQ, d.snapTargetQ, eased);
    if (t >= 1) {
      d.snapping = false;
      d.mesh.quaternion.copy(d.snapTargetQ);
    }
  }
  return anySnapping;
}

export function resolveCollisions(dice: DiceBody[]) {
  const iterations = 10;
  const minD = COLL_R * 2;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < dice.length; i++) {
      const a = dice[i];
      if (a.inCup) continue;

      for (let j = i + 1; j < dice.length; j++) {
        const b = dice[j];
        if (b.inCup) continue;

        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const dz = b.pos.z - a.pos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < minD * minD && distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          const overlap = minD - dist;

          if (a.held && b.held) {
            // both immovable
          } else if (a.held) {
            b.pos.x += nx * overlap;
            b.pos.y += ny * overlap;
            b.pos.z += nz * overlap;
            if (b.pos.y < FLOOR_Y) b.pos.y = FLOOR_Y + 0.01;
          } else if (b.held) {
            a.pos.x -= nx * overlap;
            a.pos.y -= ny * overlap;
            a.pos.z -= nz * overlap;
            if (a.pos.y < FLOOR_Y) a.pos.y = FLOOR_Y + 0.01;
          } else {
            const push = overlap * 0.6;
            a.pos.x -= nx * push;
            a.pos.y -= ny * push;
            a.pos.z -= nz * push;
            b.pos.x += nx * push;
            b.pos.y += ny * push;
            b.pos.z += nz * push;

            if (a.pos.y < FLOOR_Y) a.pos.y = FLOOR_Y + 0.01;
            if (b.pos.y < FLOOR_Y) b.pos.y = FLOOR_Y + 0.01;

            const rvx = b.vel.x - a.vel.x;
            const rvy = b.vel.y - a.vel.y;
            const rvz = b.vel.z - a.vel.z;
            const velAlongN = rvx * nx + rvy * ny + rvz * nz;

            if (velAlongN < 0) {
              const jImp = -(1 + DIE_RESTITUTION) * velAlongN / 2;
              a.vel.x -= jImp * nx;
              a.vel.y -= jImp * ny;
              a.vel.z -= jImp * nz;
              b.vel.x += jImp * nx;
              b.vel.y += jImp * ny;
              b.vel.z += jImp * nz;

              a.resting = false;
              b.resting = false;
              a.settleT = 0;
              b.settleT = 0;

              const spinMag = Math.min(12, Math.abs(velAlongN) * 6);
              a.ang.x += (Math.random() - 0.5) * spinMag;
              a.ang.y += (Math.random() - 0.5) * spinMag;
              a.ang.z += (Math.random() - 0.5) * spinMag;
              b.ang.x += (Math.random() - 0.5) * spinMag;
              b.ang.y += (Math.random() - 0.5) * spinMag;
              b.ang.z += (Math.random() - 0.5) * spinMag;
            }
          }

          a.mesh.position.copy(a.pos);
          b.mesh.position.copy(b.pos);
        }
      }
    }
  }
}
