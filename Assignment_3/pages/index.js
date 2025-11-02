import { useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "PUT", // your API uses PUT for login
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save token for future authenticated requests
        localStorage.setItem("token", data.token);

        // Navigate to chat
        localStorage.setItem("username", data.username);
        router.push("/chat");
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error. Please try again.");
    }
  };

  const handleRegister = () =>{
    router.push("/register");
  }

  const handleForgotPassword = () =>{
    router.push("/forgot_password");
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Chat App Login</h1>
        <form className="flex flex-col">
          <input
            type="text"
            placeholder="Username"
            className="border border-gray-400 p-2 mb-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full border border-gray-400 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
            >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <h4
            onClick={handleForgotPassword}
            className="mb-4 text-xs text-gray-800 text-right hover:text-blue-600 transition  cursor-pointer">
            Forgot Password?
          </h4>

          <button
            type="submit"
            onClick={handleLogin}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
          >
            Login
          </button>

          <h2 
            className="mt-2 py-2 text-sm text-gray-800 text-center cursor-pointer"
            onClick={handleRegister}
          >
            Don&apos;t have an account?{" "}<span className="text-blue-500">Sign Up</span>
          </h2>
        </form>
      </div>
    </div>
  )
}
