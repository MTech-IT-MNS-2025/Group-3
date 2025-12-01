// pages/register.js
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useRouter } from "next/router";
import useCrypto from "../hooks/useCrypto";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [derivedKey, setDerivedKey] = useState("");

  // initialize useCrypto hook with username and derivedKey (both may be empty initially)
  const { isReady, generateIdentity } = useCrypto(username || "temp_user", derivedKey || "");

  // compute derivedKey (sha256 hex of username) when username changes
  useEffect(() => {
    const compute = async () => {
      if (!username) {
        setDerivedKey("");
        return;
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(username.trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setDerivedKey(hashHex);
    };
    compute();
  }, [username]);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isReady) {
      toast.error("Crypto engine not ready");
      return;
    }

    if (!username.trim() || !password.trim() || !confirm.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // generate identity (this will use useCrypto hook which was created with derivedKey)
      const pk = await generateIdentity(derivedKey);
      if (!pk) {
        toast.error("Key generation failed. Ensure WASM is loaded and useCrypto is initialized with the proper key.");
        setLoading(false);
        return;
      }

      // Register user on server
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, publicKey: Array.from(pk) }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Registration successful! You can now log in.");
        setUsername("");
        setPassword("");
        setConfirm("");
        setTimeout(() => router.replace("/"), 1200);
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-96 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Welcome to <span className="text-blue-500">E2EE Application</span>
          <p className="mt-3 text-sm text-gray-500">Secure. Fast. Yours.</p>
        </h1>

        <form onSubmit={handleRegister} className="flex flex-col">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-400 p-2 mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-400 p-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="relative mb-6">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-400 p-2 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !isReady}
            className={`w-full text-white p-2 rounded-md font-semibold transition ${
              loading || !isReady ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "Registering..." : isReady ? "Register" : "Waiting for crypto engine..."}
          </button>

          <p
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-gray-700 text-center cursor-pointer"
          >
            Already have an account?{" "}
            <span className="text-blue-500 hover:underline">Log In</span>
          </p>
        </form>
      </div>
    </div>
  );
}
