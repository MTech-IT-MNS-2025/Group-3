let wasmModule = null;

export async function loadWasm() {
    if (!wasmModule) {
        const wasm = await WebAssembly.instantiateStreaming(
            fetch("/mycode.wasm")
        );
        wasmModule = wasm.instance.exports;
    }
    return wasmModule;
}

export async function modexp(g, a, p) {
    const wasm = await loadWasm();
    return wasm.modexp(g, a, p);
}

