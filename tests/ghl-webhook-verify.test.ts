import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  ED25519_HEADER,
  RSA_HEADER,
  verifyWebhookSignature,
} from "@/lib/ghl/webhook-keys";

/**
 * We test against a freshly-generated Ed25519/RSA keypair injected via the
 * `ed25519KeyPem` / `rsaKeyPem` opts — never HighLevel's real keys. The test
 * is therefore deterministic and doesn't depend on any external secret.
 */

function generateEd25519() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicPem: publicKey.export({ type: "spki", format: "pem" }) as string,
    sign: (body: string) => sign(null, Buffer.from(body, "utf8"), privateKey).toString("base64"),
  };
}

function generateRsa() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    publicPem: publicKey.export({ type: "spki", format: "pem" }) as string,
    sign: (body: string) =>
      sign("sha256", Buffer.from(body, "utf8"), privateKey).toString("base64"),
  };
}

const FIXTURE_PAYLOAD = JSON.stringify({
  type: "InboundMessage",
  locationId: "loc_test",
  conversationId: "conv_test",
  contactId: "ct_test",
  messageId: "msg_test_1",
  body: "hello world",
  direction: "inbound",
});

describe("Ed25519 (X-GHL-Signature)", () => {
  it("accepts a valid signature", () => {
    const k = generateEd25519();
    const signature = k.sign(FIXTURE_PAYLOAD);

    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      { [ED25519_HEADER]: signature },
      { ed25519KeyPem: k.publicPem },
    );
    expect(result).toEqual({ verified: true, scheme: "ed25519" });
  });

  it("rejects a tampered body", () => {
    const k = generateEd25519();
    const signature = k.sign(FIXTURE_PAYLOAD);

    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD + " tampered",
      { [ED25519_HEADER]: signature },
      { ed25519KeyPem: k.publicPem },
    );
    expect(result.verified).toBe(false);
  });

  it("rejects a signature from a different key", () => {
    const a = generateEd25519();
    const b = generateEd25519();
    const signature = b.sign(FIXTURE_PAYLOAD);

    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      { [ED25519_HEADER]: signature },
      { ed25519KeyPem: a.publicPem },
    );
    expect(result.verified).toBe(false);
  });

  it("rejects garbage in the header", () => {
    const k = generateEd25519();
    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      { [ED25519_HEADER]: "not-a-valid-signature" },
      { ed25519KeyPem: k.publicPem },
    );
    expect(result.verified).toBe(false);
  });

  it("strips an `ed25519=` prefix on the header value", () => {
    const k = generateEd25519();
    const signature = k.sign(FIXTURE_PAYLOAD);
    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      { [ED25519_HEADER]: `ed25519=${signature}` },
      { ed25519KeyPem: k.publicPem },
    );
    expect(result.verified).toBe(true);
  });
});

describe("RSA-SHA256 (X-WH-Signature, legacy)", () => {
  it("accepts a valid signature when only the legacy header is present", () => {
    const k = generateRsa();
    const signature = k.sign(FIXTURE_PAYLOAD);

    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      { [RSA_HEADER]: signature },
      { rsaKeyPem: k.publicPem },
    );
    expect(result).toEqual({ verified: true, scheme: "rsa-sha256" });
  });

  it("rejects a tampered body", () => {
    const k = generateRsa();
    const signature = k.sign(FIXTURE_PAYLOAD);

    const result = verifyWebhookSignature(
      "{}",
      { [RSA_HEADER]: signature },
      { rsaKeyPem: k.publicPem },
    );
    expect(result.verified).toBe(false);
  });
});

describe("scheme preference + fallthrough", () => {
  it("prefers Ed25519 when both headers verify", () => {
    const ed = generateEd25519();
    const rsa = generateRsa();
    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      {
        [ED25519_HEADER]: ed.sign(FIXTURE_PAYLOAD),
        [RSA_HEADER]: rsa.sign(FIXTURE_PAYLOAD),
      },
      { ed25519KeyPem: ed.publicPem, rsaKeyPem: rsa.publicPem },
    );
    expect(result).toEqual({ verified: true, scheme: "ed25519" });
  });

  it("falls back to RSA when Ed25519 header is present but fails", () => {
    const ed = generateEd25519();
    const otherEd = generateEd25519();
    const rsa = generateRsa();

    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      {
        // Signed with otherEd, but we verify with ed → Ed25519 fails
        [ED25519_HEADER]: otherEd.sign(FIXTURE_PAYLOAD),
        // RSA fallback should succeed
        [RSA_HEADER]: rsa.sign(FIXTURE_PAYLOAD),
      },
      { ed25519KeyPem: ed.publicPem, rsaKeyPem: rsa.publicPem },
    );
    expect(result).toEqual({ verified: true, scheme: "rsa-sha256" });
  });

  it("rejects when no signature header is present", () => {
    const result = verifyWebhookSignature(FIXTURE_PAYLOAD, {});
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/no signature/);
    }
  });

  it("rejects when both headers are present but neither verifies", () => {
    const ed = generateEd25519();
    const rsa = generateRsa();
    const otherEd = generateEd25519();
    const otherRsa = generateRsa();

    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      {
        [ED25519_HEADER]: otherEd.sign(FIXTURE_PAYLOAD),
        [RSA_HEADER]: otherRsa.sign(FIXTURE_PAYLOAD),
      },
      { ed25519KeyPem: ed.publicPem, rsaKeyPem: rsa.publicPem },
    );
    expect(result.verified).toBe(false);
  });
});

describe("Headers object compatibility", () => {
  it("accepts a Web Headers instance (route-handler shape)", () => {
    const k = generateEd25519();
    const signature = k.sign(FIXTURE_PAYLOAD);
    const headers = new Headers({ "X-GHL-Signature": signature });

    const result = verifyWebhookSignature(FIXTURE_PAYLOAD, headers, {
      ed25519KeyPem: k.publicPem,
    });
    expect(result.verified).toBe(true);
  });

  it("matches header names case-insensitively", () => {
    const k = generateEd25519();
    const signature = k.sign(FIXTURE_PAYLOAD);
    const result = verifyWebhookSignature(
      FIXTURE_PAYLOAD,
      { "X-GHL-Signature": signature }, // uppercase
      { ed25519KeyPem: k.publicPem },
    );
    expect(result.verified).toBe(true);
  });
});
