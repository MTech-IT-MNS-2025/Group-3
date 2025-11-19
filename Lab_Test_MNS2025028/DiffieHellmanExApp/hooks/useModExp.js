import { useEffect, useState } from "react";

export default function useModExp() {
  const [Module, setModule] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    const loadWasm = async () => {
      // If JS loader has already been loaded
      if (window.ModExpModule) {
        try {
          const mod = await window.ModExpModule({
            locateFile: (path) => "/modexp.wasm",
          });
          if (!mounted) return;
          setModule(mod);
          setIsLoaded(true);
        } catch (err) {
          console.error("Error instantiating ModExpModule:", err);
        }
        return;
      }

      // Otherwise load modexp.js dynamically
      const script = document.createElement("script");
      script.src = "/modexp.js";
      script.async = true;

      script.onload = async () => {
        if (!window.ModExpModule) {
          console.error("window.ModExpModule not found after script load");
          return;
        }

        try {
          const mod = await window.ModExpModule({
            locateFile: (path) => "/modexp.wasm",
          });
          if (!mounted) return;
          setModule(mod);
          setIsLoaded(true);
        } catch (err) {
          console.error("Failed to initialise modexp WASM:", err);
        }
      };

      script.onerror = () => {
        console.error("Failed to load /modexp.js");
      };

      document.body.appendChild(script);
    };

    loadWasm();

    return () => {
      mounted = false;
    };
  }, []);

  const modexp = (a, b, n) => {
    if (!Module) throw new Error("WASM Module not loaded yet");
    return Module.ccall(
      "modexp",
      "number",
      ["number", "number", "number"],
      [
      BigInt(a),
      BigInt(b),
      BigInt(n)
    ]
    );
  };

  return { modexp, isLoaded };
}
