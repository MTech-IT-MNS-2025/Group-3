import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { g, p, x } = req.body;   // Extract <g, p, x>

    console.log("SERVER: Received g =", g); 
    console.log("SERVER: Received p =", p); 
    console.log("SERVER: Received x =", x);

    // 1️⃣ Generate random private key b
    const b = Math.floor(Math.random() * Number(p));

    // 2️⃣ Path to your compiled C executable
    const exePath = path.join(process.cwd(), "src", "modexp");

    console.log("Executable path:", exePath);

    // 3️⃣ Compute y = g^b mod p
    const { stdout: yOut } = await execFileAsync(exePath, [
      String(g),
      String(b),
      String(p)
    ]);

    const y = Number(yOut.trim());
    console.log("SERVER: y =", y);
    console.log("SERVER: b =", b);

    // 4️⃣ Compute K = x^b mod p
    const { stdout: kOut } = await execFileAsync(exePath, [
      String(x),
      String(b),
      String(p)
    ]);

    const K = Number(kOut.trim());
    console.log("SERVER: K =", K);

    // 5️⃣ Send <K, y> to client
    return res.status(200).json({
      K,
      y
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Execution failed" });
  }
}
