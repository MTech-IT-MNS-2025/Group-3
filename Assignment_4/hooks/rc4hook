import { useEffect, useState } from "react";

export function useRC4() {
    const [Module, setModule] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        let mounted = true;

        const loadWasm = async () => {
            // If rc4.js already loaded once
            if (window.RC4Module) {
                const mod = await window.RC4Module({
                    locateFile: () => "/rc4.wasm",
                });

                if (mounted) {
                    setModule(mod);
                    setIsLoaded(true);
                }
                return;
            }

            // Load rc4.js dynamically
            const script = document.createElement("script");
            script.src = "/rc4.js";
            script.async = true;

            script.onload = async () => {
                const mod = await window.RC4Module({
                    locateFile: () => "/rc4.wasm",
                });

                if (mounted) {
                    setModule(mod);
                    setIsLoaded(true);
                }
            };

            script.onerror = () => console.error("Failed to load rc4.js");

            document.body.appendChild(script);
        };

        loadWasm();

        return () => {
            mounted = false;
        };
    }, []);

    // --- Base64 helpers ---
    const toBase64 = (bytes) =>
        btoa(String.fromCharCode(...bytes));

    const fromBase64 = (b64) =>
        Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // --- Encrypt ---
    const encrypt = (text, key) => {
        if (!Module) throw new Error("WASM Module not loaded");

        const encoder = new TextEncoder();

        const textBytes = encoder.encode(text);
        const keyBytes = encoder.encode(key);


        const textPtr = Module._malloc(textBytes.length);
        const keyPtr = Module._malloc(keyBytes.length);


        Module.HEAPU8.set(textBytes, textPtr);
        Module.HEAPU8.set(keyBytes, keyPtr);

        // void RC4(unsigned char *data, int len, unsigned char *key, int keylen)
        const result=Module.ccall(
            "RC4",
            null,
            ["number", "number", "number", "number"],
            [textPtr, textBytes.length, keyPtr, keyBytes.length]
        );


        const outBytes = new Uint8Array(
            Module.HEAPU8.subarray(textPtr, textPtr + textBytes.length)
        );


        Module._free(textPtr);
        Module._free(keyPtr);

        return toBase64(outBytes);
    };

    // --- Decrypt (RC4 symmetric) ---
    const decrypt = (cipherBase64, key) => {
        if (!Module) throw new Error("WASM Module not loaded");

        const cipherBytes = fromBase64(cipherBase64);
        const keyBytes = new TextEncoder().encode(key);

        const cipherPtr = Module._malloc(cipherBytes.length);
        const keyPtr = Module._malloc(keyBytes.length);

        Module.HEAPU8.set(cipherBytes, cipherPtr);
        Module.HEAPU8.set(keyBytes, keyPtr);

        Module.ccall(
            "RC4",
            null,
            ["number", "number", "number", "number"],
            [cipherPtr, cipherBytes.length, keyPtr, keyBytes.length]
        );

        const plainBytes = new Uint8Array(
            Module.HEAPU8.subarray(cipherPtr, cipherPtr + cipherBytes.length)
        );

        Module._free(cipherPtr);
        Module._free(keyPtr);

        return new TextDecoder().decode(plainBytes);
    };

    return {
        encrypt,
        decrypt,
        isLoaded,
    };
}
