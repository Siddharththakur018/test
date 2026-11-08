import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";
import { attachSignaling } from "../lib/signaling";
const once = (s: Socket, event: string) =>
  new Promise<any>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for " + event)),
      10000,
    );
    s.once(event, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
test("two clients synchronize capture, isolate rooms and recover after guest departure", async () => {
  const http = createServer(),
    server = new Server(http);
  const signaling = attachSignaling(server);
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  const address = http.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}`;
  const host = io(url),
    guest = io(url),
    outsider = io(url);
  try {
    await Promise.all([
      once(host, "connect"),
      once(guest, "connect"),
      once(outsider, "connect"),
    ]);
    const room = await host.timeout(5000).emitWithAck("create");
    assert.match(room.id, /^[\w-]{32}$/);
    const ready = once(host, "partner-ready");
    assert.equal(
      (await guest.timeout(5000).emitWithAck("join", room.id)).id,
      room.id,
    );
    await ready;
    assert.match(
      (await outsider.timeout(5000).emitWithAck("join", room.id)).error,
      /two people/,
    );
    const settings = once(guest, "settings");
    host.emit("settings", { layout: "couple", filter: 2 });
    assert.deepEqual(await settings, { layout: "couple", filter: 2 });
    const matching = once(guest, "settings");
    const look={layout:'couple',filter:4,effect:'pearl',intensity:.45,connection:true,pose:2};
    host.emit('settings',look);
    assert.deepEqual(await matching,look);
    let unexpected=0;
    const invalid=()=>unexpected++;
    guest.on('settings',invalid);host.on('settings',invalid);
    host.emit('settings',{...look,intensity:2});
    host.emit('settings',{...look,effect:'unknown'});
    guest.emit('settings',look);
    await new Promise(r=>setTimeout(r,80));
    assert.equal(unexpected,0);
    guest.off('settings',invalid);host.off('settings',invalid);
    const h = once(host, "capture"),
      g = once(guest, "capture");
    const before = Date.now();
    host.emit("capture", { seconds: 3, slot: 1 });
    const [hc, gc] = await Promise.all([h, g]);
    assert.deepEqual(hc, gc);
    assert.equal(hc.slot, 1);
    assert.ok(hc.at >= before + 3700 && hc.at < Date.now() + 4000);
    const left = once(host, "partner-left");
    guest.disconnect();
    await left;
    const newGuest = io(url);
    await once(newGuest, "connect");
    assert.equal(
      (await newGuest.timeout(5000).emitWithAck("join", room.id)).id,
      room.id,
    );
    const closed = once(newGuest, "closed");
    host.emit("remove");
    assert.match(await closed, /ended/);
    newGuest.disconnect();
    assert.equal(signaling.store.get(room.id), undefined);
  } finally {
    host.disconnect();
    guest.disconnect();
    outsider.disconnect();
    signaling.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
test("unknown invitations fail and clock reports server time", async () => {
  const http = createServer(),
    server = new Server(http);
  const signaling = attachSignaling(server);
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  const a = http.address();
  assert.ok(a && typeof a === "object");
  const s = io(`http://127.0.0.1:${a.port}`);
  try {
    await once(s, "connect");
    assert.match(
      (await s.timeout(5000).emitWithAck("join", "invalid")).error,
      /not valid/,
    );
    assert.match(
      (await s.timeout(5000).emitWithAck("join", "a".repeat(32))).error,
      /expired/,
    );
    const now = await s.timeout(5000).emitWithAck("clock");
    assert.ok(Math.abs(now - Date.now()) < 1000);
  } finally {
    s.disconnect();
    signaling.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
