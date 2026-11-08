import type { FaceAnchors, Point } from './ar-effects';
export type TrackingSnapshot = { faces: FaceAnchors[]; at: number };
const keys = ['eyeL','eyeR','foreheadTop','chin','noseTip','mouthL','mouthR','cheekL','cheekR'] as const;
export function validFaces(value: unknown): value is FaceAnchors[] {
  return Array.isArray(value) && value.length <= 2 && value.every(face => face && keys.every(key => {
    const p = face[key]; return p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 2 && Math.abs(p.y) <= 2;
  }));
}
export function freshFaces(snapshot: TrackingSnapshot, now: number): FaceAnchors[] {
  return now - snapshot.at < 300 ? snapshot.faces : [];
}
// Match by position, not array index: detector order can swap when two people move.
export function smoothFaces(previous: FaceAnchors[], next: FaceAnchors[], elapsed: number): FaceAnchors[] {
  const available = [...previous];
  return next.map(face => {
    let index = -1, distance = .15;
    available.forEach((old, i) => { const d = Math.hypot(old.noseTip.x-face.noseTip.x,old.noseTip.y-face.noseTip.y); if (d < distance) { index=i; distance=d; } });
    if (index < 0) return face;
    const old = available.splice(index, 1)[0];
    // Follow fast movements promptly, damp tiny stationary jitter.
    const alpha = Math.max(.35, Math.min(.9, 1-Math.exp(-elapsed/(distance > .03 ? 22 : 65))));
    return Object.fromEntries(keys.map(key => [key, { x: old[key].x+(face[key].x-old[key].x)*alpha, y: old[key].y+(face[key].y-old[key].y)*alpha } satisfies Point])) as FaceAnchors;
  });
}
