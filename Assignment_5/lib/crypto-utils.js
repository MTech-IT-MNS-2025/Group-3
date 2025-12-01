// pages/helpers/crypto-utils.js
// Small collection of crypto helpers: base64, HKDF, AES-GCM wrappers, and text helpers.

export function b64ToUint8Array(b64) {
  if (!b64) return new Uint8Array([]);
  const binary = atob(b64);
  const len = binary.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

export function uint8ArrayToB64(u8) {
  if (!u8) return "";
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

export async function hkdf(ikm, salt = null, info = "", length = 32) {
  // ikm: Uint8Array
  const hkdfSalt = salt || new Uint8Array(32);
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: hkdfSalt,
      info: new TextEncoder().encode(info),
    },
    ikmKey,
    length * 8
  );
  return new Uint8Array(derived);
}

export async function aesGcmEncrypt(keyBytes, plaintextBytes, aad = null) {
  // keyBytes: Uint8Array, plaintextBytes: Uint8Array
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad ? new TextEncoder().encode(aad) : undefined,
    },
    key,
    plaintextBytes
  );
  return {
    iv: uint8ArrayToB64(iv),
    ciphertext: uint8ArrayToB64(new Uint8Array(ct)),
  };
}

export async function aesGcmDecrypt(keyBytes, iv_b64, ciphertext_b64, aad = null) {
  // Defensive AES-GCM decrypt with logging; returns Uint8Array or null on failure
  try {
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const iv = b64ToUint8Array(iv_b64);
    const ct = b64ToUint8Array(ciphertext_b64);

    try {
      const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: aad ? new TextEncoder().encode(aad) : undefined },
        key,
        ct
      );
      return new Uint8Array(plainBuf);
    } catch (e) {
      console.warn("[crypto-utils] AES-GCM decrypt failed:", e?.message || e);
      return null;
    }
  } catch (err) {
    console.error("[crypto-utils] aesGcmDecrypt unexpected error:", err);
    return null;
  }
}

export function u8ToString(u8) {
  if (!u8) return "";
  return new TextDecoder().decode(u8);
}

export function stringToU8(s) {
  return new TextEncoder().encode(s);
}
