// backend/routes/flashcardRoutes.js
import express from "express";
import flashcardController from "../controllers/flashcardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes for deck management
router.post("/decks", protect, flashcardController.createDeck);
router.get("/decks", protect, flashcardController.getUserDecks);
router.get("/decks/:deckId", protect, flashcardController.getDeckById);
router.patch("/decks/:deckId", protect, flashcardController.renameDeck);
router.delete("/decks/:deckId", protect, flashcardController.deleteDeck);

// Cards inside a deck
router.post("/decks/:deckId/cards", protect, flashcardController.addCards);
router.patch("/cards/:cardId", protect, flashcardController.updateCard);
router.delete("/cards/:cardId", protect, flashcardController.deleteCard);

// Public access to public decks (no auth required)
router.get("/public", flashcardController.getPublicDecks);

export default router;