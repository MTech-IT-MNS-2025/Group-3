import mongoose from "mongoose";

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
});

// Use existing model if exists
// const User = 
export default mongoose.models.User || mongoose.model("User", userSchema);