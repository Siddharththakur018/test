# Practical verification

## Automated

`npm test` covers print dimensions, aspect-preserving cropping and zoom, slot replacement, the common preview/export filter expressions, layout geometry, camera track cleanup, actionable permission errors, secure room IDs, room membership, expiration and departure cleanup. The signaling integration suite starts a real HTTP/Socket.IO server through the shared signaling implementation and exercises room isolation, two-client countdown scheduling, settings and disconnect/rejoin.

## Browser checks before gifting

Use current Safari on iPhone and Chrome on Android/desktop. Check 320, 375, 390, 768, 1024 and 1440 px widths, landscape, keyboard open, and larger text. Confirm no page overflow, reachable bottom controls and legible text.

- Camera: deny access, retry after enabling in site settings, unplug/reconnect, test busy camera, switch front/rear, leave studio and verify camera indicator turns off. On a non-HTTPS remote origin, confirm helpful fallback.
- Capture: test 3/5/10 second countdowns, cancel, individual retake and capture-all. Ensure retake replaces only the selected slot and the final image is naturally oriented.
- Upload: load multiple JPEG/PNG/WebP photos, portrait/landscape, rotated phone JPEG, oversized and unsupported files. Verify images keep proportions.
- Editor: compare all 12 filters on preview and downloaded PNG/JPEG; test all layouts, custom colors, captions, date, crop zoom and position. Swap photo order. Add stickers, drag on touch, adjust size/rotation/position, layer, undo/redo and delete. Check final export matches placement.
- Draft/storage: refresh after editing, restore draft, dismiss restore prompt, save a memory, reload the wall, download and delete it. Test blocked storage and low quota. Verify a second device has its own wall.
- Print: download PDFs for A4, 4×6 and narrow strips, single/duplicate and cut guides on/off. Verify PDF physical page size and preserved image ratio. Print on a real printer at actual size, matching paper size. Check no website controls appear. Block popups and confirm recovery message.
- Birthday: configure names/letter/date; open and close envelope. Verify no countdown without a date, correct date countdown, readable letter, reduced-motion confetti disabled.
- Accessibility: tab through controls, verify visible focus, label associations and screen-reader countdown/status announcements; set reduced motion and check layout/interaction without animation.

## Two real devices on different networks

1. Deploy the Node server behind HTTPS with WebSocket support and working TURN credentials.
2. Connect an iPhone on cellular and laptop on a different Wi-Fi network. Enable cameras explicitly.
3. Host creates invitation; guest joins. Verify each sees their own real camera and the other person's real camera. Confirm third participant cannot enter and random invalid links fail.
4. Select a side-by-side layout, synchronize each capture and complete strip. Download from both devices; check both photos appear in the same slot. Repeat split heart, grid, alternating and double Polaroid layouts.
5. Add network latency/throttling, then capture. Countdown need not be perfectly simultaneous. Interrupt photo transfer and verify delayed-capture error and successful retake.
6. Disable TURN and test a restrictive network. Verify a friendly connection failure and Upload Together fallback. Restore TURN and reconnect.
7. Toggle guest airplane mode, reconnect/rejoin; close guest tab, verify host status then rejoin. Close host tab; verify guest gets session-ended notice. Host reconnect uses a new invitation.
8. End room as host, verify peer cleanup and the guest cannot continue signaling. Wait for expiration (or lower TTL in test environment) and verify room removed.
9. Leave the booth and verify camera indicators and network peer connections stop on both devices. Ensure no photo bodies appear in signaling requests or server logs.

These hardware/network/print checks must be completed on the deployment; unit tests alone do not establish production reliability.

## Romantic effects and performance

Automated coverage now includes inner-cheek/eye-center anchors, rotated effect geometry, position-matched smoothing when detector ordering changes, lost/stalled tracking expiry, bounded peer coordinates, and host-only synchronization of effect/intensity/connection/pose settings.

Before release, check with two real browsers/devices:

- Open the production build with an empty cache. The homepage must render without loading MediaPipe; optional font failures must leave usable fallback fonts. Enable the camera and verify the model/WASM download occurs then. Revisit and inspect the cache headers/cache use.
- Verify the worker initializes and receives transferred image bitmaps on Chrome and iOS Safari; test the throttled fallback with Worker/OffscreenCanvas unavailable. No repeated worker/model initialization should occur when changing a look or when a partner joins.
- Tilt your head, turn sideways, move quickly, leave the frame, pause the video, and hide the tab. Check bow/crown alignment, no long smoothing trails, and no overlay remaining beyond 300 ms without fresh tracking results. Bring two people into one camera and cross positions.
- Test 0/40/100% intensity for freckles, blush, kisses, pearl crown and bow. At 0% effects must be invisible. Enable reduced motion and confirm kisses/heart halos stop moving.
- Join a couple room. Both people should see the same host-selected lens and intensity; guest controls must be disabled. Select each frame and capture: the pose prompt and countdown prompt must agree. Hearts must follow each person's face across stacked phone and side-by-side desktop views, disappearing when either face is absent.
- Download the same shared shot on both clients. Check that each person's effect uses their own captured landmarks and that the connection hearts appear inside the photo bounds. Retake a slot and test a delayed partner transfer. Change effects after capture. Ensure uploaded photos do not acquire unrelated camera landmarks.
- Profile camera-on interaction on an older iPhone: the editor should not rerender on every detection frame; inference must have at most one pending bitmap and preview composition must wait for rapid slider updates to settle.

This implementation passed 18 automated tests and a production build. A local preview launch was declined during this change, so worker/browser rendering and physical iOS/two-device checks remain unverified.

## Neon-backed signaling

`npm run db:setup` creates only the dedicated `lovebooth_signaling_rooms` and `lovebooth_signaling_limits` tables and the expiry index. It is safe to rerun. `npm run test:neon` opts into live database tests using DATABASE_URL and removes its own test rooms. Ordinary test runs skip those integration tests.

Coverage includes simultaneous guest admission, invalid member rejection, guest restrictions on settings, host-selected lens/pose delivery, equal capture timestamps for both clients, connection-offer exchange, guest departure/rejoin with no old-event replay, host room closure, abandoned guest release, and expiration. The HTTPS transport also has a mocked network test for create/poll/action/leave and keeping member credentials out of request URLs. Configuration tests check that database credentials never appear in the public signaling configuration.

For deployment: add DATABASE_URL as a server-only Vercel environment variable and redeploy. If using Neon, remove any old SIGNALING_SERVER_URL override. Confirm `/api/signaling-config` reports `transport: http`. Check two devices on different networks, including phone Safari background/foreground behavior. Room polling adds roughly one second of signaling delay; capture scheduling includes a 1.5-second allowance but can still be late on poor networks. The expired database rows are inaccessible immediately and physically removed on the next room creation.
