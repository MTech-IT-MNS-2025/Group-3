"use client";

import { useState } from "react";

export default function Home() {
  const [p, setP] = useState("");
  const [g, setG] = useState("");

  function handleConnect(e) {
    e?.preventDefault();
    // Replace the following with your wasm / send-to-server logic.
    // Example: compute x = await modexp(Number(g), a, Number(p)), then fetch('/api/compute'...)
    console.log("CONNECT clicked — p:", p, "g:", g);
    alert(`Would connect with p=${p} g=${g}`);
  }

  // Styles that match the screenshot
  const pageBg = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#eee" };
  const panel = {
    width: 420,
    height: 520,
    background: "#cfe2ff",          // light blue inside (adjust if you'd like slightly different)
    border: "1px solid #333",       // thin dark border like screenshot
    boxSizing: "border-box",
    padding: 28,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };
  const formArea = {
    width: "100%",
    marginTop: 18,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  };
  const labelRow = { display: "flex", alignItems: "center", width: "100%", marginBottom: 18 };
  const label = { width: 160, textAlign: "left", color: "#2d3b52", fontWeight: 600, fontSize: 14 };
  const input = {
    width: 150,
    height: 24,
    padding: "4px 6px",
    borderRadius: 2,
    border: "1px solid #999",
    background: "#fff",
  };
  const buttonWrap = { width: "100%", display: "flex", justifyContent: "center", marginTop: 28 };
  const button = {
    background: "#f2f2f2",
    border: "2px solid #aaa",
    borderRadius: 10,
    padding: "8px 20px",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div style={pageBg}>
      <div style={panel}>
        {/* Top offset to mimic screenshot spacing */}
        <div style={{ height: 28 }} />

        <form onSubmit={handleConnect} style={formArea}>
          <div style={labelRow}>
            <label style={label}>Enter the Value of p:</label>
            <input
              style={input}
              value={p}
              onChange={(e) => setP(e.target.value)}
              aria-label="p"
              placeholder=""
            />
          </div>

          <div style={labelRow}>
            <label style={label}>Enter the Value of g:</label>
            <input
              style={input}
              value={g}
              onChange={(e) => setG(e.target.value)}
              aria-label="g"
              placeholder=""
            />
          </div>

          <div style={buttonWrap}>
            <button type="submit" style={button}>CONNECT</button>
          </div>
        </form>

        {/* empty space to match screenshot */}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

