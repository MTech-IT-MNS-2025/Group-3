import mongoose from "mongoose";

const encEntrySchema = new mongoose.Schema(
  {
    kem_ct: { type: String, required: true },   // base64-encoded KEM ciphertext
    enc_master: { type: Object, default: null }, // { iv: base64, ciphertext: base64 }
    keyVersion: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  participants: { type: [String], required: true },
  enc: { type: Map, of: encEntrySchema }, // map username -> encEntry
  keyVersion: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
});

export default mongoose.models.Session || mongoose.model("Session", sessionSchema);