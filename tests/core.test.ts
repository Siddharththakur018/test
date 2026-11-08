import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cover,
  mmToPx,
  replaceSlot,
  filterCSS,
  neutral,
  filters,
  layouts,
  type Photo,
} from "../lib/design";
import { dimensions } from "../lib/compose";
import { RoomStore } from "../lib/rooms";
import { stopStream, cameraMessage } from "../lib/use-camera";
test("300 DPI physical print dimensions", () => {
  assert.equal(mmToPx(101.6), 1200);
  assert.equal(mmToPx(152.4), 1800);
  assert.equal(mmToPx(210), 2480);
});
test("cover preserves image proportions for portrait and landscape photos", () => {
  for (const [sw, sh, dw, dh] of [
    [1600, 900, 800, 600],
    [900, 1600, 800, 600],
    [1200, 1200, 600, 800],
  ]) {
    const r = cover(sw, sh, dw, dh);
    assert.ok(r.w >= dw && r.h >= dh);
    assert.ok(Math.abs(r.w / r.h - sw / sh) < 1e-12);
    assert.equal(r.x, (dw - r.w) / 2);
    assert.equal(r.y, (dh - r.h) / 2);
  }
});
test("crop zoom and positioning remain proportional", () => {
  const r = cover(1000, 1000, 500, 500, 2, 10, -10);
  assert.deepEqual(r, { w: 1000, h: 1000, x: -200, y: -300 });
});
test("slot replacement keeps every other photo intact", () => {
  const photo = (id: string): Photo => ({ id, src: id, zoom: 1, x: 0, y: 0 });
  const original = [photo("a"), photo("b"), photo("c")];
  const result = replaceSlot(original, 1, photo("new"));
  assert.equal(result.length, 3);
  assert.equal(result[0], original[0]);
  assert.equal(result[1].id, "new");
  assert.equal(original[1].id, "b");
});
test("every filter uses one shared CSS expression for camera and canvas", () => {
  assert.equal(filters.length, 12);
  for (let i = 0; i < filters.length; i++) {
    const css = filterCSS(i, neutral);
    assert.ok(css.startsWith(filters[i][1]));
    assert.ok(css.includes("brightness(100%)"));
  }
  assert.match(filterCSS(0, { ...neutral, warmth: 30 }), /sepia\(0.2\)/);
});
test("layout geometry has enough space for all rows and captions", () => {
  for (const l of layouts) {
    const d = dimensions(l, 1200);
    assert.equal(d.width, 1200);
    assert.ok(d.height > 0);
    const bottom =
      d.margin +
      (Math.ceil(l.count / l.cols) - 1) * (d.cellH + d.gap) +
      d.cellH;
    assert.ok(bottom < d.height - 120);
    assert.ok(d.margin + l.cols * d.cellW + (l.cols - 1) * d.gap <= 1200);
  }
});
test("camera cleanup stops every track", () => {
  let stopped = 0;
  stopStream({
    getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }],
  } as unknown as MediaStream);
  assert.equal(stopped, 2);
  stopStream(null);
});
test("permission-denied errors have an actionable recovery", () => {
  assert.match(
    cameraMessage(new DOMException("denied", "NotAllowedError")),
    /site settings/,
  );
  assert.match(
    cameraMessage(new DOMException("missing", "NotFoundError")),
    /uploading/,
  );
});
test("room identifiers are unpredictable and two-person access is enforced", () => {
  const store = new RoomStore();
  const a = store.create("host"),
    b = store.create("other");
  assert.match(a.id, /^[\w-]{32}$/);
  assert.notEqual(a.id, b.id);
  store.join(a.id, "guest");
  assert.throws(() => store.join(a.id, "stranger"), /two people/);
  assert.equal(store.member(a.id, "stranger"), undefined);
  assert.equal(store.member(a.id, "guest")?.host, "host");
});
test("expired rooms cannot be joined", () => {
  const store = new RoomStore(10);
  const r = store.create("host", 100);
  assert.equal(store.get(r.id, 109)?.id, r.id);
  assert.equal(store.get(r.id, 110), undefined);
  assert.throws(() => store.join(r.id, "guest"), /expired/);
});
test("host departure removes room; guest departure permits rejoining", () => {
  const store = new RoomStore();
  const r = store.create("h");
  store.join(r.id, "g");
  store.leave("g");
  assert.equal(store.get(r.id)?.guest, undefined);
  store.join(r.id, "new");
  store.leave("h");
  assert.equal(store.get(r.id), undefined);
});
