// hooks/useSessionManager.js
import { useRef, useEffect } from "react";
import useCrypto from "./useCrypto"; // your wasm kyber wrapper
import {
  hkdf,
  aesGcmEncrypt,
  aesGcmDecrypt,
  uint8ArrayToB64,
  b64ToUint8Array,
  stringToU8,
  u8ToString,
} from "../lib/crypto-utils";

// debug helpers
function u8ToHexPrefix(u8, len = 8) {
  if (!u8) return "<null>";
  const arr = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8 || []);
  const slice = arr.slice(0, Math.min(len, arr.length));
  return Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Simple session manager: create session (hybrid), cache masterKey, derive per-message key.
export default function useSessionManager({ username }) {
  const { isReady, createSession, decryptSession, generateIdentity } = useCrypto(username, ""); // keep signature flexible
  const cacheRef = useRef(new Map()); // key: `${sessionId}:${keyVersion}` -> Uint8Array masterKey
  const rotationTimers = useRef(new Map());

  // Helper: upsert session record on server
  const uploadSession = async ({ sessionId, participants, encMap, keyVersion = 1 }) => {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, participants, enc: encMap, keyVersion }),
      });
      if (!res.ok) {
        console.warn("[useSessionManager] uploadSession failed", res.status);
        throw new Error(`upload session failed ${res.status}`);
      }
      console.log("[useSessionManager] uploaded session", sessionId);
      return true;
    } catch (err) {
      console.error("[useSessionManager] uploadSession error", err);
      return false;
    }
  };

  const createAndUploadSession = async ({ sessionId, participants, keyVersion = 1 }) => {
    if (!isReady) throw new Error("crypto not ready");
    if (!participants || participants.length === 0) throw new Error("participants required");

    try {
      const masterKey = crypto.getRandomValues(new Uint8Array(32));

      const encMap = {};
      for (const p of participants) {
        const res = await fetch(`/api/users?username=${encodeURIComponent(p)}`);
        if (!res.ok) throw new Error("failed to fetch public key for " + p);
        const data = await res.json();
        const pkArray = new Uint8Array(data.publicKey || []);

        const kt = await createSession(pkArray);

        let kemCtArr;
        if (kt && kt.ciphertext instanceof Uint8Array) kemCtArr = kt.ciphertext;
        else if (kt && Array.isArray(kt.ciphertext)) kemCtArr = new Uint8Array(kt.ciphertext);
        else if (kt && typeof kt.ciphertext === "string") {
          kemCtArr = new Uint8Array(Array.from(kt.ciphertext).map((c) => c.charCodeAt(0)));
        } else kemCtArr = new Uint8Array([]);

        const kemSharedRaw = kt?.sharedSecret ?? kt?.sessionKey ?? kt?.shared_secret ?? kt?.shared;
        let kemSharedU8;
        if (kemSharedRaw instanceof Uint8Array) kemSharedU8 = kemSharedRaw;
        else if (Array.isArray(kemSharedRaw)) kemSharedU8 = new Uint8Array(kemSharedRaw);
        else if (kemSharedRaw) kemSharedU8 = new Uint8Array(kemSharedRaw);
        else kemSharedU8 = new Uint8Array([]);

        console.log(`[session:create] p=${p} pkLen=${pkArray.length} kemCtLen=${kemCtArr.length} kemSharedLen=${kemSharedU8.length}`);
        console.log(`[session:create] p=${p} kemCtPrefix=${u8ToHexPrefix(kemCtArr)} kemSharedPrefix=${u8ToHexPrefix(kemSharedU8)}`);

        const encKey = await hkdf(kemSharedU8, null, `${sessionId}|master|v${keyVersion}`, 32);
        console.log(`[session:create] derived encKeyPrefix=${u8ToHexPrefix(encKey)}`);

        const encMaster = await aesGcmEncrypt(encKey, masterKey, `${sessionId}|master|v${keyVersion}`);
        console.log(`[session:create] enc_master.iv len=${encMaster.iv?.length}, ciphertext len=${encMaster.ciphertext?.length}`);

        encMap[p] = {
          kem_ct: uint8ArrayToB64(kemCtArr),
          enc_master: encMaster,
          keyVersion,
          createdAt: new Date().toISOString(),
        };
      }

      const ok = await uploadSession({ sessionId, participants, encMap, keyVersion });
      if (ok) {
        cacheRef.current.set(`${sessionId}:${keyVersion}`, masterKey);
      }
      return ok;
    } catch (err) {
      console.error("[useSessionManager] createAndUploadSession error", err);
      return false;
    }
  };

  const ensureMasterKey = async (sessionId, keyVersion = 1) => {
    const cacheKey = `${sessionId}:${keyVersion}`;
    console.log(`[ensureMasterKey] Checking cache for ${cacheKey}`);
    if (cacheRef.current.has(cacheKey)) {
      console.log(`[ensureMasterKey] Cache hit for ${cacheKey}`);
      return cacheRef.current.get(cacheKey);
    }
    console.log(`[ensureMasterKey] Cache miss for ${cacheKey}, fetching from server`);

    try {
      console.log(`[ensureMasterKey] Fetching session ${sessionId} from API`);
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.status === 404) {
        console.warn(`[useSessionManager] session not found: ${sessionId}`);
        return null;
      }
      if (!res.ok) {
        console.warn(`[useSessionManager] session fetch failed: ${res.status}`);
        return null;
      }

      const s = await res.json();
      if (!s || !s.enc || typeof s.enc !== "object") {
        console.warn("[useSessionManager] session payload malformed", s);
        return null;
      }

      const encEntry = s.enc[username] || (s.enc.get && s.enc.get(username));
      if (!encEntry) {
        console.warn(`[useSessionManager] no enc entry for user ${username} in session ${sessionId}`);
        return null;
      }

      if (!encEntry.kem_ct || !encEntry.enc_master?.iv || !encEntry.enc_master?.ciphertext) {
        console.warn("[useSessionManager] Missing required fields in encEntry", encEntry);
        return null;
      }

      const kemCt = b64ToUint8Array(encEntry.kem_ct);
      console.log(`[session:fetch] kemCtLen=${kemCt.length} kemCtPrefix=${u8ToHexPrefix(kemCt)}`);

      console.log(`[ensureMasterKey] Calling decryptSession with kemCt`);
      const kemSharedRaw = await decryptSession(Array.from(kemCt));
      console.log(`[session:fetch] decryptSession returned len=${(kemSharedRaw && kemSharedRaw.length) || 0} prefix=${u8ToHexPrefix(kemSharedRaw)}`);

      if (!kemSharedRaw || kemSharedRaw.length === 0) {
        console.warn("[useSessionManager] decryptSession returned empty/invalid shared secret");
        return null;
      }

      let kemSharedU8 = kemSharedRaw instanceof Uint8Array ? kemSharedRaw : new Uint8Array(kemSharedRaw);

      const encKey = await hkdf(kemSharedU8, null, `${sessionId}|master|v${keyVersion}`, 32);
      const encMeta = encEntry.enc_master;

      const masterKeyU8 = await aesGcmDecrypt(encKey, encMeta.iv, encMeta.ciphertext, `${sessionId}|master|v${keyVersion}`);
      if (!masterKeyU8) {
        console.warn("[useSessionManager] failed to decrypt enc_master");
        return null;
      }

      cacheRef.current.set(cacheKey, masterKeyU8);
      return masterKeyU8;
    } catch (err) {
      console.error("[useSessionManager] ensureMasterKey error", err);
      return null;
    }
  };

  const encryptMessagePayload = async ({ sessionId, keyVersion = 1, messageIndex, plaintext, participants = [] }) => {
    let masterKey = await ensureMasterKey(sessionId, keyVersion);
    if (!masterKey) {
      if (!participants || participants.length < 2) {
        throw new Error("masterKey unavailable and participants list not provided to create session");
      }

      console.log(`[useSessionManager] session ${sessionId} missing — creating new session before encrypting`);
      const created = await createAndUploadSession({ sessionId, participants, keyVersion });
      if (!created) {
        throw new Error("failed to create session on server");
      }

      masterKey = await ensureMasterKey(sessionId, keyVersion);
      if (!masterKey) {
        throw new Error("masterKey unavailable after session creation");
      }
    }

    const info = `${sessionId}|v${keyVersion}|idx${messageIndex}`;
    const msgKey = await hkdf(masterKey, null, info, 32);
    const enc = await aesGcmEncrypt(msgKey, stringToU8(plaintext), `${sessionId}|${messageIndex}`);

    return {
      sessionId,
      messageIndex,
      keyVersion,
      iv: enc.iv,
      ciphertext: enc.ciphertext,
    };
  };

  const decryptMessagePayload = async (msg) => {
    try {
      const { sessionId, keyVersion = 1, messageIndex, iv, ciphertext } = msg;
      const masterKey = await ensureMasterKey(sessionId, keyVersion);
      if (!masterKey) {
        console.warn(`[useSessionManager] masterKey unavailable for ${sessionId}:v${keyVersion}`);
        return null;
      }

      const info = `${sessionId}|v${keyVersion}|idx${messageIndex}`;
      const msgKey = await hkdf(masterKey, null, info, 32);

      const plainU8 = await aesGcmDecrypt(msgKey, iv, ciphertext, `${sessionId}|${messageIndex}`);
      if (!plainU8) {
        console.warn("[useSessionManager] message aes decrypt returned null");
        return null;
      }

      return u8ToString(plainU8);
    } catch (err) {
      console.error("[useSessionManager] decryptMessagePayload error", err);
      return null;
    }
  };

  const startRotation = (sessionId, participants, intervalMs = 300000) => {
    stopRotation(sessionId);
    const timer = setInterval(() => {
      (async () => {
        try {
          const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`);
          let current = 1;
          if (res.ok) {
            const s = await res.json();
            current = (s.keyVersion || 1) + 1;
          }
          await createAndUploadSession({ sessionId, participants, keyVersion: current });
          console.log("[useSessionManager] rotated", sessionId, "to v", current);
        } catch (err) {
          console.error("[useSessionManager] rotation error", err);
        }
      })();
    }, intervalMs);
    rotationTimers.current.set(sessionId, timer);
  };

  const stopRotation = (sessionId) => {
    const t = rotationTimers.current.get(sessionId);
    if (t) {
      clearInterval(t);
      rotationTimers.current.delete(sessionId);
    }
  };

  useEffect(() => {
    return () => {
      for (const t of rotationTimers.current.values()) clearInterval(t);
      rotationTimers.current.clear();
    };
  }, []);

  return {
    createAndUploadSession,
    ensureMasterKey,
    encryptMessagePayload,
    decryptMessagePayload,
    startRotation,
    stopRotation,
    _cache: cacheRef,
  };
}
