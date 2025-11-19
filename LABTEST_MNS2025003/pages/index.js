// pages/index.js
import { useEffect, useState } from 'react';
import { loadWasmModexp } from '../lib/wasmLoader';

// BigInt helper modular exponentiation fallback (binary exponentiation)
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

// generate random a in [1, p-1] using crypto randomness and BigInt
function randomInRange(p) {
  p = BigInt(p);
  if (p <= 2n) return 1n;
  // We'll generate random bytes until we get a value < p-1, then add 1
  const nBytes = Math.ceil((p - 1n).toString(2).length / 8);
  const getRandom = () => {
    const arr = new Uint8Array(nBytes);
    crypto.getRandomValues(arr);
    let r = 0n;
    for (let i = 0; i < arr.length; i++) {
      r = (r << 8n) + BigInt(arr[i]);
    }
    return r;
  };
  let r = getRandom();
  while (r >= (p - 1n)) {
    r = getRandom();
  }
  return r + 1n;
}

export default function Home() {
  const [p, setP] = useState('23'); // sample small prime
  const [g, setG] = useState('5');
  const [wasm, setWasm] = useState(null);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    loadWasmModexp().then(w => setWasm(w));
  }, []);

  async function handleRun(e) {
    e.preventDefault();
    setStatus('');
    setResult(null);

    try {
      const pBI = BigInt(p);
      const gBI = BigInt(g);

      // 2. a <- random element of Z_p (client)
      const a = randomInRange(pBI);

      setComputing(true);
      setStatus('Computing x = g^a mod p (client) ...');

      // 3. x = g^a mod p using wasm if available
      let x;
      if (wasm && wasm.modexp) {
        // wasm.modexp expects BigInt and returns BigInt
        try {
          x = await wasm.modexp(gBI, a, pBI);
        } catch (err) {
          console.warn('WASM modexp call failed, falling back to JS:', err);
          x = modPowBigInt(gBI, a, pBI);
        }
      } else {
        x = modPowBigInt(gBI, a, pBI);
      }

      setStatus('Sending <g,p,x> to server ...');

      // 4. Send <g,p,x> to server
      const body = {
        g: gBI.toString(),
        p: pBI.toString(),
        x: x.toString()
      };

      const res = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error('Server error: ' + txt);
      }
      const json = await res.json();

      // Server returns K and y as decimal strings
      const K = BigInt(json.K);
      const y = BigInt(json.y);

      setResult({ K: K.toString(), y: y.toString(), a: a.toString() });
      setStatus('Computed — displayed below');
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + (err.message || err.toString()));
    } finally {
      setComputing(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Roboto, sans-serif', padding: 24 }}>
      <h1>Diffie–Hellman (client) — Lab</h1>
      <p>Design based on QuestionPaper.pdf. Enter prime <code>p</code> and generator <code>g</code>.</p>

      <form onSubmit={handleRun} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}>
          <label>p (prime):&nbsp;
            <input value={p} onChange={e => setP(e.target.value)} />
          </label>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>g (generator):&nbsp;
            <input value={g} onChange={e => setG(e.target.value)} />
          </label>
        </div>
        <div>
          <button type="submit" disabled={computing}>Run DH</button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      {result && (
        <div style={{ marginTop: 18, padding: 12, border: '1px solid #ccc', borderRadius: 8, maxWidth: 680 }}>
          <h3>Result (sample display)</h3>
          <p><strong>K (shared key):</strong> {result.K}</p>
          <p><strong>y (server public):</strong> {result.y}</p>
          <p><strong>a (your private):</strong> {result.a}</p>
        </div>
      )}

      <hr style={{ marginTop: 30 }} />
      <p style={{ fontSize: 13, color: '#666' }}>
        Note: this UI tries to use <code>myProg.wasm</code> (compiled from your <code>myProg.c</code>) if present in <code>/public</code>.
        If not found, a BigInt JS fallback is used. For lab grading, place the wasm produced from the provided <code>myProg.c</code> in <code>public/myProg.wasm</code>.
      </p>
    </div>
  );
}

