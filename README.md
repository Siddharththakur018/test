# LoveBooth ♡

A private virtual photobooth for a long-distance birthday, built with Next.js App Router, TypeScript, Tailwind CSS, Motion, browser Canvas, WebRTC, Socket.IO and IndexedDB.

## Run

Requires Node.js 22.18+ (uses built-in TypeScript support).

```sh
npm install
npm run dev
```

Open the URL printed in the terminal (normally http://localhost:3000; if occupied, the next available port is used). For production: `npm run build` then `npm start`. The custom Node server serves both Next.js and Socket.IO. Deploy to a Node container or VM that supports persistent WebSockets. Do not deploy the server to a static host or a request-only serverless function. Set an HTTPS domain and proxy WebSocket upgrades. Photos are never persisted on the server. Rooms are ephemeral and expire after one hour. A server restart removes rooms.

## Personalize the gift

Edit `lib/config.ts` to set the recipient, sender, letter and an optional ISO birthday date. No names or date have been invented. With no date configured, the countdown is hidden. You can customize captions, names and dates in the editor. The homepage uses sample editorial images, not personal memories; replace files in `public/photos` to use your own photographs.

## Architecture

```text
app/                 App Router, metadata, responsive design and print CSS
components/          Home, frame collection, birthday experience, local gallery
  booth.tsx          Lazy-loaded camera/editor/reveal and print interface
lib/
  use-camera.ts      Media permissions, cleanup, capture, shutter audio
  use-session.ts     WebRTC negotiation, ICE, clock estimation, data transfer
  rooms.ts           Secure room identifiers, membership and expiration
  design.ts          Filters, frame presets, layouts, crop and print geometry
  compose.ts         Shared Canvas renderer, image and PDF export
  storage.ts         Local IndexedDB drafts and memories
  config.ts          Editable birthday details
server.ts            Next.js + Socket.IO signaling, private room lifecycle
 tests/              Unit and live signaling integration tests
```

Frames, filters, image crop, stickers and captions share one canvas rendering path. PNG/JPEG export is 1200 pixels wide. Print PDFs use millimeters with A4, 4×6-inch or 2×6-inch pages, duplicate strips and optional cut guides. Aspect ratio is preserved. Actual printer output depends on paper selection, 100% scaling and hardware margins. A browser print window is also provided.

## Live sessions

1. Use HTTPS on both devices (localhost is allowed for development).
2. Enable a camera and select Together, from afar.
3. Host creates a room and privately sends the invitation URL.
4. Partner opens the URL, enables their camera and joins.
5. Wait for “Together · encrypted connection.” Host chooses layout/filter and starts each capture.
6. Each client estimates server clock offset from three round trips, and captures against a future server timestamp. Capture is approximate, not perfectly simultaneous.
7. JPEGs travel over the encrypted ordered WebRTC data channel in bounded chunks. No photos pass through Socket.IO or server storage. Both peers compose and can download their own strip. A delayed photo is flagged after 15 seconds.

For reliable connectivity across different networks, configure a TURN provider in `.env.local` using `.env.example`. Public STUN alone cannot connect all NAT/firewall combinations. This project has no TURN credentials supplied. For a public deployment, replace the static TURN credentials with short-lived credentials issued by an authenticated TURN credential endpoint. Socket.IO reconnects signaling; an interrupted host creates a fresh room, and the guest must use the new link. A guest can rejoin an existing room while the host stays connected. Camera switching is disabled inside an active room to prevent stale WebRTC tracks.

Private invitation links are bearer capabilities. Share them only with your partner. Possession of a link grants the second place in a room. The server validates membership for every signaling, settings and capture event. Rooms are limited to two participants and one hour. Host can end the session. No audio is captured. Memory wall and draft data are local to this browser, not synchronized across devices. Browser storage can be cleared or evicted; download important photos. To delete saved memories, use the trash button in Our memories. To discard a draft, use the dismiss button in the restore prompt.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

See `TESTING.md` for real-device and browser checks, and `PROGRESS.md` for the implementation checklist and remaining release checks.

## Sample image credits

Editorial sample images are downloaded from Unsplash: image IDs `photo-1516589178581-6cd7833ae3b2`, `photo-1523438885200-e635ba2c371e`, `photo-1490750967868-88aa4486c946`, and `photo-1473116763249-2faaef81ccda`. They are decorative examples only and never appear in the user's saved strips.

## Startup and live-effect performance

For everyday use, run `npm run build` once after source changes, then `npm start`. `npm run dev` compiles on demand and includes development tooling; its cold start is not the production load time. Keep this project and its dependencies downloaded locally if Desktop is synchronized through iCloud.

The page does not wait for optional Google Fonts. Tailwind scans only application source. The face model is loaded only when the camera has an active face effect: its first use downloads a roughly 3.6 MB model and a roughly 14 MB WASM runtime; subsequent visits use HTTP caching. It is separate from the initial homepage load.

Face inference runs in a dedicated worker when OffscreenCanvas is supported. Frames are resized to at most 640 px wide, limited to 20 detection samples per second, with only one frame in flight. Unsupported browsers use an adaptive, throttled main-thread fallback. Tracking points live in refs so camera frames do not rerender the editor. Tracking stops while the page is hidden, and overlays expire after 300 ms without fresh points. Live effects animate at up to 30 FPS and respect reduced motion.

Partners exchange bounded face anchors over the encrypted WebRTC data channel at up to 10 updates per second, avoiding a second detector for remote video. Host settings synchronize the effect, intensity, connection hearts, and selected pose. Still-photo metadata travels with each JPEG so both exports use the captured anchors. Photo previews are debounced, use blob URLs, and reuse decoded images. Static exports freeze animations at their initial phase.
# test
