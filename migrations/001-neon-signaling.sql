-- Dedicated ephemeral signaling state. Photos and video are never stored here.
CREATE TABLE IF NOT EXISTS lovebooth_signaling_rooms (
  id text PRIMARY KEY,
  host_token text NOT NULL,
  guest_token text,
  expires_ms bigint NOT NULL,
  closed boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 0,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  host_seen_ms bigint NOT NULL,
  guest_seen_ms bigint,
  window_ms bigint NOT NULL,
  host_hits integer NOT NULL DEFAULT 0,
  guest_hits integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lovebooth_signaling_expiry ON lovebooth_signaling_rooms(expires_ms);
CREATE TABLE IF NOT EXISTS lovebooth_signaling_limits (
  key text PRIMARY KEY,
  reset_ms bigint NOT NULL,
  hits integer NOT NULL
);
