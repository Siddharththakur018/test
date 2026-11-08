import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorsFromLandmarks } from '../lib/face-geometry';
import { cover } from '../lib/design';
import { drawFaceEffect, effects } from '../lib/ar-effects';

test('face anchors use eye centers and inner cheeks rather than face edges', () => {
  const points = Array.from({ length: 478 }, () => ({ x: .5, y: .5 }));
  points[33] = { x: .2, y: .3 }; points[133] = { x: .4, y: .3 };
  points[362] = { x: .6, y: .3 }; points[263] = { x: .8, y: .3 };
  points[50] = { x: .3, y: .6 }; points[280] = { x: .7, y: .6 };
  const face = anchorsFromLandmarks(points)!;
  assert.ok(Math.abs(face.eyeL.x - .3) < 1e-10);
  assert.equal(face.eyeR.x, .7);
  assert.deepEqual(face.cheekL, points[50]);
  assert.deepEqual(face.cheekR, points[280]);
  assert.equal(anchorsFromLandmarks([]), null);
  points[50].x = NaN;
  assert.equal(anchorsFromLandmarks(points), null);
});

test('face overlay follows video cover crop in a narrow couple camera', () => {
  const crop = cover(1280, 960, 320, 480);
  const map = (x: number, y: number) => ({ x: crop.x + x * crop.w, y: crop.y + y * crop.h });
  assert.deepEqual(map(.5, .5), { x: 160, y: 240 });
  assert.deepEqual(map(.25, .5), { x: 0, y: 240 });
  assert.deepEqual(map(.75, .5), { x: 320, y: 240 });
});

test('every face effect draws finite geometry for a tilted face', () => {
  const points = Array.from({ length: 478 }, () => ({ x: .5, y: .5 }));
  points[33] = points[133] = { x: .3, y: .35 };
  points[263] = points[362] = { x: .7, y: .45 };
  points[10] = { x: .55, y: .2 };
  const anchors = anchorsFromLandmarks(points)!;
  let calls = 0;
  const ctx = new Proxy({}, { get: (_target, key) => (...args: unknown[]) => {
    if(key==='createRadialGradient' || key==='createLinearGradient')return {addColorStop:()=>{}};
    for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg));
    calls++;
  }, set: () => true }) as CanvasRenderingContext2D;
  for (const effect of effects) drawFaceEffect(ctx, effect.id, anchors, p => ({ x: p.x * 640, y: p.y * 480 }));
  assert.ok(calls > 100);
});

import { freshFaces, smoothFaces, validFaces } from '../lib/tracking';
const faceAt=(x:number)=>anchorsFromLandmarks(Array.from({length:478},()=>({x,y:.5})))!;
test('tracking expires after a stall and rejects invalid peer coordinates',()=>{
  const face=faceAt(.5);
  assert.equal(freshFaces({faces:[face],at:100},399).length,1);
  assert.deepEqual(freshFaces({faces:[face],at:100},400),[]);
  assert.ok(validFaces([face]));assert.ok(validFaces([]));
  assert.equal(validFaces([{...face,noseTip:{x:Infinity,y:.4}}]),false);
  assert.equal(validFaces([face,face,face]),false);
  assert.equal(validFaces([{noseTip:{x:.5,y:.5}}]),false);
});
test('smoothing dampens jitter, follows head movement, and clears lost faces',()=>{
  const old=faceAt(.5),next=faceAt(.51),result=smoothFaces([old],[next],50)[0];
  assert.ok(result.noseTip.x>.5 && result.noseTip.x<.51);
  assert.deepEqual(smoothFaces([old],[],50),[]);
  assert.deepEqual(smoothFaces([old],[faceAt(.9)],50),[faceAt(.9)]);
  const swapped=smoothFaces([faceAt(.3),faceAt(.7)],[faceAt(.71),faceAt(.31)],50);
  assert.ok(swapped[0].noseTip.x>.7 && swapped[1].noseTip.x<.31);
});
