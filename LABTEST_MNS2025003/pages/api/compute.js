// pages/api/compute.js
import fs from 'fs';
import path from 'path';

let wasmModexp = null;

/** server-side BigInt modpow fallback */
function modPowBigInt(base, exp, mod) {
  base = BigInt(base) % BigInt(mod);
  exp = BigInt(exp);
  mod = BigInt(mod);
  if (mod === 1n) return 0n;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  return result;
}

// Try to load wasm once
async function ensureWasm() {
  if (wasmModexp !== null) return wasmModexp;
  const wasmPath = path.join(process.cwd(), 'public', 'myProg.wasm');
  try {
    if (!fs.existsSync(wasmPath)) {
      console.warn('Server: myProg.wasm not found, using JS fallback.');
      wasmModexp = null;
      return null;
    }
    const buffer = fs.readFileSync(wasmPath);
    const { instance } = await WebAssembly.instantiate(buffer, {});
    if (typeof instance.exports.modexp === 'function') {
      wasmModexp = (b, e, m) => {
        // Node's WebAssembly supports BigInt for i64 arguments
        return BigInt(instance.exports.modexp(BigInt(b), BigInt(e), BigInt(m)));
      };
      console.log('Server: loaded modexp from myProg.wasm');
      return wasmModexp;
    } else {
      console.warn('Server: modexp not exported from myProg.wasm');
      wasmModexp = null;
      return null;
    }
  } catch (err) {
    console.warn('Server wasm load failed:', err);
    wasmModexp = null;
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST');

  const { g, p, x } = req.body;
  if (!g || !p || !x) return res.status(400).send('Missing g,p,x');

  try {
    const pBI = BigInt(p);
    const gBI = BigInt(g);
    const xBI = BigInt(x);

    // 2. b <- random element of Z_p (server)
    function randomInRangeServer(p) {
      p = BigInt(p);
      if (p <= 2n) return 1n;
      const nBytes = Math.ceil((p - 1n).toString(2).length / 8);
      // Node crypto
      const crypto = require('crypto');
      const getRandom = () => {
        const buf = crypto.randomBytes(nBytes);
        let r = 0n;
        for (let i = 0; i < buf.length; i++) {
          r = (r << 8n) + BigInt(buf[i]);
        }
        return r;
      };
      let r = getRandom();
      while (r >= (p - 1n)) r = getRandom();
      return r + 1n;
    }

    const b = randomInRangeServer(pBI);

    // Try to load wasm modexp (server)
    const wasm = await ensureWasm();

    // 3. y = g^b mod p
    let y;
    if (wasm) {
      try {
        y = wasm(gBI, b, pBI);
      } catch (err) {
        console.warn('Server wasm modexp failed: ', err);
        y = modPowBigInt(gBI, b, pBI);
      }
    } else {
      y = modPowBigInt(gBI, b, pBI);
    }

    // 4. K = x^b mod p
    let K;
    if (wasm) {
      try {
        K = wasm(xBI, b, pBI);
      } catch (err) {
        console.warn('Server wasm modexp failed for K: ', err);
        K = modPowBigInt(xBI, b, pBI);
      }
    } else {
      K = modPowBigInt(xBI, b, pBI);
    }

    // 5. Send <K, y> to client
    res.status(200).json({ K: K.toString(), y: y.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

