import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { DiceValue } from '@shared/types/game';
import { createTray, createGroundShadow, TRAY } from './tray';
import { createCup, CUP } from './cup';
import { createDice, layoutInTray, stepPhysics, resolveCollisions, DiceBody } from './physics';
import { makeUprightQuaternion } from './dieMesh';
import { updateCupShake, spillDice, CupAnimation } from './cupAnimation';

import styles from './Dice3D.module.css';

interface Dice3DProps {
  values: DiceValue[];
  held: boolean[];
  onRollComplete?: () => void;
  onCupClick?: () => void;
  onToggleHold?: (index: number) => void;
  rollSeed?: number;
}

export function Dice3D({ values, held, onRollComplete, onCupClick, onToggleHold, rollSeed = 0 }: Dice3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    dice: DiceBody[];
    cupGroup: THREE.Group;
    cupAnim: CupAnimation | null;
    rolling: boolean;
    raf: number;
  } | null>(null);

  const valuesRef = useRef(values);
  const heldRef = useRef(held);
  const callbacksRef = useRef({ onRollComplete, onCupClick, onToggleHold });

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    heldRef.current = held;
  }, [held]);

  useEffect(() => {
    callbacksRef.current = { onRollComplete, onCupClick, onToggleHold };
  }, [onRollComplete, onCupClick, onToggleHold]);

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

      // Otherwise cup click
      if (callbacksRef.current.onCupClick) {
        callbacksRef.current.onCupClick();
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

      // Cup shake animation
      if (cupAnim) {
        const result = updateCupShake(cupGroup, cupAnim, dt, dice.map((d) => d.mesh));
        if (result.spilled && !result.finished && !rolling) {
          rolling = true;
          spillDice(dice, valuesRef.current);
        }
        if (result.finished) {
          cupAnim = null;
        }
      }

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
      cupAnim,
      rolling,
      raf,
    };

    // Expose API for parent
    (Dice3D as unknown as { api: Dice3DAPI }).api = {
      startRoll: (targetValues: DiceValue[], heldArr: boolean[]) => {
        cupAnim = { t: 0, duration: 0.9, spilled: false, spillProgress: 0 };
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
      getDicePositions: () => {
        return dice.map((d) => {
          const v = d.mesh.position.clone().project(camera);
          const rect = mount.getBoundingClientRect();
          return {
            x: (v.x * 0.5 + 0.5) * rect.width,
            y: (-v.y * 0.5 + 0.5) * rect.height,
            inCup: d.inCup,
          };
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
    <div className={styles.mount} ref={mountRef}>
      <HeldOverlay held={held} />
    </div>
  );
}

interface Dice3DAPI {
  startRoll: (targetValues: DiceValue[], heldArr: boolean[]) => void;
  syncRestingValues: (vals: DiceValue[]) => void;
  getDicePositions: () => { x: number; y: number; inCup: boolean }[];
}

function HeldOverlay({ held }: { held: boolean[] }) {
  const [, force] = useState(0);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      force((t) => (t + 1) % 1024);
      requestAnimationFrame(tick);
    };
    tick();
    return () => {
      alive = false;
    };
  }, []);

  const api = (Dice3D as unknown as { api?: Dice3DAPI }).api;
  if (!api) return null;

  const pts = api.getDicePositions();
  return (
    <div className={styles.heldOverlay}>
      {pts.map(
        (p, i) =>
          held?.[i] && !p.inCup && (
            <div key={i} className={styles.heldPill} style={{ left: p.x, top: p.y + 44 }}>
              <span className={styles.heldDot} />
              Held
            </div>
          )
      )}
    </div>
  );
}

export default Dice3D;
