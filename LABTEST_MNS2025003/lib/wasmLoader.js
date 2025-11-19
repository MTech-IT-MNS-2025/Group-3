// lib/wasmLoader.js
let wasmInstance = null;

/**
 * Load the wasm module (public/myProg.wasm)
 * Returns an object { modexp: (base, exp, mod) => BigInt result } or null if not available.
 */
export async function loadWasmModexp() {
  if (wasmInstance) return wasmInstance;

  try {
    const resp = await fetch('/myProg.wasm');
    if (!resp.ok) {
      console.warn('myProg.wasm not found in /public — falling back to JS.');
      return null;
    }
    const buffer = await resp.arrayBuffer();

    // instantiate with BigInt enabled for i64 -> BigInt integration
    const { instance } = await WebAssembly.instantiate(buffer, {});
    const exports = instance.exports;

    // Expecting a function exported as "modexp" that takes (i64 base, i64 exp, i64 mod) -> i64
    if (typeof exports.modexp === 'function') {
      // wrap to accept BigInt or Number and return BigInt
      wasmInstance = {
        modexp: (base, exp, mod) => {
          // Ensure values are BigInt
          const b = BigInt(base);
          const e = BigInt(exp);
          const m = BigInt(mod);
          // WebAssembly JS integration for i64 expects BigInt arguments
          const res = exports.modexp(b, e, m);
          return BigInt(res);
        }
      };
      console.log('Loaded modexp from myProg.wasm');
      return wasmInstance;
    } else {
      console.warn('myProg.wasm does not export modexp — falling back to JS.');
      return null;
    }
  } catch (err) {
    console.warn('Error loading wasm (will fallback to JS):', err);
    return null;
  }
}

