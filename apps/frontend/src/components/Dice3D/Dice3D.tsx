import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { createTray, createGroundShadow, HOLD_SLOTS } from './tray';
import { createCup, CUP } from './cup';
import { createDice, layoutInTray, stepPhysics, stepSnap, resolveCollisions, HALF, DiceBody } from './physics';
import { makeUprightQuaternion } from './dieMesh';
import { updateCupShake, CupAnimation } from './cupAnimation';

import styles from './Dice3D.module.css';

interface Dice3DProps {
  values: DiceValue[];
  held: boolean[];
  onRollComplete?: () => void;
  onToggleHold?: (index: number) => void;
  rollSeed?: number;
}

interface ScreenPos {
  x: number;
  y: number;
}

export function Dice3D({ values, held, onRollComplete, onToggleHold, rollSeed = 0 }: Dice3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dicePositions, setDicePositions] = useState<ScreenPos[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const valuesRef = useRef(values);
  const heldRef = useRef(held);
  const callbacksRef = useRef({ onRollComplete, onToggleHold });
  const diceRef = useRef<DiceBody[]>([]);

  useEffect(() => { valuesRef.current = values; }, [values]);
  useEffect(() => { heldRef.current = held; }, [held]);
  useEffect(() => { callbacksRef.current = { onRollComplete, onToggleHold }; }, [onRollComplete, onToggleHold]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 900;
    const h = mount.clientHeight || 540;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(0, 13, 3.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(4, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 1, far: 30 });
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.28);
    rim.position.set(-6, 4, -4);
    scene.add(rim);

    scene.add(createTray());
    scene.add(createGroundShadow());

    const cupGroup = createCup();
    scene.add(cupGroup);

    const dice = createDice();
    dice.forEach((d) => scene.add(d.mesh));
    layoutInTray(dice, valuesRef.current);
    diceRef.current = dice;

    const onResize = () => {
      const w2 = mount.clientWidth;
      const h2 = mount.clientHeight;
      if (!w2 || !h2) return;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const onPointerDown = (e: PointerEvent) => {
      if (!diceRef.current.length) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let closestIdx = -1;
      let closestDist = 44;

      diceRef.current.forEach((d, i) => {
        if (d.inCup) return;
        const screenPos = d.mesh.position.clone().project(camera);
        const sx = (screenPos.x * 0.5 + 0.5) * rect.width;
        const sy = (-screenPos.y * 0.5 + 0.5) * rect.height;
        const dist = Math.sqrt((clickX - sx) ** 2 + (clickY - sy) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });

      if (closestIdx >= 0 && callbacksRef.current.onToggleHold) {
        callbacksRef.current.onToggleHold(closestIdx);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let raf = 0;
    let lastT = performance.now();
    let rolling = false;
    let cupAnim: CupAnimation | null = null;
    let prevHeld = new Array(5).fill(false);

    // dieToSlot[i] = which hold slot die i occupies (-1 = none)
    const dieToSlot = new Array(5).fill(-1);

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;

      if (cupAnim) {
        const result = updateCupShake(cupGroup, cupAnim, dt, dice, valuesRef.current);
        if (result.diceReleased && !rolling) rolling = true;
        if (result.finished) cupAnim = null;
      }

      const heldArr = heldRef.current;

      dice.forEach((d, i) => {
        const isHeld = heldArr?.[i] ?? false;
        const wasHeld = prevHeld[i];

        d.held = isHeld;

        if (!wasHeld && isHeld && !d.inCup) {
          // Just became held: assign next free slot in order
          const usedSlots = new Set(dieToSlot.filter((s) => s >= 0));
          for (let s = 0; s < 5; s++) {
            if (!usedSlots.has(s)) {
              dieToSlot[i] = s;
              break;
            }
          }
          d.resting = true;
          d.vel.set(0, 0, 0);
          d.ang.set(0, 0, 0);
          d.settleT = 0;
        }

        if (wasHeld && !isHeld && !d.inCup) {
          // Just un-held: free slot and launch back to roll zone
          dieToSlot[i] = -1;
          d.resting = false;
          d.settleT = 0;
          d.vel.set(
            (Math.random() - 0.5) * 1.5,
            2.0,
            3.5 + Math.random() * 1.5
          );
          d.ang.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          );
        }

        if (isHeld && !d.inCup) {
          const slotIdx = dieToSlot[i];
          if (slotIdx >= 0) {
            const slot = HOLD_SLOTS[slotIdx];
            d.pos.x += (slot.x - d.pos.x) * 0.12;
            d.pos.z += (slot.z - d.pos.z) * 0.12;
            d.pos.y += (HALF - d.pos.y) * 0.12;
            d.vel.set(0, 0, 0);
            d.ang.set(0, 0, 0);
            d.resting = true;
            d.mesh.position.copy(d.pos);
            d.mesh.quaternion.slerp(makeUprightQuaternion(d.targetValue, 0), 0.08);
          }
        }
      });

      prevHeld = [...(heldArr ?? new Array(5).fill(false))];

      const rollingAny = stepPhysics(dice, dt);
      resolveCollisions(dice);
      const snapping = stepSnap(dice, dt);

      if (rolling && !rollingAny && !cupAnim && !snapping) {
        rolling = false;
        if (callbacksRef.current.onRollComplete) {
          callbacksRef.current.onRollComplete();
        }
      }

      const rect2 = renderer.domElement.getBoundingClientRect();
      const positions: ScreenPos[] = dice.map((d) => {
        const v = d.mesh.position.clone().project(camera);
        return {
          x: (v.x * 0.5 + 0.5) * rect2.width,
          y: (-v.y * 0.5 + 0.5) * rect2.height,
        };
      });
      setDicePositions(positions);
      setIsRolling(rolling);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    (Dice3D as unknown as { api: Dice3DAPI }).api = {
      startRoll: (targetValues: DiceValue[], heldArr: boolean[]) => {
        cupAnim = { t: 0, duration: 1.2, spilled: false, phase: 'shake' };
        dice.forEach((d, i) => {
          if (heldArr?.[i]) {
            d.targetValue = targetValues[i];
            d.resting = true;
            d.inCup = false;
            d.held = true;
            return;
          }
          d.targetValue = targetValues[i];
          d.resting = false;
          d.inCup = true;
          d.held = false;
          d.settleT = 0;
          d.pos.set(CUP.x + (Math.random() - 0.5) * 0.5, CUP.y + (i - 2) * 0.15, CUP.z + (Math.random() - 0.5) * 0.5);
          d.vel.set(0, 0, 0);
          d.ang.set(0, 0, 0);
          d.mesh.position.copy(d.pos);
        });
      },
      syncRestingValues: (vals: DiceValue[]) => {
        dice.forEach((d, i) => {
          if (!d.resting || d.snapping) return;
          d.targetValue = vals[i];
          d.mesh.quaternion.copy(makeUprightQuaternion(vals[i], (i - 2) * 0.06));
        });
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      try { mount.removeChild(renderer.domElement); } catch (_) { /* ignore */ }
      renderer.dispose();
      diceRef.current = [];
    };
  }, []);

  const lastSeedRef = useRef(rollSeed);
  useEffect(() => {
    if (rollSeed === lastSeedRef.current) return;
    lastSeedRef.current = rollSeed;
    const api = (Dice3D as unknown as { api?: Dice3DAPI }).api;
    if (api) api.startRoll(values, held);
  }, [rollSeed, values, held]);

  useEffect(() => {
    const api = (Dice3D as unknown as { api?: Dice3DAPI }).api;
    if (api) api.syncRestingValues(values);
  }, [values.join(',')]);

  return (
    <div className={styles.mount} ref={mountRef}>
      {dicePositions.map((pos, i) => (
        <button
          key={i}
          className={`${styles.diceHitbox} ${held[i] ? styles.diceHeld : ''} ${!isRolling ? styles.diceClickable : ''}`}
          style={{ left: pos.x, top: pos.y }}
          onClick={() => !isRolling && onToggleHold?.(i)}
          aria-label={`주사위 ${i + 1}: ${values[i]}${held[i] ? ' (고정)' : ''}`}
        >
          {held[i] && <span className={styles.heldBadge}>고정</span>}
        </button>
      ))}
    </div>
  );
}

interface Dice3DAPI {
  startRoll: (targetValues: DiceValue[], heldArr: boolean[]) => void;
  syncRestingValues: (vals: DiceValue[]) => void;
}

export default Dice3D;
