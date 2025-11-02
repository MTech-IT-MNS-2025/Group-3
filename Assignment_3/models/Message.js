import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true } // adds createdAt, updatedAt
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
