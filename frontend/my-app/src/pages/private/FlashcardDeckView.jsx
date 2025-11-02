// frontend/src/pages/private/FlashcardDeckView.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/flashcardApi";
import FlashcardGeneratorModal from "../../components/flashcards/FlashcardGeneratorModal";
import FlashcardStudyMode from "../../components/flashcards/FlashcardStudyMode";

export default function FlashcardDeckView() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getDeck(deckId);
      // support multiple response shapes:
      // - axios resp.data => res.data = { deck, cards }
      // - service returning { deck, cards }
      // - service returning deck object directly
      let payload = res;
      if (res && res.data) payload = res.data;
      const deckObj = payload?.deck || payload || null;
      const cardsList = payload?.cards || deckObj?.cards || [];
      setDeck(deckObj);
      setCards(Array.isArray(cardsList) ? cardsList : []);
    } catch (err) {
      console.error("Failed to load deck", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deckId) load();
    // eslint-disable-next-line
  }, [deckId]);

  const addCard = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    try {
      await api.addCards(deckId, [{ question: newQ.trim(), answer: newA.trim() }]);
      setNewQ("");
      setNewA("");
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async () => {
    if (!editingCard) return;
    try {
      await api.updateCard(editingCard._id, {
        question: editingCard.question,
        answer: editingCard.answer,
      });
      setEditingCard(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const removeCard = async (id) => {
    if (!window.confirm("Delete this card?")) return;
    try {
      await api.deleteCard(id);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading deck...</div>;
  if (!deck) return <div className="p-6">Deck not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 border rounded p-4">
        <h2 className="font-semibold text-lg">{deck.title}</h2>
        <div className="text-sm text-gray-500 mb-3">{deck.subject}</div>

        <button
          onClick={() => setShowGenerator(true)}
          className="w-full bg-green-600 text-white py-2 rounded mb-3"
        >
          Generate Cards (AI)
        </button>

        <button
          onClick={() => setStudyMode((s) => !s)}
          className="w-full bg-indigo-600 text-white py-2 rounded"
        >
          {studyMode ? "Close Study Mode" : "Start Study Mode"}
        </button>

        <hr className="my-3" />

        <div className="text-sm text-gray-600 mb-2">Cards ({cards.length})</div>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {cards.map((c) => (
            <div key={c._id} className="p-2 border rounded flex justify-between items-start">
              <div>
                <div className="font-medium">{c.question}</div>
                <div className="text-xs text-gray-500">{c.answer}</div>
              </div>
              <div className="ml-3 flex flex-col items-end space-y-1">
                <button
                  onClick={() => setEditingCard({ ...c })}
                  className="text-sm text-blue-600"
                >
                  Edit
                </button>
                <button onClick={() => removeCard(c._id)} className="text-sm text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 border rounded p-4">
        {!studyMode ? (
          <>
            <h3 className="font-semibold mb-2">Add new card</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <input
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="Question"
                className="border rounded px-3 py-2"
              />
              <input
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
                placeholder="Answer"
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="flex space-x-2 mb-6">
              <button onClick={addCard} className="bg-blue-600 text-white px-4 py-2 rounded">
                Add Card
              </button>
              {editingCard && (
                <>
                  <input
                    className="border px-2 py-1 flex-1"
                    value={editingCard.question}
                    onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                  />
                  <input
                    className="border px-2 py-1 flex-1"
                    value={editingCard.answer}
                    onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                  />
                  <button onClick={saveEdit} className="bg-green-600 text-white px-3 py-1 rounded">
                    Save
                  </button>
                  <button onClick={() => setEditingCard(null)} className="px-3 py-1">
                    Cancel
                  </button>
                </>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Preview (first 5)</h4>
              <ul className="space-y-2">
                {cards.slice(0, 5).map((c) => (
                  <li key={c._id} className="border rounded p-2">
                    <div className="font-medium">{c.question}</div>
                    <div className="text-sm text-gray-600">{c.answer}</div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <FlashcardStudyMode
            cards={cards}
            onUpdateCard={() => load()}
          />
        )}
      </div>

      {showGenerator && (
        <FlashcardGeneratorModal
          deckId={deck._id}
          onClose={() => {
            setShowGenerator(false);
            load();
          }}
        />
      )}
    </div>
  );
}