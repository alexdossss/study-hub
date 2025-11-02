// frontend/my-app/src/services/flashcardApi.js
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthTokenFromStorage() {
  const t1 = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (t1) return t1;
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      return parsed?.token || parsed?.accessToken || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function authHeaders() {
  const token = getAuthTokenFromStorage();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getDecks() {
  const resp = await axios.get(`${API_URL}/api/flashcards/decks`, {
    headers: { ...authHeaders() }
  });
  return resp.data;
}

// New: fetch a single deck by id (used by FlashcardDeckView.jsx)
export async function getDeck(deckId) {
  if (!deckId) throw new Error('deckId is required');
  const resp = await axios.get(`${API_URL}/api/flashcards/decks/${deckId}`, {
    headers: { ...authHeaders() }
  });
  return resp.data;
}

export async function fetchNotes() {
  const resp = await axios.get(`${API_URL}/api/notes`, {
    headers: { ...authHeaders() }
  });
  return resp.data;
}

export async function generateFlashcardsFromText(text, suggestedDeckTitle) {
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    const err = new Error('Input text is required and must be at least 20 characters.');
    err.status = 400;
    throw err;
  }
  const body = { text, suggestedDeckTitle };
  const resp = await axios.post(`${API_URL}/api/ai/generate-flashcards`, body, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return resp.data; // { flashcards: [...] }
}

export async function uploadFileAndGenerate(file, textFallback = '') {
  const form = new FormData();
  form.append('file', file);
  if (textFallback) form.append('text', textFallback);
  const resp = await axios.post(`${API_URL}/api/ai/generate-flashcards`, form, {
    headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
  });
  return resp.data;
}

// Add cards to a deck
export async function addCards(deckId, cards = []) {
  if (!deckId) throw new Error('deckId is required');
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('cards must be a non-empty array');
  }
  const resp = await axios.post(
    `${API_URL}/api/flashcards/decks/${deckId}/cards`,
    { cards },
    { headers: { 'Content-Type': 'application/json', ...authHeaders() } }
  );
  return resp.data;
}

// Update a single card by id
export async function updateCard(cardId, payload) {
  if (!cardId) throw new Error('cardId is required');
  const resp = await axios.put(
    `${API_URL}/api/flashcards/cards/${cardId}`,
    payload,
    { headers: { 'Content-Type': 'application/json', ...authHeaders() } }
  );
  return resp.data;
}

// Delete a single card by id
export async function deleteCard(cardId) {
  if (!cardId) throw new Error('cardId is required');
  const resp = await axios.delete(`${API_URL}/api/flashcards/cards/${cardId}`, {
    headers: { ...authHeaders() }
  });
  return resp.data;
}

// Backwards-compatible default export
export default {
  getDecks,
  getDeck,
  fetchNotes,
  generateFlashcardsFromText,
  uploadFileAndGenerate,
  addCards,
  updateCard,
  deleteCard
};