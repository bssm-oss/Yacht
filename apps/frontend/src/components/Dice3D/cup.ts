import * as THREE from 'three';

export const CUP = {
  x: 3.0,
  y: 1.0,
  z: 0,
  radius: 0.95,
  height: 1.7,
};

export function createCup(): THREE.Group {
  const cupGroup = new THREE.Group();
  cupGroup.position.set(CUP.x, CUP.y, CUP.z);

  const wallT = 0.13;
  const r = CUP.radius;
  const rIn = r - wallT;
  const h = CUP.height;
  const N = 32;

  const matOut = new THREE.MeshStandardMaterial({
    color: 0xc2714f,
    roughness: 0.62,
    metalness: 0.04,
  });
  const matIn = new THREE.MeshStandardMaterial({
    color: 0x9e5038,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.BackSide,
  });

  // Outer wall (straight cylinder, open top)
  const outerWall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, N, 1, true), matOut);
  outerWall.castShadow = true;
  outerWall.receiveShadow = true;
  cupGroup.add(outerWall);

  // Thick flat bottom (solid disc)
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(r, r, wallT, N), matOut);
  bottom.position.y = -h / 2 + wallT / 2;
  bottom.castShadow = true;
  cupGroup.add(bottom);

  // Inner wall (back-face visible when looking down)
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(rIn, rIn, h - wallT * 0.5, N, 1, true),
    matIn
  );
  innerWall.position.y = wallT * 0.25;
  cupGroup.add(innerWall);

  // Inner bottom (faces up, visible from above)
  const innerBot = new THREE.Mesh(
    new THREE.CircleGeometry(rIn, N),
    new THREE.MeshStandardMaterial({ color: 0x9e5038, roughness: 0.9 })
  );
  innerBot.rotation.x = -Math.PI / 2;
  innerBot.position.y = -h / 2 + wallT + 0.005;
  cupGroup.add(innerBot);

  // Top rim torus
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry((r + rIn) / 2, wallT / 2, 8, N),
    new THREE.MeshStandardMaterial({ color: 0xd47a5a, roughness: 0.5, metalness: 0.08 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h / 2;
  rim.castShadow = true;
  cupGroup.add(rim);

  return cupGroup;
}
