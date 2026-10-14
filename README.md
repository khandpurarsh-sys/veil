# Veil

The root is the original device-local themed prototype. It is not shared messaging.

`app/` is a separate encrypted development build. It is deliberately disabled until
configured with a dedicated Supabase project, a provisioned owner auth identity,
and a pinned owner signing public key. Never publish a service-role key, database
password, private signing key or member recovery material.

## Development

- `npm ci && npm test && npm run build`
- `supabase/001_veil.sql`: dedicated-project schema and row-level policies.
- `src/crypto.js`: pinned libsodium authenticated encryption, per-message random keys,
  recipient sealed-key envelopes, sender signatures and owner-signed member rosters.
- `tests/`: cryptographic negative tests and isolated Postgres access-control tests.

## Current limits

This is unreviewed development software, not suitable for sensitive communication.
There is no forward secrecy or post-compromise security claim. A server can deny
service and sees accounts/IPs/timing/ciphertext sizes. Cached browser keys are not
password protected. Public web code can be replaced by its publisher; cryptography
cannot protect against malicious frontend delivery or a compromised device.

Invites expire after 24 hours and require a second owner approval. Membership lists
are owner signed, anchored to the owner signing key shipped in app configuration.
Removed members are excluded from fresh message keys, but retain previously
received messages. A fresh device needs a new invitation and cannot decrypt old
messages unless originally included. No key recovery or multi-device linking yet.

Plaintext media cap is 49,000,000 bytes to leave encryption headroom below the
vendor's 50 MB stored-file cap. Aggregate reserved storage stops at 800 MB. Content
expires after 30 days by access policy. Physical media cleanup is not deployed yet.
A free project can pause for inactivity. No billing upgrade is authorized.

Not yet delivered: live two-device test, complete original feature/design integration,
physical media deletion job, abuse challenge, owner recovery, independent security
review and Android APK. PWA manifest/service worker are a development skeleton;
no offline message delivery or tested Android installability is claimed.
