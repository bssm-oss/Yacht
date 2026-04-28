import * as THREE from 'three';

export interface TrayConfig {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  wallH: number;
  thickness: number;
  floorY: number;
}

export const TRAY: TrayConfig = {
  minX: -3.4,
  maxX: 1.6,
  minZ: -2.2,
  maxZ: 2.2,
  wallH: 0.4,
  thickness: 0.14,
  floorY: 0,
};

// Hold zone at back of tray (negative Z = top of screen)
export const HOLD_ZONE_Z = TRAY.minZ + 0.55; // -1.65

const SLOT_SPACING = (TRAY.maxX - TRAY.minX) / 5; // 1.0

export const HOLD_SLOTS: { x: number; z: number }[] = Array.from({ length: 5 }, (_, i) => ({
  x: TRAY.minX + SLOT_SPACING * (i + 0.5),
  z: HOLD_ZONE_Z,
}));

export function createTray(): THREE.Group {
  const trayGroup = new THREE.Group();

  const trayW = TRAY.maxX - TRAY.minX;
  const trayD = TRAY.maxZ - TRAY.minZ;

  // Main floor
  const trayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(trayW + TRAY.thickness * 2, 0.12, trayD + TRAY.thickness * 2),
    new THREE.MeshStandardMaterial({ color: 0xeeeef0, roughness: 0.9, metalness: 0.0 })
  );
  trayFloor.position.set((TRAY.minX + TRAY.maxX) / 2, -0.06, (TRAY.minZ + TRAY.maxZ) / 2);
  trayFloor.receiveShadow = true;
  trayGroup.add(trayFloor);

  // Hold zone tinted strip
  const holdStripDepth = HOLD_ZONE_Z - TRAY.minZ + 0.2;
  const holdStrip = new THREE.Mesh(
    new THREE.BoxGeometry(trayW, 0.008, holdStripDepth),
    new THREE.MeshStandardMaterial({ color: 0xd8e8f8, roughness: 0.9, metalness: 0.0 })
  );
  holdStrip.position.set(
    (TRAY.minX + TRAY.maxX) / 2,
    0.001,
    TRAY.minZ + holdStripDepth / 2
  );
  trayGroup.add(holdStrip);

  // Divider line between hold zone and roll zone
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(trayW, 0.012, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xb0c8e8, roughness: 0.7, metalness: 0.0 })
  );
  divider.position.set((TRAY.minX + TRAY.maxX) / 2, 0.002, HOLD_ZONE_Z + 0.22);
  trayGroup.add(divider);

  // Slot pads (5 individual slot indicators)
  const padMat = new THREE.MeshStandardMaterial({ color: 0xbcd4f0, roughness: 0.65, metalness: 0.0 });
  HOLD_SLOTS.forEach((slot) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.01, 0.54), padMat);
    pad.position.set(slot.x, 0.003, slot.z);
    pad.receiveShadow = true;
    trayGroup.add(pad);
  });

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcdce0, roughness: 0.85 });

  const mkWall = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = true;
    trayGroup.add(m);
  };

  mkWall(
    TRAY.thickness,
    TRAY.wallH,
    trayD + TRAY.thickness * 2,
    TRAY.minX - TRAY.thickness / 2,
    TRAY.wallH / 2,
    (TRAY.minZ + TRAY.maxZ) / 2
  );
  mkWall(
    TRAY.thickness,
    TRAY.wallH,
    trayD + TRAY.thickness * 2,
    TRAY.maxX + TRAY.thickness / 2,
    TRAY.wallH / 2,
    (TRAY.minZ + TRAY.maxZ) / 2
  );
  mkWall(
    trayW,
    TRAY.wallH,
    TRAY.thickness,
    (TRAY.minX + TRAY.maxX) / 2,
    TRAY.wallH / 2,
    TRAY.minZ - TRAY.thickness / 2
  );
  mkWall(
    trayW,
    TRAY.wallH,
    TRAY.thickness,
    (TRAY.minX + TRAY.maxX) / 2,
    TRAY.wallH / 2,
    TRAY.maxZ + TRAY.thickness / 2
  );

  return trayGroup;
}

export function createGroundShadow(): THREE.Mesh {
  const groundShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.14 })
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = -0.12;
  groundShadow.receiveShadow = true;
  return groundShadow;
}
