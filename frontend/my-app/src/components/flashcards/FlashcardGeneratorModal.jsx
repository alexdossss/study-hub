// frontend/my-app/src/components/flashcards/FlashcardGeneratorModal.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchNotes,
  generateFlashcardsFromText,
  uploadFileAndGenerate,
} from '../../services/flashcardApi';

export default function FlashcardGeneratorModal({ onClose, onGenerated }) {
  const [mode, setMode] = useState('note'); // 'note' | 'paste' | 'upload'
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [selectedNoteText, setSelectedNoteText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedFileText, setParsedFileText] = useState('');
  const [suggestedDeckTitle, setSuggestedDeckTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedCards, setGeneratedCards] = useState(null); // array of {question,answer}

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchNotes();
        if (!mounted) return;
        // expect data to be { notes: [...] } or array — normalize
        const list = Array.isArray(data) ? data : data?.notes || [];
        setNotes(list);
      } catch (err) {
        console.warn('Failed to fetch notes', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // update suggested title when a note is selected
    const note = notes.find(n => String(n._id || n.id) === String(selectedNoteId));
    if (note) {
      setSelectedNoteText(`${note.title || ''}\n\n${note.content || note.text || ''}`);
      setSuggestedDeckTitle(note.title || '');
    } else {
      setSelectedNoteText('');
    }
  }, [selectedNoteId, notes]);

  const handleFileChange = async (e) => {
    setError(null);
    setParsedFileText('');
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setFile(null);
      setFileName('');
      return;
    }
    setFile(f);
    setFileName(f.name);

    // Try client-side parse:
    const name = (f.name || '').toLowerCase();
    const isText = f.type.startsWith('text') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv');
    const isPdf = name.endsWith('.pdf') || f.type === 'application/pdf';

    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        setParsedFileText(String(reader.result || '').trim());
      };
      reader.onerror = () => {
        setError('Failed to read file.');
      };
      reader.readAsText(f);
      return;
    }

    if (isPdf) {
      // Try to parse PDF client-side via pdfjs-dist (dynamic import)
      try {
        setGenerating(true);
        const pdfjs = await import('pdfjs-dist/build/pdf');
        // pdfjs-dist requires a worker; use the build version default worker src
        try {
          // Try to set workerSrc if available (browser build may require it)
          // eslint-disable-next-line no-undef
          pdfjs.GlobalWorkerOptions = pdfjs.GlobalWorkerOptions || {};
          // Attempt to set workerSrc to CDN as fallback
          pdfjs.GlobalWorkerOptions.workerSrc = pdfjs.GlobalWorkerOptions.workerSrc || 'https://unpkg.com/pdfjs-dist@3.6.172/build/pdf.worker.min.js';
        } catch (e) { /* ignore */ }

        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          // eslint-disable-next-line no-await-in-loop
          const page = await pdf.getPage(i);
          // eslint-disable-next-line no-await-in-loop
          const content = await page.getTextContent();
          const pageText = content.items.map(it => it.str).join(' ');
          text += (pageText + '\n\n');
        }
        setParsedFileText(text.trim());
      } catch (err) {
        console.warn('PDF parse failed client-side, will fallback to upload:', err);
        setError('Client-side PDF parsing unavailable; will upload file to server on generate (fallback).');
        setParsedFileText(''); // keep empty so fallback happens
      } finally {
        setGenerating(false);
      }
      return;
    }

    // For other types, attempt to read as text
    const reader = new FileReader();
    reader.onload = () => {
      setParsedFileText(String(reader.result || '').trim());
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(f);
  };

  const handleGenerate = async () => {
    setError(null);
    setGeneratedCards(null);

    let textToSend = '';
    if (mode === 'note') {
      if (!selectedNoteId) {
        setError('Please select a note.');
        return;
      }
      textToSend = selectedNoteText;
    } else if (mode === 'paste') {
      if (!pasteText || pasteText.trim().length < 20) {
        setError('Please paste at least 20 characters of notes.');
        return;
      }
      textToSend = pasteText;
    } else if (mode === 'upload') {
      if (!file) {
        setError('Please choose a file to upload.');
        return;
      }
      // prefer parsedFileText (client-side parsing). If empty for PDF fallback, we'll upload file instead.
      if (parsedFileText && parsedFileText.trim().length >= 20) {
        textToSend = parsedFileText;
      }
    }

    setLoading(true);

    try {
      let result;
      if (textToSend) {
        // send parsed text (note, paste, or parsed file text)
        result = await generateFlashcardsFromText(textToSend, suggestedDeckTitle || '');
      } else {
        // no parsed text (likely PDF that couldn't be parsed client-side) => upload file to backend
        result = await uploadFileAndGenerate(file, suggestedDeckTitle || '');
      }

      const cards = result?.flashcards || [];
      if (!Array.isArray(cards) || cards.length === 0) {
        setError('AI returned no flashcards.');
      } else {
        // show review/edit UI
        setGeneratedCards(cards.map(c => ({ question: c.question || '', answer: c.answer || '' })));
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to generate flashcards';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // basic validation and trim
    const cleaned = (generatedCards || []).map(c => ({
      question: (c.question || '').trim(),
      answer: (c.answer || '').trim()
    })).filter(c => c.question && c.answer);
    if (cleaned.length === 0) {
      setError('No valid flashcards to save.');
      return;
    }
    onGenerated?.(cleaned, suggestedDeckTitle || '');
    onClose?.();
  };

  const updateCard = (idx, field, value) => {
    setGeneratedCards(prev => {
      const copy = prev ? [...prev] : [];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded p-4 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Generate Flashcards (AI)</h3>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>

        <div className="mb-3 space-y-2">
          <div className="flex gap-3 items-center">
            <label className="inline-flex items-center">
              <input type="radio" name="mode" checked={mode === 'note'} onChange={() => setMode('note')} className="mr-2" />
              Use existing note
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="mode" checked={mode === 'paste'} onChange={() => setMode('paste')} className="mr-2" />
              Paste notes
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="mode" checked={mode === 'upload'} onChange={() => setMode('upload')} className="mr-2" />
              Upload file
            </label>
          </div>

          {mode === 'note' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select note</label>
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">-- choose a note --</option>
                {notes.map(n => (
                  <option key={n._id || n.id} value={n._id || n.id}>
                    {n.title || (n.content || n.text || '').slice(0, 60)}
                  </option>
                ))}
              </select>

              {selectedNoteText && (
                <div className="mt-2 p-2 border rounded bg-gray-50 text-sm max-h-36 overflow-auto">
                  <strong className="block">{suggestedDeckTitle}</strong>
                  <div>{selectedNoteText.slice(0, 200)}{selectedNoteText.length > 200 ? '…' : ''}</div>
                </div>
              )}
            </div>
          )}

          {mode === 'paste' && (
            <div>
              <label className="block text-sm font-medium mb-1">Paste notes</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste or type notes here..."
                className="w-full h-32 p-2 border rounded mb-1"
              />
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <label className="block text-sm font-medium mb-1">Upload file (txt, md, pdf)</label>
              <input type="file" accept=".txt,.md,.pdf" onChange={handleFileChange} />
              {fileName && <div className="text-xs text-gray-500 mt-1">Loaded: {fileName}</div>}
              {generating && <div className="text-sm text-gray-600 mt-1">Parsing file...</div>}
              {parsedFileText && (
                <div className="mt-2 p-2 border rounded bg-gray-50 text-sm max-h-36 overflow-auto">
                  <div>{parsedFileText.slice(0, 300)}{parsedFileText.length > 300 ? '…' : ''}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">Suggested deck title (optional)</label>
            <input
              value={suggestedDeckTitle}
              onChange={(e) => setSuggestedDeckTitle(e.target.value)}
              placeholder="Deck title"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {error && <div className="text-red-600 mb-2">{error}</div>}

        {!generatedCards && (
          <div className="flex justify-end space-x-2">
            <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
            <button
              onClick={handleGenerate}
              disabled={loading || generating}
              className="px-4 py-1 bg-green-600 text-white rounded disabled:opacity-60"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        )}

        {generatedCards && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Review & edit generated flashcards</h4>
            <div className="space-y-3">
              {generatedCards.map((c, idx) => (
                <div key={idx} className="p-3 border rounded">
                  <label className="block text-xs text-gray-600">Question</label>
                  <input
                    value={c.question}
                    onChange={(e) => updateCard(idx, 'question', e.target.value)}
                    className="w-full p-2 border rounded mb-2"
                  />
                  <label className="block text-xs text-gray-600">Answer</label>
                  <textarea
                    value={c.answer}
                    onChange={(e) => updateCard(idx, 'answer', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setGeneratedCards(null); }} className="px-3 py-1 border rounded">Back</button>
              <button onClick={handleSave} className="px-4 py-1 bg-blue-600 text-white rounded">Save to deck</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}