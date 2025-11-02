// frontend/my-app/src/pages/private/Flashcards.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/flashcardApi";

export default function Flashcards() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const navigate = useNavigate();

  const fetchDecks = async () => {
    setLoading(true);
    try {
      const res = await api.getDecks();
      // Inspect response shape in console for debugging
      // console.log("getDecks response:", res);
      const data = res && res.data !== undefined ? res.data : res;
      // Support different shapes: array, { decks: [...] }, { data: [...] }, single object
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.decks)) list = data.decks;
      else if (Array.isArray(data.data)) list = data.data;
      else if (data && typeof data === "object" && Array.isArray(data.items)) list = data.items;
      // last fallback: if data is falsy use empty array
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
      if (newDeck && newDeck._id) {
        navigate(`/flashcards/deck/${newDeck._id}`);
      } else {
        // fallback: reload list
        await fetchDecks();
      }
    } catch (err) {
      console.error("Failed to create deck:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
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
          {decks.map((d) => (
            <li key={d._id || d.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <Link to={`/flashcards/deck/${d._id || d.id}`} className="font-medium text-blue-700">
                  {d.title}
                </Link>
                <div className="text-sm text-gray-500">{d.subject || "No subject"}</div>
              </div>
              <div className="text-sm text-gray-600">{new Date(d.createdAt || d.created || Date.now()).toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}