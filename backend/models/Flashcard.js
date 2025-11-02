// backend/models/Flashcard.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const flashcardSchema = new Schema(
  {
    deck: { type: Schema.Types.ObjectId, ref: "FlashcardDeck", required: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    rememberedCount: { type: Number, default: 0 },
    forgottenCount: { type: Number, default: 0 },
    lastReviewed: { type: Date, default: null },
  },
  { timestamps: true }
);

export default model("Flashcard", flashcardSchema);