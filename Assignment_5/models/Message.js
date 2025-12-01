import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // plaintext (for dev only) — remove in production once migration done
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // E2EE metadata
    sessionId: { type: String, index: true },
    messageIndex: { type: Number, default: 0 },
    keyVersion: { type: Number, default: 1 },

    // AES-GCM encrypted blob (single ciphertext per message using hybrid approach)
    iv: { type: String, default: null },        // base64
    ciphertext: { type: String, default: null },// base64

    // Optional: keep per-participant enc_master references if you prefer storing them per message
    // encForSender: { kem_ct, enc_master } ... (we use Session model instead)

    // Seen/unseen tracking
    seen: {
      type: Boolean,
      default: false,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, seen: 1 });

messageSchema.methods.toChatJSON = function () {
  return {
    id: this._id,
    sender: this.sender,
    receiver: this.receiver,
    text: this.text,
    sessionId: this.sessionId,
    messageIndex: this.messageIndex,
    keyVersion: this.keyVersion,
    iv: this.iv,
    ciphertext: this.ciphertext,
    seen: this.seen,
    createdAt: this.createdAt,
  };
};

export default mongoose.models.Message || mongoose.model("Message", messageSchema);