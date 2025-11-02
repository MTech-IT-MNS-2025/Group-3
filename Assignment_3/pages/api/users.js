// pages/api/users.js
import db from "../../lib/db"; // import your db helper
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/Users"

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export default async function handler(req, res) {
  await db; // ensure DB connection

  const { method } = req;

  switch (method) {
    // REGISTER (POST /api/users)
    case "POST":
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ message: "Username and password are required" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        return res.status(201).json({ message: "User registered successfully" });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

    // LOGIN (PUT /api/users) - PUT is often used for full replacement, but often used for login in practice
    case "PUT":
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ message: "Username and password are required" });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        // Generate JWT
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });

        return res.status(200).json({ message: "Login successful", token, username: user.username});
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

    // RESET PASSWORD (PATCH /api/users)
    case "PATCH":
      try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) {
          return res.status(400).json({ message: "Username and new password are required" });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

    // ✅ FETCH ALL USERS or SEARCH USERS
    case "GET":
      try {
        const { q } = req.query;

        // If search query exists → search users by name
        if (q) {
          const users = await User.find({
            username: { $regex: q, $options: "i" },
          }).select("-password"); // hide passwords
          return res.status(200).json(users);
        }

        // Otherwise → return all users
        const allUsers = await User.find().select("-password");
        return res.status(200).json(allUsers);
      } catch (err) {
        console.error("GET /api/users error:", err);
        return res.status(500).json({ message: "Server error" });
      }

    default:
      res.setHeader("Allow", ["POST", "PUT", "PATCH"]);
      // FIX: Use template literal backticks (`)
      return res.status(405).end(`Method ${method} Not Allowed`); 
  }
}
