import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { TRAY } from './tray';
import { CUP } from './cup';
import { makeUprightQuaternion, createDieMesh } from './dieMesh';

export const HALF = 0.24;
export const FLOOR_Y = TRAY.floorY + HALF;
export const G = -32;
export const RESTITUTION = 0.42;
export const FRICTION = 0.78;
export const ANG_FRICTION = 0.78;
export const COLL_R = HALF * 1.0;
export const DIE_RESTITUTION = 0.4;

export interface DiceBody {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  ang: THREE.Vector3;
  resting: boolean;
  inCup: boolean;
  targetValue: DiceValue;
  settleT: number;
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
      targetValue: 1,
      settleT: 0,
    });
  }
  return dice;
}

export function layoutInTray(dice: DiceBody[], values: DiceValue[]) {
  dice.forEach((d, i) => {
    const x = TRAY.minX + (TRAY.maxX - TRAY.minX) * (0.18 + i * 0.16);
    d.pos.set(x, HALF, 0);
    d.vel.set(0, 0, 0);
    d.ang.set(0, 0, 0);
    d.resting = true;
    d.inCup = false;
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

    // Gravity
    d.vel.y += G * dt;
    d.pos.addScaledVector(d.vel, dt);

    // Floor collision
    if (d.pos.y < FLOOR_Y) {
      d.pos.y = FLOOR_Y;
      if (d.vel.y < 0) d.vel.y = -d.vel.y * RESTITUTION;
      d.vel.x *= FRICTION;
      d.vel.z *= FRICTION;
      d.ang.multiplyScalar(ANG_FRICTION);
    }

    // Wall collisions
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

    // Air drag
    d.vel.multiplyScalar(0.995);
    d.ang.multiplyScalar(0.992);

    // Apply angular velocity
    const angle = d.ang.length() * dt;
    if (angle > 1e-5) {
      const axis = d.ang.clone().normalize();
      const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      d.mesh.quaternion.premultiply(dq);
    }

    d.mesh.position.copy(d.pos);

    // Settling
    const onFloor = Math.abs(d.pos.y - FLOOR_Y) < 0.05;
    if (onFloor && d.vel.length() < 0.4 && d.ang.length() < 0.7) {
      d.settleT += dt;
      if (d.settleT > 0.18) {
        d.resting = true;
        d.settleT = 0;
        const yaw = (Math.random() - 0.5) * 0.4;
        d.mesh.quaternion.copy(makeUprightQuaternion(d.targetValue, yaw));
      }
    } else {
      d.settleT = 0;
    }
  }

  return rollingAny;
}

export function resolveCollisions(dice: DiceBody[]) {
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
      const minD = COLL_R * 2;

      if (distSq < minD * minD && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist,
          ny = dy / dist,
          nz = dz / dist;
        const overlap = minD - dist;

        // Push apart
        const push = overlap * 0.5;
        a.pos.x -= nx * push;
        a.pos.y -= ny * push;
        a.pos.z -= nz * push;
        b.pos.x += nx * push;
        b.pos.y += ny * push;
        b.pos.z += nz * push;

        // Relative velocity
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

          const spinMag = Math.min(8, Math.abs(velAlongN) * 4);
          a.ang.x += (Math.random() - 0.5) * spinMag;
          a.ang.z += (Math.random() - 0.5) * spinMag;
          b.ang.x += (Math.random() - 0.5) * spinMag;
          b.ang.z += (Math.random() - 0.5) * spinMag;
        }

        a.mesh.position.copy(a.pos);
        b.mesh.position.copy(b.pos);
      }
    }
  }
}
