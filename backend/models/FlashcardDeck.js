// backend/models/FlashcardDeck.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const flashcardDeckSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, default: "" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("FlashcardDeck", flashcardDeckSchema);