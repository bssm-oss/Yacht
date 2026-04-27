import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { CUP } from './cup';

export interface CupAnimation {
  t: number;
  duration: number;
  spilled: boolean;
  spillProgress: number;
}

// Cup tilt animation phases
// Phase 1: Shake (0-60%)
// Phase 2: Tilt toward tray (60-80%)
// Phase 3: Spill (80-100%)

export function updateCupShake(
  cupGroup: THREE.Group,
  cupAnim: CupAnimation,
  dt: number,
  diceMeshes: THREE.Mesh[]
): { finished: boolean; spilled: boolean; tilting: boolean } {
  cupAnim.t += dt;
  const p = cupAnim.t / cupAnim.duration;

  // Phase 1: Shake (0-60%)
  if (p < 0.6) {
    const shakeP = p / 0.6;
    const amp = (1 - shakeP) * 0.35;
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

    return { finished: false, spilled: false, tilting: false };
  }
  // Phase 2: Tilt toward tray (60-80%)
  else if (p < 0.8) {
    const tiltP = (p - 0.6) / 0.2;
    const easeTilt = tiltP * tiltP * (3 - 2 * tiltP); // smoothstep

    // Tilt cup toward tray (negative X direction)
    cupGroup.rotation.z = 0;
    cupGroup.rotation.x = -easeTilt * 0.8; // Tilt forward
    cupGroup.rotation.y = easeTilt * 0.3; // Slight twist
    cupGroup.position.y = CUP.y - easeTilt * 0.2;
    cupGroup.position.x = CUP.x - easeTilt * 0.3;

    // Move dice toward cup opening
    for (const mesh of diceMeshes) {
      const offsetFromCenter = mesh.position.clone().sub(new THREE.Vector3(CUP.x, CUP.y, CUP.z));
      // Push dice toward the tilted side
      mesh.position.x = CUP.x + offsetFromCenter.x * 0.8 - easeTilt * 0.4;
      mesh.position.y = CUP.y + offsetFromCenter.y * 0.8 + easeTilt * 0.1;
      mesh.position.z = CUP.z + offsetFromCenter.z * 0.9;
      mesh.rotateX(dt * 4);
      mesh.rotateZ(dt * 3);
    }

    return { finished: false, spilled: false, tilting: true };
  }
  // Phase 3: Spill (80-100%)
  else if (!cupAnim.spilled) {
    cupAnim.spilled = true;
    cupAnim.spillProgress = 0;
    return { finished: false, spilled: true, tilting: false };
  }
  // Reset cup after spill
  else if (p < 1) {
    const resetP = (p - 0.8) / 0.2;
    const easeReset = resetP * resetP * (3 - 2 * resetP);

    // Gradually reset cup position
    cupGroup.rotation.x = -0.8 * (1 - easeReset);
    cupGroup.rotation.y = 0.3 * (1 - easeReset);
    cupGroup.position.x = CUP.x - 0.3 * (1 - easeReset);
    cupGroup.position.y = CUP.y - 0.2 * (1 - easeReset);

    return { finished: false, spilled: true, tilting: false };
  }

  // Fully reset
  cupGroup.rotation.set(0, 0, 0);
  cupGroup.position.set(CUP.x, CUP.y, CUP.z);
  return { finished: true, spilled: true, tilting: false };
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
    targetValue?: DiceValue;
  }>,
  targetValues: DiceValue[]
) {
  dice.forEach((d, i) => {
    if (!d.inCup) return;
    d.inCup = false;
    d.targetValue = targetValues[i];

    // Position at cup opening (tilted side)
    const angle = (i / dice.length) * Math.PI - Math.PI / 2;
    const radius = 0.6 + Math.random() * 0.3;

    d.pos.set(
      CUP.x - 0.8 + Math.cos(angle) * radius * 0.5, // Toward tray
      CUP.y + 0.3 + Math.random() * 0.2, // Slightly above cup rim
      CUP.z + Math.sin(angle) * radius * 0.8
    );

    // Velocity toward tray with spread
    d.vel.set(
      -3.5 - Math.random() * 2, // Strong X velocity toward tray
      1.5 + Math.random() * 1.5, // Upward arc
      (Math.random() - 0.5) * 3 // Spread in Z
    );

    // Angular velocity
    d.ang.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );

    d.mesh.position.copy(d.pos);
    d.mesh.quaternion.setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    d.resting = false;
    d.settleT = 0;
  });
}
