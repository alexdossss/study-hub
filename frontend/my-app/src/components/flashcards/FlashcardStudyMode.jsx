// frontend/src/components/flashcards/FlashcardStudyMode.jsx
import React, { useEffect, useState } from "react";

/*
  Simple flip-card study mode:
    - receives cards array
    - shows one card at a time
    - click card to flip question/answer
    - mark Remembered / Forgotten to update counts via API
*/

export default function FlashcardStudyMode({ cards = [], onUpdateCard = () => {} }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [remembered, setRemembered] = useState(new Set());
  const total = cards.length;

  useEffect(() => {
    // reset when cards change
    setIndex(0);
    setFlipped(false);
    setSessionComplete(false);
    setRemembered(new Set());
  }, [cards]);

  const handleFlip = () => setFlipped(s => !s);

  const goNext = () => {
    if (index + 1 >= total) {
      setSessionComplete(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex(i => i - 1);
      setFlipped(false);
      setSessionComplete(false);
    }
  };

  const toggleRemembered = (i) => {
    setRemembered(prev => {
      const copy = new Set(prev);
      if (copy.has(i)) copy.delete(i);
      else copy.add(i);
      return copy;
    });
  };

  if (!Array.isArray(cards) || cards.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        No flashcards available.
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Session Complete</h2>
        <p className="mb-4">You reviewed {total} cards.</p>
        <p className="mb-4">Remembered: {remembered.size}</p>
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => { setIndex(0); setFlipped(false); setSessionComplete(false); setRemembered(new Set()); }}
          >
            Restart
          </button>
        </div>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">Card {index + 1} of {total}</div>
        <div className="text-sm text-gray-500">Remembered: {remembered.size}</div>
      </div>

      <div
        className="relative mx-auto w-full h-64 sm:h-72 md:h-80 perspective"
        style={{ perspective: 1000 }}
      >
        <div
          role="button"
          onClick={handleFlip}
          className={`relative w-full h-full cursor-pointer transition-transform duration-500 ease-in-out transform-style-preserve-3d`}
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front */}
          <div
            className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border rounded-lg shadow-md p-6 flex items-center justify-center"
            style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
          >
            <div className="text-center">
              <div className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
                {card.question}
              </div>
              <div className="mt-3 text-sm text-gray-500">Click to flip</div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border rounded-lg shadow-md p-6 flex items-center justify-center"
            style={{
              transform: 'rotateY(180deg)',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="text-center">
              <div className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-100">
                {card.answer}
              </div>
              <div className="mt-3 text-sm text-gray-500">Click to flip back</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 gap-3">
        <div className="flex gap-2">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className={`px-3 py-2 rounded ${index === 0 ? 'bg-gray-200 text-gray-400' : 'bg-white dark:bg-slate-700 border'}`}
          >
            Previous
          </button>
          <button
            onClick={goNext}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {index + 1 >= total ? 'Finish' : 'Next'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleRemembered(index)}
            className={`px-3 py-2 rounded ${remembered.has(index) ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-700 border'}`}
          >
            {remembered.has(index) ? 'Remembered' : 'Mark Remembered'}
          </button>
          <div className="text-sm text-gray-500">Tap card to flip</div>
        </div>
      </div>
    </div>
  );
}