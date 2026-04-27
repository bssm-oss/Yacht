import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { CUP } from './cup';

export interface CupAnimation {
  t: number;
  duration: number;
  spilled: boolean;
}

export function updateCupShake(
  cupGroup: THREE.Group,
  cupAnim: CupAnimation,
  dt: number,
  diceMeshes: THREE.Mesh[]
): { finished: boolean; spilled: boolean } {
  cupAnim.t += dt;
  const p = cupAnim.t / cupAnim.duration;

  if (p < 1) {
    // Wobble
    const amp = (1 - p) * 0.35;
    const freq = 22;
    cupGroup.rotation.z = Math.sin(cupAnim.t * freq) * amp;
    cupGroup.rotation.x = Math.cos(cupAnim.t * freq * 0.83) * amp * 0.6;
    cupGroup.position.y = CUP.y + Math.abs(Math.sin(cupAnim.t * freq * 0.5)) * 0.15;

    // Jiggle dice in cup
    for (const mesh of diceMeshes) {
      mesh.position.set(
        CUP.x + Math.sin(cupAnim.t * freq + mesh.id) * 0.18,
        CUP.y + Math.cos(cupAnim.t * freq * 0.7 + mesh.id) * 0.12,
        CUP.z + Math.sin(cupAnim.t * freq * 0.5 + mesh.id) * 0.18
      );
      mesh.rotateX(dt * 8);
      mesh.rotateY(dt * 7);
    }

    return { finished: false, spilled: false };
  } else if (!cupAnim.spilled) {
    // Reset cup
    cupGroup.rotation.set(0, 0, 0);
    cupGroup.position.set(CUP.x, CUP.y, CUP.z);
    cupAnim.spilled = true;
    return { finished: false, spilled: true };
  }

  return { finished: true, spilled: true };
}

export function spillDice(
  dice: Array<{
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    ang: THREE.Vector3;
    mesh: THREE.Mesh;
    resting: boolean;
    inCup: boolean;
    settleT: number;
  }>,
  targetValues: DiceValue[]
) {
  dice.forEach((d, i) => {
    if (!d.inCup) return;
    d.inCup = false;
    d.targetValue = targetValues[i];
    d.pos.set(CUP.x - 0.3, CUP.y + 0.1 + Math.random() * 0.2, CUP.z + (Math.random() - 0.5) * 0.6);
    d.vel.set(-5.5 - Math.random() * 1.5, -0.5 + Math.random() * 0.8, (Math.random() - 0.5) * 2.5);
    d.ang.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 22);
    d.mesh.position.copy(d.pos);
    d.mesh.quaternion.setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    d.resting = false;
    d.settleT = 0;
  });
}
