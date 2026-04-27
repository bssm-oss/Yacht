// Dice3D — Three.js scene with a cup on the right and a tray.
// User clicks the cup to shake; dice spill from the cup into the tray.
// Tray walls are visible 3D geometry (sunken box) so the toss feels physical.

const { useEffect, useRef, useState } = React;

// ---------- Pip texture ----------
function makeFaceTexture(value, opts = {}) {
  const { bg = "#ffffff", pip = "#1d1d1f", border = "#e5e5e7" } = opts;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const r = 36;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 4; ctx.stroke();
  const drawPip = (x, y) => {
    ctx.fillStyle = pip;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
  };
  const a = 64, b = 128, d = 192;
  const positions = {
    1: [[b,b]], 2: [[a,a],[d,d]], 3: [[a,a],[b,b],[d,d]],
    4: [[a,a],[d,a],[a,d],[d,d]],
    5: [[a,a],[d,a],[b,b],[a,d],[d,d]],
    6: [[a,a],[d,a],[a,b],[d,b],[a,d],[d,d]],
  };
  for (const [x,y] of positions[value]) drawPip(x,y);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8; tex.needsUpdate = true;
  return tex;
}

const FACE_VALUES = [1, 6, 2, 5, 3, 4]; // +X,-X,+Y,-Y,+Z,-Z

function makeUprightQuaternion(value, spinY = 0) {
  const e = new THREE.Euler();
  switch (value) {
    case 1: e.set(0, 0, -Math.PI/2); break;
    case 6: e.set(0, 0,  Math.PI/2); break;
    case 2: e.set(0, 0, 0); break;
    case 5: e.set(Math.PI, 0, 0); break;
    case 3: e.set(Math.PI/2, 0, 0); break;
    case 4: e.set(-Math.PI/2, 0, 0); break;
  }
  const q = new THREE.Quaternion().setFromEuler(e);
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), spinY);
  return q.premultiply(yaw);
}

// Tray geometry constants — defined in world units
const TRAY = {
  // Inner play area (where dice can come to rest)
  minX: -3.4, maxX: 1.6,
  minZ: -2.2, maxZ: 2.2,
  wallH: 0.4,
  thickness: 0.14,
  floorY: 0,
};

// Cup position — sits to the right of the tray
const CUP = {
  x: 3.0,
  y: 1.0,
  z: 0,
  radius: 0.95,
  height: 1.7,
};

window.Dice3D = function Dice3D({
  values, held, onRollComplete, onCupClick, onToggleHold,
  rollSeed = 0, theme = "light",
}) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);

  const onRollCompleteRef = useRef(onRollComplete);
  const onCupClickRef = useRef(onCupClick);
  const onToggleHoldRef = useRef(onToggleHold);
  const valuesRef = useRef(values || [1,2,3,4,5]);
  useEffect(() => { onRollCompleteRef.current = onRollComplete; }, [onRollComplete]);
  useEffect(() => { onCupClickRef.current = onCupClick; }, [onCupClick]);
  useEffect(() => { onToggleHoldRef.current = onToggleHold; }, [onToggleHold]);
  useEffect(() => { valuesRef.current = values; }, [values]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth || 900;
    const h = mount.clientHeight || 540;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w/h, 0.1, 100);
    // Near top-down view — slight tilt so cup is readable
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
    Object.assign(key.shadow.camera, { left:-9, right:9, top:7, bottom:-7, near:1, far:30 });
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.28);
    rim.position.set(-6, 4, -4);
    scene.add(rim);

    // ---------- Tray (sunken box on the table) ----------
    const trayGroup = new THREE.Group();
    scene.add(trayGroup);

    // Tray floor — wood-tone surface using a procedural color
    const trayW = TRAY.maxX - TRAY.minX;
    const trayD = TRAY.maxZ - TRAY.minZ;
    const trayFloor = new THREE.Mesh(
      new THREE.BoxGeometry(trayW + TRAY.thickness*2, 0.12, trayD + TRAY.thickness*2),
      new THREE.MeshStandardMaterial({ color: 0xeeeef0, roughness: 0.9, metalness: 0.0 })
    );
    trayFloor.position.set((TRAY.minX+TRAY.maxX)/2, -0.06, (TRAY.minZ+TRAY.maxZ)/2);
    trayFloor.receiveShadow = true;
    trayGroup.add(trayFloor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcdce0, roughness: 0.85 });
    // Four walls
    const mkWall = (sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
      m.position.set(x, y, z);
      m.castShadow = false; m.receiveShadow = true;
      trayGroup.add(m);
    };
    // Left & right walls
    mkWall(TRAY.thickness, TRAY.wallH, trayD + TRAY.thickness*2,
      TRAY.minX - TRAY.thickness/2, TRAY.wallH/2, (TRAY.minZ+TRAY.maxZ)/2);
    mkWall(TRAY.thickness, TRAY.wallH, trayD + TRAY.thickness*2,
      TRAY.maxX + TRAY.thickness/2, TRAY.wallH/2, (TRAY.minZ+TRAY.maxZ)/2);
    // Front & back walls
    mkWall(trayW, TRAY.wallH, TRAY.thickness,
      (TRAY.minX+TRAY.maxX)/2, TRAY.wallH/2, TRAY.minZ - TRAY.thickness/2);
    mkWall(trayW, TRAY.wallH, TRAY.thickness,
      (TRAY.minX+TRAY.maxX)/2, TRAY.wallH/2, TRAY.maxZ + TRAY.thickness/2);

    // Subtle floor under everything to receive shadows from cup
    const groundShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.14 })
    );
    groundShadow.rotation.x = -Math.PI/2;
    groundShadow.position.y = -0.12;
    groundShadow.receiveShadow = true;
    scene.add(groundShadow);

    // ---------- Cup ----------
    const cupGroup = new THREE.Group();
    cupGroup.position.set(CUP.x, CUP.y, CUP.z);
    scene.add(cupGroup);

    // Cup body — solid cylinder with closed bottom. Lathe starts at r=0 to cap the bottom.
    const cupPoints = [];
    const segs = 14;
    const rTop = CUP.radius * 1.05;
    const rBot = CUP.radius * 0.92;
    // Closed bottom: start at the center axis
    cupPoints.push(new THREE.Vector2(0, -CUP.height/2));
    cupPoints.push(new THREE.Vector2(rBot * 0.6, -CUP.height/2));
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = rBot + (rTop - rBot) * t;
      const y = -CUP.height/2 + CUP.height * t;
      cupPoints.push(new THREE.Vector2(r, y));
    }
    const cupGeo = new THREE.LatheGeometry(cupPoints, 36);
    const cupMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2e, roughness: 0.55, metalness: 0.15, side: THREE.FrontSide,
    });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.castShadow = true;
    cup.receiveShadow = true;
    cupGroup.add(cup);

    // Inner cavity (slightly smaller, inside the cup) — gives depth when looking down
    const innerPoints = [];
    innerPoints.push(new THREE.Vector2(0, -CUP.height/2 + 0.1));
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = (rBot - 0.08) + (rTop - 0.08 - (rBot - 0.08)) * t;
      const y = -CUP.height/2 + 0.1 + (CUP.height - 0.1) * t;
      innerPoints.push(new THREE.Vector2(r, y));
    }
    const innerGeo = new THREE.LatheGeometry(innerPoints, 36);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1c, roughness: 0.85, metalness: 0.0, side: THREE.BackSide,
    });
    const cupInner = new THREE.Mesh(innerGeo, innerMat);
    cupGroup.add(cupInner);
    // Inner rim highlight — a torus
    const rim2 = new THREE.Mesh(
      new THREE.TorusGeometry(rTop, 0.04, 8, 36),
      new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.3 })
    );
    rim2.rotation.x = Math.PI/2;
    rim2.position.y = CUP.height/2;
    cupGroup.add(rim2);

    // ---------- Dice ----------
    const HALF = 0.24;
    const dice = [];
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BoxGeometry(HALF*2, HALF*2, HALF*2);
      const mats = FACE_VALUES.map(v => new THREE.MeshStandardMaterial({
        map: makeFaceTexture(v),
        roughness: 0.42,
        metalness: 0.05,
      }));
      const mesh = new THREE.Mesh(geo, mats);
      mesh.castShadow = true;
      scene.add(mesh);
      // Initial: tucked inside cup (hidden by cup walls)
      const inCupX = CUP.x + (Math.random()-0.5) * 0.4;
      const inCupY = CUP.y + (i - 2) * 0.18;
      const inCupZ = CUP.z + (Math.random()-0.5) * 0.4;
      mesh.position.set(inCupX, inCupY, inCupZ);
      mesh.quaternion.setFromEuler(new THREE.Euler(
        Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2
      ));
      dice.push({
        mesh,
        pos: mesh.position.clone(),
        vel: new THREE.Vector3(),
        ang: new THREE.Vector3(),
        resting: false,
        inCup: true,
        targetValue: (valuesRef.current||[1,2,3,4,5])[i] || 1,
        settleT: 0,
      });
    }

    // Place dice in tray as a tidy row initially (visible state at start)
    const layoutInTray = (vals) => {
      dice.forEach((d, i) => {
        const x = TRAY.minX + (TRAY.maxX - TRAY.minX) * (0.18 + i * 0.16);
        d.pos.set(x, HALF, 0);
        d.vel.set(0,0,0); d.ang.set(0,0,0);
        d.resting = true; d.inCup = false;
        d.targetValue = vals[i];
        d.mesh.position.copy(d.pos);
        d.mesh.quaternion.copy(makeUprightQuaternion(vals[i], (i-2)*0.06));
      });
    };
    layoutInTray(valuesRef.current || [1,2,3,4,5]);

    // ---------- Cup shake animation state ----------
    let cupAnim = null; // { t, duration }

    // ---------- Resize / picking ----------
    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      if (!w2 || !h2) return;
      camera.aspect = w2/h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onPointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      // Check dice first
      const diceHit = raycaster.intersectObjects(dice.map(d => d.mesh));
      if (diceHit.length) {
        const idx = dice.findIndex(d => d.mesh === diceHit[0].object);
        if (idx >= 0 && onToggleHoldRef.current) onToggleHoldRef.current(idx);
        return;
      }
      // Otherwise: any click that isn't on a die counts as a cup tap (more forgiving)
      if (onCupClickRef.current) onCupClickRef.current();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    apiRef.current = {
      startRoll: (targetValues, heldArr) => {
        // Held dice stay where they are in the tray; they don't go back into cup
        // Non-held dice: animate cup shake, then spill from cup into tray
        cupAnim = { t: 0, duration: 0.55, spilled: false };
        dice.forEach((d, i) => {
          if (heldArr?.[i]) {
            d.targetValue = targetValues[i];
            d.resting = true;
            d.inCup = false;
            return;
          }
          // Move into cup briefly during shake
          d.targetValue = targetValues[i];
          d.resting = false;
          d.inCup = true;
          d.settleT = 0;
          d.pos.set(
            CUP.x + (Math.random()-0.5)*0.5,
            CUP.y + (i-2)*0.15,
            CUP.z + (Math.random()-0.5)*0.5,
          );
          d.vel.set(0,0,0);
          d.ang.set(0,0,0);
          d.mesh.position.copy(d.pos);
        });
      },
      syncRestingValues: (vals) => {
        dice.forEach((d, i) => {
          if (!d.resting) return;
          d.targetValue = vals[i];
          d.mesh.quaternion.copy(makeUprightQuaternion(vals[i], (i-2)*0.06));
        });
      },
      getDicePositions: () => dice.map(d => {
        const v = d.mesh.position.clone().project(camera);
        const rect = mount.getBoundingClientRect();
        return {
          x: (v.x*0.5 + 0.5) * rect.width,
          y: (-v.y*0.5 + 0.5) * rect.height,
          inCup: d.inCup,
        };
      }),
      getCupScreenPos: () => {
        const v = new THREE.Vector3(CUP.x, CUP.y + CUP.height/2 + 0.3, CUP.z).project(camera);
        const rect = mount.getBoundingClientRect();
        return {
          x: (v.x*0.5 + 0.5) * rect.width,
          y: (-v.y*0.5 + 0.5) * rect.height,
        };
      },
    };

    // ---------- Loop ----------
    let raf = 0;
    let lastT = performance.now();
    let rolling = false;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;

      // Cup shake animation — rocks the cup mesh
      if (cupAnim) {
        cupAnim.t += dt;
        const p = cupAnim.t / cupAnim.duration;
        if (p < 1) {
          // Wobble cup with a damped sine
          const amp = (1 - p) * 0.35;
          const freq = 22;
          cupGroup.rotation.z = Math.sin(cupAnim.t * freq) * amp;
          cupGroup.rotation.x = Math.cos(cupAnim.t * freq * 0.83) * amp * 0.6;
          cupGroup.position.y = CUP.y + Math.abs(Math.sin(cupAnim.t * freq * 0.5)) * 0.15;
          // Jiggle dice that are still in the cup
          for (const d of dice) {
            if (!d.inCup) continue;
            d.mesh.position.set(
              CUP.x + Math.sin(cupAnim.t*freq + d.targetValue) * 0.18,
              CUP.y + Math.cos(cupAnim.t*freq*0.7 + d.targetValue) * 0.12,
              CUP.z + Math.sin(cupAnim.t*freq*0.5 + d.targetValue) * 0.18,
            );
            d.mesh.rotateX(dt * 8);
            d.mesh.rotateY(dt * 7);
          }
        } else if (!cupAnim.spilled) {
          // Tip the cup toward the tray and spill
          cupGroup.rotation.set(0, 0, 0);
          cupGroup.position.set(CUP.x, CUP.y, CUP.z);
          cupAnim.spilled = true;
          rolling = true;
          for (const d of dice) {
            if (!d.inCup) continue;
            d.inCup = false;
            // Toss toward the tray (negative x direction)
            d.pos.set(
              CUP.x - 0.3,
              CUP.y + 0.1 + Math.random()*0.2,
              CUP.z + (Math.random()-0.5)*0.6,
            );
            d.vel.set(
              -5.5 - Math.random()*1.5,
              -0.5 + Math.random()*0.8,
              (Math.random()-0.5) * 2.5,
            );
            d.ang.set(
              (Math.random()-0.5)*22,
              (Math.random()-0.5)*18,
              (Math.random()-0.5)*22,
            );
            d.mesh.position.copy(d.pos);
            d.mesh.quaternion.setFromEuler(new THREE.Euler(
              Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2
            ));
            d.resting = false;
            d.settleT = 0;
          }
          cupAnim = null;
        }
      }

      // Physics step
      const FLOOR_Y = TRAY.floorY + HALF;
      const G = -32;
      let rollingAny = false;
      for (const d of dice) {
        if (d.resting || d.inCup) continue;
        rollingAny = true;
        d.vel.y += G * dt;
        d.pos.addScaledVector(d.vel, dt);
        // Floor
        if (d.pos.y < FLOOR_Y) {
          d.pos.y = FLOOR_Y;
          if (d.vel.y < 0) d.vel.y = -d.vel.y * 0.42;
          d.vel.x *= 0.78; d.vel.z *= 0.78;
          d.ang.multiplyScalar(0.78);
        }
        // Tray walls — only collide when below wall top
        if (d.pos.y < TRAY.wallH + HALF + 0.2) {
          if (d.pos.x < TRAY.minX + HALF) { d.pos.x = TRAY.minX + HALF; d.vel.x = Math.abs(d.vel.x)*0.55; }
          if (d.pos.x > TRAY.maxX - HALF) { d.pos.x = TRAY.maxX - HALF; d.vel.x = -Math.abs(d.vel.x)*0.55; }
          if (d.pos.z < TRAY.minZ + HALF) { d.pos.z = TRAY.minZ + HALF; d.vel.z = Math.abs(d.vel.z)*0.55; }
          if (d.pos.z > TRAY.maxZ - HALF) { d.pos.z = TRAY.maxZ - HALF; d.vel.z = -Math.abs(d.vel.z)*0.55; }
        }
        // Air drag
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
            d.resting = true; d.settleT = 0;
            const yaw = (Math.random()-0.5) * 0.4;
            d.mesh.quaternion.copy(makeUprightQuaternion(d.targetValue, yaw));
          }
        } else {
          d.settleT = 0;
        }
      }

      // Dice-dice collision pass (sphere approximation)
      const COLL_R = HALF * 1.0;
      for (let i = 0; i < dice.length; i++) {
        const a = dice[i];
        if (a.inCup) continue;
        for (let j = i + 1; j < dice.length; j++) {
          const b = dice[j];
          if (b.inCup) continue;
          const dx = b.pos.x - a.pos.x;
          const dy = b.pos.y - a.pos.y;
          const dz = b.pos.z - a.pos.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          const minD = COLL_R * 2;
          if (distSq < minD*minD && distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist, ny = dy / dist, nz = dz / dist;
            const overlap = minD - dist;
            // Push apart
            const push = overlap * 0.5;
            a.pos.x -= nx * push; a.pos.y -= ny * push; a.pos.z -= nz * push;
            b.pos.x += nx * push; b.pos.y += ny * push; b.pos.z += nz * push;
            // Relative velocity along normal
            const rvx = b.vel.x - a.vel.x;
            const rvy = b.vel.y - a.vel.y;
            const rvz = b.vel.z - a.vel.z;
            const velAlongN = rvx*nx + rvy*ny + rvz*nz;
            if (velAlongN < 0) {
              const restitution = 0.4;
              const jImp = -(1 + restitution) * velAlongN / 2;
              a.vel.x -= jImp * nx; a.vel.y -= jImp * ny; a.vel.z -= jImp * nz;
              b.vel.x += jImp * nx; b.vel.y += jImp * ny; b.vel.z += jImp * nz;
              // Knock both out of resting and add some spin
              a.resting = false; b.resting = false;
              a.settleT = 0; b.settleT = 0;
              const spinMag = Math.min(8, Math.abs(velAlongN) * 4);
              a.ang.x += (Math.random()-0.5) * spinMag;
              a.ang.z += (Math.random()-0.5) * spinMag;
              b.ang.x += (Math.random()-0.5) * spinMag;
              b.ang.z += (Math.random()-0.5) * spinMag;
            }
            a.mesh.position.copy(a.pos);
            b.mesh.position.copy(b.pos);
          }
        }
      }

      if (rolling && !rollingAny && !cupAnim) {
        rolling = false;
        if (onRollCompleteRef.current) onRollCompleteRef.current();
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      try { mount.removeChild(renderer.domElement); } catch (e) {}
      renderer.dispose();
      apiRef.current = null;
    };
  }, []);

  // Trigger roll when seed bumps
  const lastSeedRef = useRef(rollSeed);
  useEffect(() => {
    if (rollSeed === lastSeedRef.current) return;
    lastSeedRef.current = rollSeed;
    if (apiRef.current) apiRef.current.startRoll(values, held);
  }, [rollSeed]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.syncRestingValues(values);
  }, [values?.join(",")]);

  return (
    <div className="dice3d-mount" ref={mountRef}>
      <HeldOverlay apiRef={apiRef} held={held} />
    </div>
  );
};

function HeldOverlay({ apiRef, held }) {
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      force(t => (t+1) % 1024);
      requestAnimationFrame(tick);
    };
    tick();
    return () => { alive = false; };
  }, []);
  if (!apiRef.current) return null;
  const pts = apiRef.current.getDicePositions();
  return (
    <div className="held-overlay">
      {pts.map((p, i) => held?.[i] && !p.inCup ? (
        <div key={i} className="held-pill" style={{ left: p.x, top: p.y + 44 }}>
          <span className="held-dot" />Held
        </div>
      ) : null)}
    </div>
  );
}
