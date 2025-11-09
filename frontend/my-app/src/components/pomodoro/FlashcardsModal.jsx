import React from 'react';
import { createPortal } from 'react-dom';
import FlashcardStudyMode from '../flashcards/FlashcardStudyMode';

/**
 * FlashcardsModal (framer-motion removed for compatibility)
 * - Uses a portal and simple Tailwind transitions instead of framer-motion.
 *
 * Props:
 *  - onClose(): function to close the modal
 */
export default function FlashcardsModal({ onClose }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-3xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-150"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-semibold">Flashcards</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Close
          </button>
        </div>

        <div className="p-4 h-[70vh] overflow-auto">
          {/* Reuse the FlashcardStudyMode component */}
          <FlashcardStudyMode inModal />
        </div>
      </div>
    </div>,
    document.body
  );
}