/* MediaPipe stays off the UI thread. Only one bitmap may be in flight. */
let detector;
self.onmessage = async ({ data }) => {
  if (data.kind === 'init') {
    try {
      importScripts('/mediapipe/vision_bundle.js');
      const files = await Vision.FilesetResolver.forVisionTasks('/mediapipe/wasm');
      detector = await Vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/mediapipe/models/face_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numFaces: 2, minFaceDetectionConfidence: .6, minTrackingConfidence: .6,
      });
      self.postMessage({ kind: 'ready' });
    } catch { self.postMessage({ kind: 'error' }); }
  } else if (data.kind === 'frame') {
    try {
      const result = detector.detectForVideo(data.bitmap, data.at);
      self.postMessage({ kind: 'result', points: result.faceLandmarks, at: data.at });
    } catch { self.postMessage({ kind: 'result', points: [], at: data.at }); }
    finally { data.bitmap.close(); }
  }
};
