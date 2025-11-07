import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/flashcardApi";

export default function Flashcards() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const navigate = useNavigate();

  const fetchDecks = async () => {
    setLoading(true);
    try {
      const res = await api.getDecks();
      const data = res && res.data !== undefined ? res.data : res;
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.decks)) list = data.decks;
      else if (Array.isArray(data.data)) list = data.data;
      else if (data && typeof data === "object" && Array.isArray(data.items))
        list = data.items;
      setDecks(list);
    } catch (err) {
      console.error("Failed to load decks:", err);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const createDeck = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await api.createDeck({ title: title.trim() });
      const newDeck = res?.data || res;
      if (newDeck && (newDeck._id || newDeck.id)) {
        navigate(`/flashcards/deck/${newDeck._id || newDeck.id}`);
      } else {
        await fetchDecks();
      }
    } catch (err) {
      console.error("Failed to create deck:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeck = async (deckId) => {
    if (!deckId) return;
    if (
      !window.confirm("Delete this deck and all its cards? This cannot be undone.")
    )
      return;
    try {
      await api.deleteDeck(deckId);
      setDecks((prev) => prev.filter((d) => (d._id || d.id) !== deckId));
    } catch (err) {
      console.error("Failed to delete deck:", err);
      alert("Failed to delete deck");
    }
  };

  const openEditModal = (deck) => {
    setEditingDeckId(deck._id || deck.id);
    setEditTitle(deck.title || "");
  };

  const handleEditSubmit = async () => {
    const id = editingDeckId;
    const newTitle = editTitle.trim();
    if (!newTitle) {
      alert("Title cannot be empty.");
      return;
    }

    const deck = decks.find((d) => (d._id || d.id) === id);
    const current = deck?.title || "";
    if (newTitle === current) {
      setEditingDeckId(null);
      return;
    }

    try {
      const res = await api.renameDeck(id, newTitle);
      const updated = res?.data || res || { ...deck, title: newTitle };
      setDecks((prev) =>
        prev.map((d) =>
          (d._id || d.id) === id
            ? { ...d, title: updated.title || newTitle }
            : d
        )
      );
      setEditingDeckId(null);
    } catch (err) {
      console.error("Failed to rename deck:", err);
      alert("Failed to rename deck");
    }
  };

  const cancelEdit = () => {
    setEditingDeckId(null);
    setEditTitle("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <a href="/home">Back</a>
        <h1 className="text-2xl font-semibold">Flashcard Sets</h1>
        <div className="flex items-center space-x-2">
          <input
            className="border rounded px-3 py-1"
            placeholder="New set title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            onClick={createDeck}
            disabled={creating}
            className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            New Set
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : !Array.isArray(decks) || decks.length === 0 ? (
        <div className="text-gray-600">No decks yet. Create one above.</div>
      ) : (
        <ul className="space-y-3">
          {decks.map((d) => {
            const id = d._id || d.id;
            const isEditing = editingDeckId === id;
            return (
              <li
                key={id}
                className="border p-3 rounded flex flex-col gap-2 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <Link
                      to={`/flashcards/deck/${id}`}
                      className="font-medium text-blue-700"
                    >
                      {d.title}
                    </Link>
                    <div className="text-sm text-gray-500">
                      {d.subject || "No subject"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">
                      {new Date(
                        d.createdAt || d.created || Date.now()
                      ).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => openEditModal(d)}
                      className="text-sm text-indigo-600 hover:underline"
                      title="Edit deck title"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDeck(id)}
                      className="text-sm text-red-600 hover:underline"
                      title="Delete deck"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline Edit Modal */}
                {isEditing && (
                  <div className="mt-3 border-t pt-3 bg-gray-50 rounded p-3">
                    <h2 className="font-medium mb-2">Edit Deck Title</h2>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 flex-1"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={handleEditSubmit}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-300 px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
