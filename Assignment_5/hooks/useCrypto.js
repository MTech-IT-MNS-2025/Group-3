// hooks/useCrypto.js
import { useState, useEffect, useRef } from 'react';

const DB_NAME = 'KrytaSecureDB';
const STORE_NAME = 'keys'; // dynamic store name (same as before)

export default function useCrypto(username = 'sk_key', key = 'default_password') {
  const [isReady, setIsReady] = useState(false);
  const dbRef = useRef(null);

  // ---------- WebCrypto helpers (unchanged) ----------
  async function encryptData(text, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('some_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, data);

    return {
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
    };
  }

  async function decryptData(encrypted, password) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('some_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));

    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, ciphertext);
    return decoder.decode(decryptedBuffer);
  }

  // ---------- WASM bootstrap: single global promise ----------
  // window.__kyberWasmReady will be a Promise that resolves when runtime + init_kyber have run.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If the promise already exists, nothing to do.
    if (window.__kyberWasmReady) {
      // but ensure local state will become true once it resolves
      window.__kyberWasmReady.then(() => setIsReady(true)).catch(() => {});
      return;
    }

    // Create the promise and store on window so all modules/components share it.
    window.__kyberWasmReady = new Promise((resolve, reject) => {
      let resolved = false;

      const onInitSuccess = () => {
        if (resolved) return;
        resolved = true;
        console.log('useCrypto: 🔐 Crypto Core Ready (wasm + init complete)');
        setIsReady(true);
        resolve(true);
      };

      const onInitFailure = (err) => {
        if (resolved) return;
        resolved = true;
        console.error('useCrypto: Crypto init failed', err);
        setIsReady(false);
        reject(err);
      };

      // Helper: attempt to call init_kyber when runtime is ready
      const callInitIfPresent = () => {
        try {
          // Emscripten sometimes exposes a function pointer, sometimes you must ccall.
          if (window.Module && typeof window.Module._init_kyber === 'function') {
            // direct C function binding present
            window.Module._init_kyber();
            onInitSuccess();
            return true;
          } else if (window.Module && typeof window.Module.ccall === 'function') {
            // use ccall to invoke exported wrapper "init_kyber"
            try {
              window.Module.ccall('init_kyber', 'number', [], []);
              onInitSuccess();
              return true;
            } catch (e) {
              console.warn('useCrypto: ccall(init_kyber) threw:', e);
              // fall through to failure path below
            }
          } else {
            // Module present but init symbol not found yet
            return false;
          }
        } catch (e) {
          onInitFailure(e);
          return false;
        }
        return false;
      };

      // If Module already exists and runtime already initialized, try calling init immediately.
      if (window.Module && window.Module.onRuntimeInitialized && window.Module.onRuntimeInitialized.__called) {
        // Some builds mark an internal flag - try init now
        if (callInitIfPresent()) return;
      }

      // If Module exists but not initialized, attach handler
      if (window.Module) {
        const previous = window.Module.onRuntimeInitialized;
        window.Module.onRuntimeInitialized = () => {
          // mark that onRuntimeInitialized ran (useful for re-mounts)
          window.Module.onRuntimeInitialized.__called = true;
          if (typeof previous === 'function') {
            try { previous(); } catch (e) { console.warn('previous onRuntimeInitialized threw', e); }
          }
          // try to call init_kyber
          if (!callInitIfPresent()) {
            onInitFailure(new Error('init_kyber not found after runtime init'));
          }
        };
      } else {
        // Create Module with onRuntimeInitialized and inject script
        window.Module = {
          onRuntimeInitialized: () => {
            window.Module.onRuntimeInitialized.__called = true;
            if (!callInitIfPresent()) {
              onInitFailure(new Error('init_kyber not found after runtime init'));
            }
          }
        };

        // Append script only if not already appended
        const alreadyHasScript = !!document.querySelector('script[src="/kyber.js"]');
        if (!alreadyHasScript) {
          const script = document.createElement('script');
          script.src = '/kyber.js';
          script.async = true;
          script.onload = () => {
            // Emscripten may run onRuntimeInitialized automatically; nothing to do here
            console.log('useCrypto: wasm script loaded');
            // If runtime already ran before setting onRuntimeInitialized, Emscripten will call it synchronously.
          };
          script.onerror = (e) => onInitFailure(new Error('Failed to load kyber.js: ' + e?.message));
          document.body.appendChild(script);
        } else {
          // script exists but Module didn't — wait for onRuntimeInitialized path above
          console.log('useCrypto: found existing /kyber.js script; waiting for runtime init');
        }
      }

      // Safety timeout: if nothing happens within X seconds, reject
      const timeout = setTimeout(() => {
        onInitFailure(new Error('WASM init timeout'));
      }, 15000);

      // When promise resolves/rejects we clear the timeout
      // (resolve/reject handlers already handle setIsReady)
    }).catch((e) => {
      // keep window.__kyberWasmReady as a rejected promise so callers can inspect it if needed
      console.error('useCrypto: window.__kyberWasmReady rejected', e);
      throw e;
    });

    // When global promise resolves, mark local state
    window.__kyberWasmReady.then(() => setIsReady(true)).catch(() => setIsReady(false));
  }, []);

  // Helper to wait for global wasm readiness; callers will await this.
  async function ensureWasm() {
    if (isReady) return true;
    if (typeof window === 'undefined') throw new Error('No window');
    if (!window.__kyberWasmReady) throw new Error('WASM loader not initialized');
    return window.__kyberWasmReady;
  }

  // ---------- IndexedDB helpers (unchanged) ----------
  const getDB = () => {
    if (dbRef.current) return Promise.resolve(dbRef.current);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        dbRef.current = request.result;
        resolve(dbRef.current);
      };
      request.onerror = reject;
    });
  };

  const saveLocalKey = async (keyType, data) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, keyType);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  };

  const getLocalKey = async (keyType) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(keyType);
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
  };

  // ---------- WASM memory helpers ----------
  const getWasmData = (ptrFn, lenFn) => {
    if (!window.Module || typeof window.Module.ccall !== 'function') {
      throw new Error('WASM Module not available');
    }
    const ptr = window.Module.ccall(ptrFn, 'number', [], []);
    const len = window.Module.ccall(lenFn, 'number', [], []);
    return new Uint8Array(window.Module.HEAPU8.subarray(ptr, ptr + len));
  };

  // ---------- Identity Management ----------
  const generateIdentity = async () => {
    await ensureWasm();

    // call wrapper to generate keys
    if (typeof window.Module.ccall === 'function') {
      window.Module.ccall('generate_keypair', 'number', [], []);
    } else if (typeof window.Module._generate_keypair === 'function') {
      window.Module._generate_keypair();
    } else {
      throw new Error('generate_keypair not available on Module');
    }

    const pkBytes = getWasmData('get_pk_ptr', 'get_pk_len');
    const skBytes = getWasmData('get_sk_ptr', 'get_sk_len');

    const encryptedSk = await encryptData(String.fromCharCode(...skBytes), key);
    await saveLocalKey(username, encryptedSk);

    return Array.from(pkBytes);
  };

  const loadIdentity = async () => {
    await ensureWasm();

    const encryptedSk = await getLocalKey(username);
    if (!encryptedSk) return false;

    let skString;
    try {
      skString = await decryptData(encryptedSk, key);
    } catch (e) {
      console.warn('[useCrypto] decryptData returned null (wrong password or corrupted data)', e);
      return false;
    }

    const skBytes = Uint8Array.from(skString, c => c.charCodeAt(0));
    const skPtr = window.Module.ccall('get_sk_ptr', 'number', [], []);
    window.Module.HEAPU8.set(skBytes, skPtr);

    // if there's a set_secret_key cwrap/ccall wrapper, call it (you had set_secret_key before)
    if (typeof window.Module.ccall === 'function') {
      try {
        window.Module.ccall('set_secret_key', null, ['number'], [skPtr]);
      } catch (e) {
        // If set_secret_key doesn't exist, ignore
      }
    } else if (typeof window.Module._set_secret_key === 'function') {
      window.Module._set_secret_key(skPtr);
    }

    return true;
  };

  // ---------- Sessions ----------
  const createSession = async (recipientPkArray) => {
    await ensureWasm();

    const targetPk = new Uint8Array(recipientPkArray);
    const pkPtr = window.Module._malloc(targetPk.length);
    window.Module.HEAPU8.set(targetPk, pkPtr);

    const res = window.Module.ccall('encapsulate_for', 'number', ['number'], [pkPtr]);
    window.Module._free(pkPtr);

    if (res !== 1) throw new Error('Encapsulation failed');

    return {
      ciphertext: Array.from(getWasmData('get_ct_ptr', 'get_ct_len')),
      sharedSecret: getWasmData('get_ss_ptr', 'get_ss_len')
    };
  };

  const decryptSession = async (ciphertextArray) => {
    await ensureWasm();

    const ct = new Uint8Array(ciphertextArray);
    const ctPtr = window.Module.ccall('get_ct_ptr', 'number', [], []);
    window.Module.HEAPU8.set(ct, ctPtr);

    const res = window.Module.ccall('decapsulate', 'number', ['number'], [ctPtr]);
    if (res !== 1) throw new Error('Decapsulation failed');

    return getWasmData('get_ss_ptr', 'get_ss_len');
  };

  // Return same API
  return {
    isReady,
    generateIdentity,
    loadIdentity,
    createSession,
    decryptSession,
    // helpful for debugging:
    _ensureWasm: ensureWasm
  };
}
