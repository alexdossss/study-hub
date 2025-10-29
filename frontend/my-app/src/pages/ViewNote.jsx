import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const API_BASE = 'http://localhost:5000';

const containerStyle = {
  width: '100%',
  minHeight: '80vh',
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
  padding: 8,
  marginTop: 12,
};

const embedStyle = {
  width: '100%',
  height: '80vh',
  border: 'none',
  borderRadius: 6,
  boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
};

export default function ViewNote() {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');

  useEffect(() => {
    let mounted = true;
    const fetchNote = async () => {
      if (!userInfo?.token) {
        setError('Please log in to view notes.');
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get(`${API_BASE}/api/notes/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        console.log('Fetched note:', data);
        if (mounted) {
          setNote(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('fetchNote error:', err);
        if (mounted) {
          setError(err.response?.data?.message || 'Failed to fetch note');
          setLoading(false);
        }
      }
    };
    fetchNote();
    return () => { mounted = false; };
  }, [id, userInfo]);

  // Build a reliable file URL for embedding or downloading
  const buildFileUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    // common backend static folder names: /uploads or uploads
    if (raw.startsWith('/')) return `${API_BASE}${raw}`;
    return `${API_BASE}/${raw}`;
  };

  const renderFilePreview = () => {
    if (!note?.fileUrl) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p>File not available</p>
        </div>
      );
    }

    const fileUrl = buildFileUrl(note.fileUrl);
    console.log('Resolved file URL:', fileUrl);
    const t = (note.fileType || '').toLowerCase();

    // PDF
    if (t.includes('pdf') || fileUrl.endsWith('.pdf')) {
      // Try direct embed; if backend blocks framing you will need the backend change below
      return (
        <div style={containerStyle}>
          <iframe src={fileUrl} title={note.title} style={embedStyle} />
        </div>
      );
    }

    // Images
    if (t.match(/png|jpg|jpeg|gif/) || fileUrl.match(/\.(png|jpg|jpeg|gif)$/i)) {
      return (
        <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src={fileUrl} alt={note.title} style={{ maxHeight: '80vh', width: 'auto', maxWidth: '100%', borderRadius: 6 }} />
        </div>
      );
    }

    // Office docs (.doc, .docx) - use Microsoft viewer
    if (fileUrl.match(/\.(doc|docx|ppt|pptx|xls|xlsx)$/i)) {
      const enc = encodeURIComponent(fileUrl);
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${enc}`;
      return (
        <div style={containerStyle}>
          <iframe src={officeUrl} title={note.title} style={embedStyle} />
        </div>
      );
    }

    // fallback: download
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>This file type cannot be previewed directly.</p>
        <a href={fileUrl} download style={{ display: 'inline-block', padding: '8px 16px', background: '#1f6feb', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
          Download File
        </a>
      </div>
    );
  };

  const renderGoogleDocsPreview = () => {
    // Try multiple fields the backend might use
    const raw = note?.googleDocsUrl ?? note?.docsUrl ?? note?.docs_url ?? note?.docs ?? note?.url ?? null;
    if (!raw) {
      console.log('No Google Docs URL found on note (checked googleDocsUrl/docsUrl/docs_url/docs/url). Note object:', note);
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p>Google Docs link not available</p>
        </div>
      );
    }

    console.log('Raw Google Docs URL found:', raw);
    const isOwner = note?.owner === userInfo?._id;
    let url = raw.trim();

    // If it's a docs.google.com URL, try to extract type and id
    if (url.includes('docs.google.com')) {
      // Patterns for Document / Spreadsheet / Presentation
      const docMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/) || url.match(/\/slides\/presentation\/d\/([a-zA-Z0-9-_]+)/);

      if (docMatch?.[1]) {
        const id = docMatch[1];
        url = isOwner
          ? `https://docs.google.com/document/d/${id}/edit`
          : `https://docs.google.com/document/d/${id}/preview`;
      } else if (sheetMatch?.[1]) {
        const id = sheetMatch[1];
        url = isOwner
          ? `https://docs.google.com/spreadsheets/d/${id}/edit`
          : `https://docs.google.com/spreadsheets/d/${id}/preview`;
      } else if (slideMatch?.[1]) {
        const id = slideMatch[1];
        url = isOwner
          ? `https://docs.google.com/presentation/d/${id}/edit`
          : `https://docs.google.com/presentation/d/${id}/preview`;
      } else {
        // If we couldn't parse, leave as-is
        console.log('Could not extract Google doc id, using original URL:', url);
      }
    } else {
      // Not a docs.google.com URL — keep as-is (could be a direct shared viewer link)
      console.log('Google URL not docs.google.com, using as-is:', url);
    }

    // Ensure embeddable params
    if (!url.includes('embedded=true')) {
      url = url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`;
    }

    console.log('Final embed URL for iframe:', url);

    return (
      <div style={containerStyle}>
        <iframe
          src={url}
          title={note.title || 'Google Doc'}
          style={embedStyle}
          allowFullScreen
        />
      </div>
    );
  };

  const handleBack = () => {
    // location.state.from should be set by OwnNotes / PublicNotes as 'private' or 'public'
    if (location.state?.from === 'private') return navigate('/notes');
    if (location.state?.from === 'public') return navigate('/public-notes');
    // fallback
    navigate(-1);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12, color: 'crimson' }}>{error}</div>
        <button onClick={handleBack}>← Back</button>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleBack} style={{ padding: '6px 10px' }}>← Back</button>
      </div>

      <div>
        <h1 style={{ margin: '0 0 12px 0' }}>{note.title}</h1>

        <div>
          {note.owner !== userInfo?._id && <div>Owner: {note.ownerUsername || (note.user && note.user.username)}</div>}
          <div>Created: {note.createdAt ? format(new Date(note.createdAt), 'PPP p') : '—'}</div>
          <div>Type: {note.type}</div>
        </div>

        {note.description && <div>{note.description}</div>}

        <div>
          {note.type === 'file' && renderFilePreview()}
          {note.type === 'google_docs' && renderGoogleDocsPreview()}
        </div>
      </div>
    </div>
  );
}