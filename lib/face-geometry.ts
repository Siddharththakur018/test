import type { FaceAnchors, Point } from './ar-effects';

export function anchorsFromLandmarks(points: Point[]): FaceAnchors | null {
  if (points.length < 455 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const pick = (i: number) => ({ x: points[i].x, y: points[i].y });
  const middle = (a: number, b: number) => ({ x: (points[a].x + points[b].x) / 2, y: (points[a].y + points[b].y) / 2 });
  return {
    eyeL: middle(33, 133), eyeR: middle(362, 263),
    foreheadTop: pick(10), chin: pick(152), noseTip: pick(1),
    mouthL: pick(61), mouthR: pick(291), cheekL: pick(50), cheekR: pick(280),
  };
}
