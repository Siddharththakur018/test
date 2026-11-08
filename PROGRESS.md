# Implementation checklist

- [x] Phase 1 — Responsive editorial home, navigation, frame collection and design system.
- [x] Phase 2 — Camera permission, preview, front/rear selection, countdown, capture-all, retake, cleanup and upload fallback.
- [x] Phase 3 — Twelve filters, adjustments, twelve frame presets, layouts, crop/zoom/position, photo reordering, touch sticker drag, transform/layer/delete, undo/redo.
- [x] Phase 4 — Shared high-resolution Canvas composition, PNG/JPEG, physical-unit PDFs, A4/4×6/narrow paper, duplicate strips, cut guides and browser printing.
- [x] Phase 5 — Node Socket.IO signaling, secure two-person rooms, host controls, WebRTC cameras, ICE/STUN/TURN configuration, chunked encrypted photo transfer, coordinated timestamp countdowns and recovery states.
- [x] Phase 6 — Configurable birthday envelope/letter/countdown, reduced-motion-aware confetti, IndexedDB drafts and private local memory wall, final keepsake reveal.
- [ ] Phase 7 — Finish automated checks and production build (results recorded after execution).
- [ ] Deploy Node server behind HTTPS and configure production TURN credentials.
- [ ] Complete real iPhone/Android cross-network camera, failure/reconnect and physical printer checks in TESTING.md.

## Release limits

A Neon database connection has been supplied for shared room signaling. Vercel deployment access and a TURN service have not been supplied. This checkout is a runnable local Node application; production deployment and real two-device / physical printer checks are separate release gates. Frame decoration uses original typography and repeating ornaments rather than downloaded frame art. Birthday content is configurable. Custom collage provides a six-slot two-column layout with per-photo crop; it is not a freeform image-positioning canvas. Sticker size and rotation are controlled by touch-friendly sliders rather than pinch/rotate gestures. Local memory wall data is never synchronized between devices.

## Vercel + Neon signaling

- Server-only DATABASE_URL configuration, ignored local credentials, and an idempotent schema setup script.
- HTTPS room endpoints backed by shared PostgreSQL state; no separate signaling domain required.
- Atomic two-participant admission, hashed member credentials, host-only settings/capture, expiring heartbeats, and bounded event history.
- Existing WebRTC photos/video/face tracking stay peer-to-peer. Socket.IO remains an optional alternative.
- Production deployment still requires adding DATABASE_URL in Vercel and redeploying; database setup does not update Vercel environment variables.
