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

export function createTray(): THREE.Group {
  const trayGroup = new THREE.Group();

  const trayW = TRAY.maxX - TRAY.minX;
  const trayD = TRAY.maxZ - TRAY.minZ;

  // Floor
  const trayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(trayW + TRAY.thickness * 2, 0.12, trayD + TRAY.thickness * 2),
    new THREE.MeshStandardMaterial({ color: 0xeeeef0, roughness: 0.9, metalness: 0.0 })
  );
  trayFloor.position.set((TRAY.minX + TRAY.maxX) / 2, -0.06, (TRAY.minZ + TRAY.maxZ) / 2);
  trayFloor.receiveShadow = true;
  trayGroup.add(trayFloor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcdce0, roughness: 0.85 });

  const mkWall = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = true;
    trayGroup.add(m);
  };

  // Left & right walls
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
  // Front & back walls
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
