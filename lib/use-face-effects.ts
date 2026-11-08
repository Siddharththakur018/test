'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FaceAnchors, Point } from './ar-effects';
import { anchorsFromLandmarks } from './face-geometry';
import { smoothFaces, type TrackingSnapshot } from './tracking';

type Detector = { detectForVideo: (v: HTMLCanvasElement, t: number) => { faceLandmarks?: Point[][] }; close: () => void };
export function useFaceEffects(video: RefObject<HTMLVideoElement | null>, enabled: boolean, snapshot: RefObject<TrackingSnapshot>, onFaces?: (faces: FaceAnchors[]) => void) {
  const [status, setStatus] = useState({ ready: false, count: 0, error: '' });
  const callback = useRef(onFaces); callback.current = onFaces;
  useEffect(() => {
    snapshot.current = { faces: [], at: 0 };
    setStatus({ ready: false, count: 0, error: '' });
    if (!enabled) return;
    let active = true, worker: Worker | null = null, detector: Detector | null = null;
    let raf = 0, watchdog: ReturnType<typeof setTimeout>, busy = false, lastTime = -1, lastRun = 0, lastSent = 0, count = 0, interval = 50;
    const input = document.createElement('canvas'), ctx = input.getContext('2d');
    const publish = (points: Point[][], at: number) => {
      if (!active) return;
      const next = points.map(anchorsFromLandmarks).filter((f): f is FaceAnchors => !!f);
      const old = snapshot.current;
      const faces = smoothFaces(at-old.at < 300 ? old.faces : [], next, Math.max(1, at-old.at));
      snapshot.current = { faces, at };
      if (faces.length !== count) { count = faces.length; setStatus(s => ({ ...s, count })); }
      if (at-lastSent > 100 || (!faces.length && old.faces.length)) { callback.current?.(faces); lastSent = at; }
    };
    const loop = (now: number) => {
      if (!active) return;
      raf = requestAnimationFrame(loop);
      const v = video.current;
      if(count && now-snapshot.current.at>=300){snapshot.current={faces:[],at:0};count=0;setStatus(s=>({...s,count:0}));callback.current?.([]);}
      if (document.hidden || busy || !v || v.paused || v.readyState < 2 || !v.videoWidth || now-lastRun < interval || v.currentTime === lastTime) return;
      lastTime = v.currentTime; lastRun = now;
      const width = Math.min(640,v.videoWidth), height = Math.round(width*v.videoHeight/v.videoWidth);
      if (input.width !== width || input.height !== height) { input.width=width; input.height=height; }
      if (!ctx) return;
      ctx.drawImage(v,0,0,width,height);
      if (worker) {
        busy = true;
        createImageBitmap(input).then(bitmap => {
          if (!active || !worker) { bitmap.close(); busy=false; return; }
          worker.postMessage({kind:'frame',bitmap,at:now},[bitmap]);
        }).catch(() => { busy=false; void fallback(); });
      } else if (detector) {
        const started = performance.now();
        try { publish(detector.detectForVideo(input,now).faceLandmarks || [],now); }
        catch { publish([],now); }
        interval = Math.max(66, Math.min(160, (performance.now()-started)*2));
      }
    };
    const startLoop = () => { if (!active) return; setStatus(s=>({...s,ready:true,error:''})); raf=requestAnimationFrame(loop); };
    let fallingBack = false;
    const fallback = async () => {
      if (!active || fallingBack) return;
      fallingBack = true; clearTimeout(watchdog); worker?.terminate(); worker=null; busy=false; cancelAnimationFrame(raf);
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const files = await vision.FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const create = (delegate:'GPU'|'CPU') => vision.FaceLandmarker.createFromOptions(files,{
          baseOptions:{modelAssetPath:'/mediapipe/models/face_landmarker.task',delegate},runningMode:'VIDEO',numFaces:2,
          minFaceDetectionConfidence:.6,minTrackingConfidence:.6,
        });
        const instance = await create('GPU').catch(()=>create('CPU'));
        if (!active) { instance.close(); return; }
        detector=instance; interval=80; startLoop();
      } catch { if(active) setStatus({ready:false,count:0,error:'Face effects could not load. You can still take photos without an effect.'}); }
    };
    try {
      if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap) void fallback();
      else {
        worker = new Worker('/face-tracking.worker.js');
        watchdog=setTimeout(()=>void fallback(),15000);
        worker.onmessage = ({data}) => {
          if (!active) return;
          if (data.kind==='ready') { clearTimeout(watchdog); startLoop(); }
          else if (data.kind==='result') { busy=false; publish(data.points || [],data.at); }
          else if (data.kind==='error') void fallback();
        };
        worker.onerror=()=>void fallback(); worker.postMessage({kind:'init'});
      }
    } catch { void fallback(); }
    const hidden = () => { if(document.hidden) { snapshot.current={faces:[],at:0}; callback.current?.([]); } };
    document.addEventListener('visibilitychange',hidden);
    return () => { active=false; clearTimeout(watchdog); cancelAnimationFrame(raf); worker?.terminate(); detector?.close(); snapshot.current={faces:[],at:0}; callback.current?.([]); document.removeEventListener('visibilitychange',hidden); };
  },[video,enabled,snapshot]);
  return status;
}
