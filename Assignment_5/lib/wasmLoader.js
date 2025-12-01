// lib/wasmLoader.js
let _initPromise = null;

/**
 * initWasmSingleton - call this once; subsequent calls return the same promise
 * initFn should be the function that initializes your WASM (the one you already call)
 */
export function initWasmSingleton(initFn) {
  if (!_initPromise) {
    _initPromise = (async () => {
      try {
        const core = await initFn(); // your existing wasm init function
        console.debug('wasmLoader: wasm initialized');
        return core;
      } catch (err) {
        console.error('wasmLoader: wasm init failed', err);
        // keep promise rejected so callers will see the error
        throw err;
      }
    })();
  }
  return _initPromise;
}

/** returns the promise (may be null if init wasn't started yet) */
export function wasmInitPromise() {
  return _initPromise;
}
