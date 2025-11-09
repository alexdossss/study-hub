import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import OwnNotes from '../../pages/private/OwnNotes';

/**
 * NotesModal (framer-motion removed for compatibility)
 * - Uses a portal and simple Tailwind transitions instead of framer-motion.
 *
 * Props:
 *  - onClose(): function to close the modal
 *
 * Behavior change:
 *  - When rendered as a modal we hide the "Back" button and any controls
 *    whose visible text contains: edit, delete, publish, unpublish.
 *  - We do this DOM-only from inside the modal (no changes to OwnNotes.jsx).
 */
export default function NotesModal({ onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // hide buttons with certain labels inside this modal only
    const hiddenElements = [];
    function hideControls() {
      if (!modalRef.current) return;
      const candidates = modalRef.current.querySelectorAll('button, a, [role="button"]');
      candidates.forEach((el) => {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (!text) return;
        if (
          text.includes('back') ||
          text.includes('edit') ||
          text.includes('delete') ||
          text.includes('publish') ||
          text.includes('unpublish') ||
          text.includes('create note')
        ) {
          // store original inline display to restore later
          hiddenElements.push({ el, prevDisplay: el.style.display });
          el.style.display = 'none';
        }
      });
    }

    // run once and also schedule a small retry in case OwnNotes renders async content
    hideControls();
    const retry = setTimeout(hideControls, 300);
    const retry2 = setTimeout(hideControls, 1000);

    return () => {
      // restore any hidden elements' inline display
      hiddenElements.forEach(({ el, prevDisplay }) => {
        try { el.style.display = prevDisplay || ''; } catch (e) {}
      });
      clearTimeout(retry);
      clearTimeout(retry2);
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
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-4xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-150"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-semibold">Notes</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Close
          </button>
        </div>

        <div className="p-4 h-[70vh] overflow-auto">
          {/* Reuse the OwnNotes component to show/manage notes (OwnNotes is not modified) */}
          <OwnNotes inModal />
        </div>
      </div>
    </div>,
    document.body
  );
}