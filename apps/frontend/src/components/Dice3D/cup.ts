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

  const segs = 14;
  const rTop = CUP.radius * 1.05;
  const rBot = CUP.radius * 0.92;

  // Outer cup body (LatheGeometry with closed bottom)
  const cupPoints: THREE.Vector2[] = [];
  cupPoints.push(new THREE.Vector2(0, -CUP.height / 2));
  cupPoints.push(new THREE.Vector2(rBot * 0.6, -CUP.height / 2));
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = rBot + (rTop - rBot) * t;
    const y = -CUP.height / 2 + CUP.height * t;
    cupPoints.push(new THREE.Vector2(r, y));
  }

  const cupGeo = new THREE.LatheGeometry(cupPoints, 36);
  const cupMat = new THREE.MeshStandardMaterial({
    color: 0x2c2c2e,
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.FrontSide,
  });
  const cup = new THREE.Mesh(cupGeo, cupMat);
  cup.castShadow = true;
  cup.receiveShadow = true;
  cupGroup.add(cup);

  // Inner cavity
  const innerPoints: THREE.Vector2[] = [];
  innerPoints.push(new THREE.Vector2(0, -CUP.height / 2 + 0.1));
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = rBot - 0.08 + (rTop - 0.08 - (rBot - 0.08)) * t;
    const y = -CUP.height / 2 + 0.1 + (CUP.height - 0.1) * t;
    innerPoints.push(new THREE.Vector2(r, y));
  }

  const innerGeo = new THREE.LatheGeometry(innerPoints, 36);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1c,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.BackSide,
  });
  const cupInner = new THREE.Mesh(innerGeo, innerMat);
  cupGroup.add(cupInner);

  // Rim highlight
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rTop, 0.04, 8, 36),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.4, metalness: 0.3 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = CUP.height / 2;
  cupGroup.add(rim);

  return cupGroup;
}
