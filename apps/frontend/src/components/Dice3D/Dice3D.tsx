import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { createTray, createGroundShadow, TRAY } from './tray';
import { createCup, CUP } from './cup';
import { createDice, layoutInTray, stepPhysics, resolveCollisions, DiceBody } from './physics';
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

export function Dice3D({ values, held, onRollComplete, onToggleHold, rollSeed = 0 }: Dice3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    dice: DiceBody[];
    cupGroup: THREE.Group;
    heldLights: THREE.PointLight[];
    cupAnim: CupAnimation | null;
    rolling: boolean;
    raf: number;
  } | null>(null);

  const valuesRef = useRef(values);
  const heldRef = useRef(held);
  const callbacksRef = useRef({ onRollComplete, onToggleHold });

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    heldRef.current = held;
  }, [held]);

  useEffect(() => {
    callbacksRef.current = { onRollComplete, onToggleHold };
  }, [onRollComplete, onToggleHold]);

  // Setup scene
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

    // Lights
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

    // Tray
    const trayGroup = createTray();
    scene.add(trayGroup);

    // Ground shadow
    const groundShadow = createGroundShadow();
    scene.add(groundShadow);

    // Cup
    const cupGroup = createCup();
    scene.add(cupGroup);

    // Dice
    const dice = createDice();
    dice.forEach((d) => scene.add(d.mesh));
    layoutInTray(dice, valuesRef.current);

    // Held indicator lights (one per die)
    const heldLights: THREE.PointLight[] = [];
    for (let i = 0; i < 5; i++) {
      const light = new THREE.PointLight(0x0071e3, 0, 2);
      light.position.set(0, 0, 0);
      scene.add(light);
      heldLights.push(light);
    }

    // Resize observer
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

    // Raycaster for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Check dice first
      const diceHit = raycaster.intersectObjects(dice.map((d) => d.mesh));
      if (diceHit.length) {
        const idx = dice.findIndex((d) => d.mesh === diceHit[0].object);
        if (idx >= 0 && callbacksRef.current.onToggleHold) {
          callbacksRef.current.onToggleHold(idx);
        }
        return;
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Animation loop
    let raf = 0;
    let lastT = performance.now();
    let rolling = false;
    let cupAnim: CupAnimation | null = null;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;

      // Cup animation
      if (cupAnim) {
        const result = updateCupShake(cupGroup, cupAnim, dt, dice, valuesRef.current);
        if (result.diceReleased && !rolling) {
          rolling = true;
        }
        if (result.finished) {
          cupAnim = null;
        }
      }

      // Update held dice positions and lights
      const heldArr = heldRef.current;
      dice.forEach((d, i) => {
        if (heldArr?.[i] && !d.inCup && d.resting && !rolling) {
          // Move held dice to top row in tray
          const targetX = TRAY.minX + 0.5 + i * 0.55;
          const targetZ = TRAY.minZ + 0.4;
          const targetY = HALF;

          // Smooth lerp to held position
          d.pos.x += (targetX - d.pos.x) * 0.12;
          d.pos.z += (targetZ - d.pos.z) * 0.12;
          d.pos.y += (targetY - d.pos.y) * 0.12;
          d.vel.set(0, 0, 0);
          d.ang.set(0, 0, 0);
          d.mesh.position.copy(d.pos);

          // Update glow light
          heldLights[i].position.copy(d.pos);
          heldLights[i].position.y += 0.3;
          heldLights[i].intensity = 1.5;

          // Blue emissive glow on die
          const materials = d.mesh.material as THREE.MeshStandardMaterial[];
          materials.forEach((mat) => {
            mat.emissive.setHex(0x0071e3);
            mat.emissiveIntensity = 0.3;
          });
        } else {
          // Turn off glow
          heldLights[i].intensity = 0;
          const materials = d.mesh.material as THREE.MeshStandardMaterial[];
          materials.forEach((mat) => {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          });
        }
      });

      // Physics
      const rollingAny = stepPhysics(dice, dt);
      resolveCollisions(dice);

      if (rolling && !rollingAny && !cupAnim) {
        rolling = false;
        if (callbacksRef.current.onRollComplete) {
          callbacksRef.current.onRollComplete();
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      dice,
      cupGroup,
      heldLights,
      cupAnim,
      rolling,
      raf,
    };

    // Expose API for parent
    (Dice3D as unknown as { api: Dice3DAPI }).api = {
      startRoll: (targetValues: DiceValue[], heldArr: boolean[]) => {
        cupAnim = { t: 0, duration: 1.2, spilled: false, phase: 'shake' };
        dice.forEach((d, i) => {
          if (heldArr?.[i]) {
            d.targetValue = targetValues[i];
            d.resting = true;
            d.inCup = false;
            return;
          }
          d.targetValue = targetValues[i];
          d.resting = false;
          d.inCup = true;
          d.settleT = 0;
          d.pos.set(CUP.x + (Math.random() - 0.5) * 0.5, CUP.y + (i - 2) * 0.15, CUP.z + (Math.random() - 0.5) * 0.5);
          d.vel.set(0, 0, 0);
          d.ang.set(0, 0, 0);
          d.mesh.position.copy(d.pos);
        });
      },
      syncRestingValues: (vals: DiceValue[]) => {
        dice.forEach((d, i) => {
          if (!d.resting) return;
          d.targetValue = vals[i];
          d.mesh.quaternion.copy(makeUprightQuaternion(vals[i], (i - 2) * 0.06));
        });
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      try {
        mount.removeChild(renderer.domElement);
      } catch (e) {
        // ignore
      }
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Handle roll trigger
  const lastSeedRef = useRef(rollSeed);
  useEffect(() => {
    if (rollSeed === lastSeedRef.current) return;
    lastSeedRef.current = rollSeed;
    const api = (Dice3D as unknown as { api?: Dice3DAPI }).api;
    if (api) {
      api.startRoll(values, held);
    }
  }, [rollSeed, values, held]);

  // Sync values
  useEffect(() => {
    const api = (Dice3D as unknown as { api?: Dice3DAPI }).api;
    if (api) {
      api.syncRestingValues(values);
    }
  }, [values.join(',')]);

  return (
    <div className={styles.mount} ref={mountRef} />
  );
}

interface Dice3DAPI {
  startRoll: (targetValues: DiceValue[], heldArr: boolean[]) => void;
  syncRestingValues: (vals: DiceValue[]) => void;
}

export default Dice3D;
