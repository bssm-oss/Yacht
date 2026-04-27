import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { CUP } from './cup';

export interface CupAnimation {
  t: number;
  duration: number;
  spilled: boolean;
  phase: 'shake' | 'tilt' | 'pour' | 'reset';
}

// Cup animation:
// 1. Shake (0-25%)
// 2. Tilt left toward tray (25-40%)
// 3. Pour - dice fly out with acceleration (40-70%)
// 4. Reset cup (70-100%)

export function updateCupShake(
  cupGroup: THREE.Group,
  cupAnim: CupAnimation,
  dt: number,
  dice: Array<{
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    ang: THREE.Vector3;
    mesh: THREE.Mesh;
    resting: boolean;
    inCup: boolean;
    settleT: number;
    targetValue?: DiceValue;
  }>,
  targetValues: DiceValue[]
): { finished: boolean; diceReleased: boolean } {
  cupAnim.t += dt;
  const p = cupAnim.t / cupAnim.duration;

  // Phase 1: Shake (0-25%)
  if (p < 0.25) {
    cupAnim.phase = 'shake';
    const shakeP = p / 0.25;
    const amp = (1 - shakeP * 0.3) * 0.4;
    const freq = 24;
    cupGroup.rotation.z = Math.sin(cupAnim.t * freq) * amp;
    cupGroup.rotation.x = Math.cos(cupAnim.t * freq * 0.7) * amp * 0.5;
    cupGroup.position.y = CUP.y + Math.abs(Math.sin(cupAnim.t * freq * 0.5)) * 0.12;

    // Jiggle dice in cup
    for (const d of dice) {
      if (!d.inCup) continue;
      d.mesh.position.set(
        CUP.x + Math.sin(cupAnim.t * freq + d.mesh.id) * 0.15,
        CUP.y + Math.cos(cupAnim.t * freq * 0.6 + d.mesh.id) * 0.1,
        CUP.z + Math.sin(cupAnim.t * freq * 0.4 + d.mesh.id) * 0.15
      );
      d.mesh.rotateX(dt * 6);
      d.mesh.rotateY(dt * 5);
    }

    return { finished: false, diceReleased: false };
  }
  // Phase 2: Tilt LEFT toward tray (25-40%)
  else if (p < 0.4) {
    cupAnim.phase = 'tilt';
    const tiltP = (p - 0.25) / 0.15;
    const easeTilt = tiltP * tiltP * (3 - 2 * tiltP);

    // Tilt cup LEFT (toward negative X / tray direction)
    // Rotate around Z axis to tilt left
    cupGroup.rotation.z = easeTilt * 1.0; // Tilt left
    cupGroup.rotation.x = Math.sin(easeTilt * Math.PI) * 0.2; // Slight forward wobble
    cupGroup.position.x = CUP.x - easeTilt * 0.4; // Move slightly toward tray
    cupGroup.position.y = CUP.y + Math.sin(easeTilt * Math.PI) * 0.15; // Dip down then up

    // Dice slide toward left opening
    for (const d of dice) {
      if (!d.inCup) continue;
      const offsetX = d.mesh.position.x - CUP.x;
      const offsetZ = d.mesh.position.z - CUP.z;
      // Gravity pulls dice toward tilted left side
      d.mesh.position.x += (-0.8 - offsetX * 0.6) * dt * 3;
      d.mesh.position.y += (-0.3) * dt * 2;
      d.mesh.position.z += (-offsetZ * 0.4) * dt * 2;
      d.mesh.rotateX(dt * 8);
      d.mesh.rotateZ(dt * 6);
    }

    return { finished: false, diceReleased: false };
  }
  // Phase 3: Pour (40-70%) - dice FLY out with force
  else if (p < 0.7) {
    if (cupAnim.phase !== 'pour') {
      cupAnim.phase = 'pour';
      // Release dice with strong velocity
      dice.forEach((d, i) => {
        if (!d.inCup) return;
        d.inCup = false;
        d.targetValue = targetValues[i];

        // Position at cup opening (left side)
        const offsetX = d.mesh.position.x - CUP.x;
        const offsetZ = d.mesh.position.z - CUP.z;

        d.pos.set(
          CUP.x - 0.9 + offsetX * 0.3,
          CUP.y + 0.2,
          CUP.z + offsetZ * 0.3
        );

        // STRONG velocity toward tray (left/down)
        const spread = 0.8;
        d.vel.set(
          -6 - Math.random() * 3, // Strong leftward velocity
          2 + Math.random() * 2, // Upward arc
          (Math.random() - 0.5) * spread // Slight Z spread
        );

        // High angular velocity for tumbling
        d.ang.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        );

        d.mesh.position.copy(d.pos);
        d.resting = false;
        d.settleT = 0;
      });
    }

    // Keep cup tilted during pour
    cupGroup.rotation.z = 1.0;
    cupGroup.rotation.x = 0.2;
    cupGroup.position.x = CUP.x - 0.4;
    cupGroup.position.y = CUP.y;

    return { finished: false, diceReleased: true };
  }
  // Phase 4: Reset (70-100%)
  else if (p < 1) {
    cupAnim.phase = 'reset';
    const resetP = (p - 0.7) / 0.3;
    const easeReset = resetP * resetP * (3 - 2 * resetP);

    cupGroup.rotation.z = 1.0 * (1 - easeReset);
    cupGroup.rotation.x = 0.2 * (1 - easeReset);
    cupGroup.position.x = CUP.x - 0.4 * (1 - easeReset);
    cupGroup.position.y = CUP.y;

    return { finished: false, diceReleased: true };
  }

  // Fully reset
  cupGroup.rotation.set(0, 0, 0);
  cupGroup.position.set(CUP.x, CUP.y, CUP.z);
  return { finished: true, diceReleased: true };
}
