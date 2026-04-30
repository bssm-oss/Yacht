import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { CUP } from './cup';

export interface CupAnimation {
  t: number;
  duration: number;
  spilled: boolean;
  phase: 'shake' | 'tilt' | 'pour' | 'reset';
  /** 0~1: 파워 게이지 강도 (높을수록 빠르고 강하게 흔들기) */
  power: number;
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
  targetValues: DiceValue[],
  /** Optional seeded PRNG for deterministic physics in multiplayer mode */
  seededRng?: () => number,
): { finished: boolean; diceReleased: boolean } {
  const rng = seededRng ?? Math.random;
  cupAnim.t += dt;
  const p = cupAnim.t / cupAnim.duration;
  const pw = cupAnim.power ?? 0.5; // 파워 0~1

  // Phase 1: Shake (0-25%) – 파워에 따라 진폭/주파수 증가
  if (p < 0.25) {
    cupAnim.phase = 'shake';
    const shakeP = p / 0.25;
    const amp = (1 - shakeP * 0.3) * (0.3 + pw * 0.4);  // 파워 높으면 더 크게 흔들기
    const freq = 20 + pw * 12;                             // 파워 높으면 더 빠르게 흔들기
    cupGroup.rotation.z = Math.sin(cupAnim.t * freq) * amp;
    cupGroup.rotation.x = Math.cos(cupAnim.t * freq * 0.7) * amp * 0.5;
    cupGroup.position.y = CUP.y + Math.abs(Math.sin(cupAnim.t * freq * 0.5)) * (0.08 + pw * 0.1);

    // Jiggle dice in cup
    for (const d of dice) {
      if (!d.inCup) continue;
      d.mesh.position.set(
        CUP.x + Math.sin(cupAnim.t * freq + d.mesh.id) * (0.12 + pw * 0.08),
        CUP.y + Math.cos(cupAnim.t * freq * 0.6 + d.mesh.id) * 0.1,
        CUP.z + Math.sin(cupAnim.t * freq * 0.4 + d.mesh.id) * (0.12 + pw * 0.08)
      );
      d.mesh.rotateX(dt * (5 + pw * 6));
      d.mesh.rotateY(dt * (4 + pw * 5));
    }

    return { finished: false, diceReleased: false };
  }
  // Phase 2: Tilt LEFT toward tray (25-40%)
  else if (p < 0.4) {
    cupAnim.phase = 'tilt';
    const tiltP = (p - 0.25) / 0.15;
    const easeTilt = tiltP * tiltP * (3 - 2 * tiltP);

    cupGroup.rotation.z = easeTilt * (0.85 + pw * 0.3);
    cupGroup.rotation.x = Math.sin(easeTilt * Math.PI) * 0.2;
    cupGroup.position.x = CUP.x - easeTilt * (0.3 + pw * 0.2);
    cupGroup.position.y = CUP.y + Math.sin(easeTilt * Math.PI) * 0.15;

    for (const d of dice) {
      if (!d.inCup) continue;
      const offsetX = d.mesh.position.x - CUP.x;
      const offsetZ = d.mesh.position.z - CUP.z;
      d.mesh.position.x += (-0.8 - offsetX * 0.6) * dt * 3;
      d.mesh.position.y += (-0.3) * dt * 2;
      d.mesh.position.z += (-offsetZ * 0.4) * dt * 2;
      d.mesh.rotateX(dt * 8);
      d.mesh.rotateZ(dt * 6);
    }

    return { finished: false, diceReleased: false };
  }
  // Phase 3: Pour (40-70%) – 파워에 따라 속도 조절
  else if (p < 0.7) {
    if (cupAnim.phase !== 'pour') {
      cupAnim.phase = 'pour';
      dice.forEach((d, i) => {
        if (!d.inCup) return;
        d.inCup = false;
        d.targetValue = targetValues[i];

        const offsetX = d.mesh.position.x - CUP.x;
        const offsetZ = d.mesh.position.z - CUP.z;

        d.pos.set(
          CUP.x - 0.9 + offsetX * 0.3,
          CUP.y + 0.2,
          CUP.z + offsetZ * 0.3
        );

        // 파워에 따라 초기 속도 조절 (낮으면 살살, 높으면 강하게)
        const speedX = -(4 + pw * 5) - rng() * 2;
        const speedY  = 1.5 + pw * 2 + rng() * 1.5;
        const spreadZ = (0.5 + pw * 0.8);
        d.vel.set(
          speedX,
          speedY,
          (rng() - 0.5) * spreadZ
        );

        // 파워에 따라 회전 강도 조절
        const angScale = 12 + pw * 14;
        d.ang.set(
          (rng() - 0.5) * angScale,
          (rng() - 0.5) * angScale,
          (rng() - 0.5) * angScale
        );

        d.mesh.position.copy(d.pos);
        d.resting = false;
        d.settleT = 0;
      });
    }

    const tiltZ = 0.85 + pw * 0.3;
    cupGroup.rotation.z = tiltZ;
    cupGroup.rotation.x = 0.2;
    cupGroup.position.x = CUP.x - (0.3 + pw * 0.2);
    cupGroup.position.y = CUP.y;

    return { finished: false, diceReleased: true };
  }
  // Phase 4: Reset (70-100%)
  else if (p < 1) {
    cupAnim.phase = 'reset';
    const resetP = (p - 0.7) / 0.3;
    const easeReset = resetP * resetP * (3 - 2 * resetP);
    const tiltZ = 0.85 + pw * 0.3;

    cupGroup.rotation.z = tiltZ * (1 - easeReset);
    cupGroup.rotation.x = 0.2 * (1 - easeReset);
    cupGroup.position.x = CUP.x - (0.3 + pw * 0.2) * (1 - easeReset);
    cupGroup.position.y = CUP.y;

    return { finished: false, diceReleased: true };
  }

  // Fully reset
  cupGroup.rotation.set(0, 0, 0);
  cupGroup.position.set(CUP.x, CUP.y, CUP.z);
  return { finished: true, diceReleased: true };
}
