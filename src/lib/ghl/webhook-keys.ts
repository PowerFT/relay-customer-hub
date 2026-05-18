import { createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * HighLevel webhook signature verification.
 *
 * HighLevel signs webhook payloads with public-key crypto, not HMAC. Two
 * schemes are in flight during the deprecation window:
 *
 *   - Current: `X-GHL-Signature` carries an Ed25519 signature over the raw
 *     request body. Verified with HighLevel's Ed25519 public key below.
 *   - Legacy:  `X-WH-Signature` carries an RSA-SHA256 signature over the
 *     raw request body. Verified with HighLevel's RSA public key below.
 *     **Deprecates on July 1, 2026.** After that date HighLevel sends only
 *     the Ed25519 signature.
 *
 * Strategy: try X-GHL-Signature first. If that header is present and
 * verifies, accept. Otherwise fall back to X-WH-Signature (legacy). If
 * neither verifies, reject the request.
 *
 * Signatures are base64-encoded. We decode tolerantly (strict base64,
 * but also accept hex if base64 fails — some HL deployments have used
 * hex historically) and short-circuit to false on any decode error.
 *
 * Public keys taken from
 *   https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html
 */

export const HL_ED25519_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=
-----END PUBLIC KEY-----`;

export const HL_RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSC
Frm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6
dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfB
csedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpv
uxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF
3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKU
J062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXp
IocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzN
h/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhC
HULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJ
PQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAyk
T1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==
-----END PUBLIC KEY-----`;

export const ED25519_HEADER = "x-ghl-signature";
export const RSA_HEADER = "x-wh-signature";

// Lazy-built so the keys are only parsed once per process.
let cachedEd25519: KeyObject | null = null;
let cachedRsa: KeyObject | null = null;
function loadEd25519Key(pem: string): KeyObject {
  if (cachedEd25519 && pem === HL_ED25519_PUBLIC_KEY_PEM) return cachedEd25519;
  const key = createPublicKey({ key: pem, format: "pem" });
  if (pem === HL_ED25519_PUBLIC_KEY_PEM) cachedEd25519 = key;
  return key;
}
function loadRsaKey(pem: string): KeyObject {
  if (cachedRsa && pem === HL_RSA_PUBLIC_KEY_PEM) return cachedRsa;
  const key = createPublicKey({ key: pem, format: "pem" });
  if (pem === HL_RSA_PUBLIC_KEY_PEM) cachedRsa = key;
  return key;
}

function decodeSignature(value: string): Buffer | null {
  // Strip header prefix some senders include (e.g. `ed25519=`).
  const stripped = value.replace(/^(ed25519|rsa|sha256)=/i, "").trim();
  // Try base64 (and base64url just in case).
  for (const enc of ["base64", "base64url"] as const) {
    try {
      const buf = Buffer.from(stripped, enc);
      // Buffer.from is too forgiving — round-trip to confirm. Empty bufs are bogus.
      if (buf.length > 0 && buf.toString(enc).replace(/=+$/, "") === stripped.replace(/=+$/, "")) {
        return buf;
      }
    } catch {
      // try next
    }
  }
  // Hex fallback.
  if (/^[0-9a-fA-F]+$/.test(stripped) && stripped.length % 2 === 0) {
    return Buffer.from(stripped, "hex");
  }
  return null;
}

export type VerifyOptions = {
  /** Override Ed25519 key (PEM). Used by tests to inject a generated keypair. */
  ed25519KeyPem?: string;
  /** Override RSA key (PEM). Used by tests. */
  rsaKeyPem?: string;
};

export type VerifyResult =
  | { verified: true; scheme: "ed25519" | "rsa-sha256" }
  | { verified: false; reason: string };

function tryEd25519(
  rawBody: string,
  signatureHeader: string,
  opts: VerifyOptions,
): VerifyResult | null {
  const sig = decodeSignature(signatureHeader);
  if (!sig) return { verified: false, reason: "ed25519: malformed signature" };
  try {
    const key = loadEd25519Key(opts.ed25519KeyPem ?? HL_ED25519_PUBLIC_KEY_PEM);
    const ok = verify(null, Buffer.from(rawBody, "utf8"), key, sig);
    return ok
      ? { verified: true, scheme: "ed25519" }
      : { verified: false, reason: "ed25519: signature does not match" };
  } catch (err) {
    return { verified: false, reason: `ed25519: ${(err as Error).message}` };
  }
}

function tryRsa(
  rawBody: string,
  signatureHeader: string,
  opts: VerifyOptions,
): VerifyResult | null {
  const sig = decodeSignature(signatureHeader);
  if (!sig) return { verified: false, reason: "rsa: malformed signature" };
  try {
    const key = loadRsaKey(opts.rsaKeyPem ?? HL_RSA_PUBLIC_KEY_PEM);
    const ok = verify("sha256", Buffer.from(rawBody, "utf8"), key, sig);
    return ok
      ? { verified: true, scheme: "rsa-sha256" }
      : { verified: false, reason: "rsa: signature does not match" };
  } catch (err) {
    return { verified: false, reason: `rsa: ${(err as Error).message}` };
  }
}

/**
 * Verifies a HighLevel webhook signature using the dual-scheme strategy.
 *
 * Tries Ed25519 first (X-GHL-Signature). If absent or fails, falls back
 * to RSA (X-WH-Signature). Returns verified=true with the matched scheme
 * on success, or verified=false with the reason on failure.
 *
 * `headers` may be a `Headers` object (route handlers) or a plain
 * key/value map (tests). Header names are matched case-insensitively.
 */
export function verifyWebhookSignature(
  rawBody: string,
  headers: Headers | Record<string, string | undefined>,
  opts: VerifyOptions = {},
): VerifyResult {
  const get = (name: string) => {
    if (headers instanceof Headers) return headers.get(name);
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) return v ?? null;
    }
    return null;
  };

  const ghlSig = get(ED25519_HEADER);
  if (ghlSig) {
    const result = tryEd25519(rawBody, ghlSig, opts);
    if (result?.verified) return result;
    // Don't immediately fail — fall through to legacy RSA in case both
    // headers were sent and Ed25519 was malformed by an intermediary.
  }

  const whSig = get(RSA_HEADER);
  if (whSig) {
    const result = tryRsa(rawBody, whSig, opts);
    if (result?.verified) return result;
    return result ?? { verified: false, reason: "rsa: verification returned null" };
  }

  if (ghlSig) {
    return { verified: false, reason: "ed25519 failed and no rsa fallback present" };
  }
  return { verified: false, reason: "no signature header present" };
}
