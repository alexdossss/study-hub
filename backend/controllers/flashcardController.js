// backend/controllers/flashcardController.js
import FlashcardDeck from "../models/FlashcardDeck.js";
import Flashcard from "../models/Flashcard.js";
import User from "../models/userModel.js"; // used for optional population checks
import mongoose from "mongoose";

/*
  Controller for flashcard decks and cards.
  All routes that require authentication expect req.user to be set by auth middleware.
*/

const createDeck = async (req, res) => {
  try {
    const { title, subject, isPublic } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const deck = await FlashcardDeck.create({
      title,
      subject: subject || "",
      isPublic: Boolean(isPublic),
      user: req.user._id,
    });

    return res.status(201).json(deck);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error creating deck" });
  }
};

const getUserDecks = async (req, res) => {
  try {
    const decks = await FlashcardDeck.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json(decks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching decks" });
  }
};

const getDeckById = async (req, res) => {
  try {
    const { deckId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deckId)) return res.status(400).json({ message: "Invalid deck id" });

    const deck = await FlashcardDeck.findById(deckId).populate({ path: "user", select: "name email" });
    if (!deck) return res.status(404).json({ message: "Deck not found" });

    // If deck is private and not owned by requester, block
    if (!deck.isPublic) {
      if (!req.user || deck.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to view this deck" });
      }
    }

    const cards = await Flashcard.find({ deck: deck._id }).sort({ createdAt: 1 });

    return res.json({ deck, cards });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching deck" });
  }
};

const renameDeck = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { title, subject, isPublic } = req.body;
    if (!mongoose.Types.ObjectId.isValid(deckId)) return res.status(400).json({ message: "Invalid deck id" });

    const deck = await FlashcardDeck.findById(deckId);
    if (!deck) return res.status(404).json({ message: "Deck not found" });
    if (deck.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    if (title !== undefined) deck.title = title;
    if (subject !== undefined) deck.subject = subject;
    if (isPublic !== undefined) deck.isPublic = Boolean(isPublic);

    await deck.save();
    return res.json(deck);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error updating deck" });
  }
};

const deleteDeck = async (req, res) => {
  try {
    const { deckId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deckId)) return res.status(400).json({ message: "Invalid deck id" });

    const deck = await FlashcardDeck.findById(deckId);
    if (!deck) return res.status(404).json({ message: "Deck not found" });
    if (deck.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    await Flashcard.deleteMany({ deck: deck._id });
    await deck.remove();

    return res.json({ message: "Deck and associated cards deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error deleting deck" });
  }
};

const addCards = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { cards } = req.body; // expect array of { question, answer }
    if (!Array.isArray(cards) || cards.length === 0) return res.status(400).json({ message: "cards array required" });
    if (!mongoose.Types.ObjectId.isValid(deckId)) return res.status(400).json({ message: "Invalid deck id" });

    const deck = await FlashcardDeck.findById(deckId);
    if (!deck) return res.status(404).json({ message: "Deck not found" });
    if (deck.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    const toInsert = cards.map((c) => ({
      deck: deck._id,
      question: c.question,
      answer: c.answer,
    }));

    const inserted = await Flashcard.insertMany(toInsert);
    return res.status(201).json({ inserted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error adding cards" });
  }
};

const updateCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const updates = req.body; // can include question, answer, rememberedCount, forgottenCount, lastReviewed

    if (!mongoose.Types.ObjectId.isValid(cardId)) return res.status(400).json({ message: "Invalid card id" });

    const card = await Flashcard.findById(cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    // verify ownership of deck
    const deck = await FlashcardDeck.findById(card.deck);
    if (!deck) return res.status(404).json({ message: "Parent deck not found" });
    if (deck.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    // allowed updates
    const allowed = ["question", "answer", "rememberedCount", "forgottenCount", "lastReviewed"];
    allowed.forEach((key) => {
      if (updates[key] !== undefined) card[key] = updates[key];
    });

    await card.save();
    return res.json(card);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error updating card" });
  }
};

const deleteCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(cardId)) return res.status(400).json({ message: "Invalid card id" });

    const card = await Flashcard.findById(cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    const deck = await FlashcardDeck.findById(card.deck);
    if (!deck) return res.status(404).json({ message: "Parent deck not found" });
    if (deck.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    await card.remove();
    return res.json({ message: "Card deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error deleting card" });
  }
};

const getPublicDecks = async (req, res) => {
  try {
    const query = { isPublic: true };
    if (req.query.subject) query.subject = req.query.subject;
    const decks = await FlashcardDeck.find(query).populate({ path: "user", select: "name" }).sort({ createdAt: -1 });
    return res.json(decks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching public decks" });
  }
};

export default {
  createDeck,
  getUserDecks,
  getDeckById,
  renameDeck,
  deleteDeck,
  addCards,
  updateCard,
  deleteCard,
  getPublicDecks,
};