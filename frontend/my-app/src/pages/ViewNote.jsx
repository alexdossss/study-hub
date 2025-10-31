import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const API_BASE = 'http://localhost:5000';
const iframeStyle = {
  width: '100%',
  height: '85vh',
  border: 'none',
  borderRadius: 6,
  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
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
        setError('Please log in to view notes');
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get(`${API_BASE}/api/notes/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        if (mounted) {
          setNote(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || 'Failed to fetch note');
          setLoading(false);
        }
      }
    };
    fetchNote();
    return () => { mounted = false; };
  }, [id, userInfo]);

  const getOwnerId = (n) => {
    if (!n) return null;
    if (n.user && (n.user._id || n.user.id)) return String(n.user._id || n.user.id);
    if (n.owner) return String(n.owner);
    if (n.userId) return String(n.userId);
    return null;
  };

  const getRawDocsUrl = (n) => {
    if (!n) return null;
    return n.docsUrl ?? n.googleDocsUrl ?? n.docs_url ?? n.url ?? n.fileUrl ?? null;
  };

  // Build embeddable google docs URL:
  // Owners receive an /edit URL (no embedded=true) so they can edit.
  // Non-owners receive a /preview (read-only) URL with embedded=true.
  const buildGoogleEmbedUrl = (rawUrl, ownerMode) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const url = rawUrl.trim();

    // If the URL already explicitly has /preview or /view, keep it (non-editable)
    if (url.includes('/preview') || url.includes('/view')) {
      return url.includes('embedded=true') ? url : (url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`);
    }

    // Extract IDs
    const docId = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1] || url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const sheetId = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const slideId = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)?.[1] || url.match(/\/slides\/presentation\/d\/([a-zA-Z0-9-_]+)/)?.[1];

    if (docId) {
      if (ownerMode) {
        // Owner should get editable URL — plain /edit (do NOT force embedded=true)
        return `https://docs.google.com/document/d/${docId}/edit`;
      }
      return `https://docs.google.com/document/d/${docId}/preview?embedded=true`;
    }
    if (sheetId) {
      if (ownerMode) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      }
      return `https://docs.google.com/spreadsheets/d/${sheetId}/preview?embedded=true`;
    }
    if (slideId) {
      if (ownerMode) {
        return `https://docs.google.com/presentation/d/${slideId}/edit`;
      }
      return `https://docs.google.com/presentation/d/${slideId}/preview?embedded=true`;
    }

    // If original contains '/edit' and ownerMode, return original (allow editing)
    if (ownerMode && url.includes('/edit')) {
      return url;
    }

    // If non-owner and original has /edit, convert to preview
    if (!ownerMode && url.includes('/edit')) {
      const replaced = url.replace('/edit', '/preview');
      return replaced.includes('embedded=true') ? replaced : (replaced + (url.includes('?') ? '&embedded=true' : '?embedded=true'));
    }

    // Fallback: add embedded param for non-owners, return raw for owners
    return ownerMode ? url : (url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`);
  };

  const renderGoogleDocsPreview = () => {
    const raw = getRawDocsUrl(note);
    if (!raw) return <div style={{ padding: 20, textAlign: 'center' }}>Google Docs link not available</div>;

    // Strict owner check: prefer userInfo.user._id (stored by login/register), fall back to userInfo._id if present
    const viewerId = userInfo?.user?._id ? String(userInfo.user._id) : (userInfo?._id ? String(userInfo._id) : null);
    const ownerId = getOwnerId(note); // use helper above to handle multiple shapes
    const isOwner = Boolean(viewerId && ownerId && viewerId === ownerId);

    // Owners get the original (editable) URL; non-owners get a preview URL
    const embedUrl = isOwner ? raw : buildGoogleEmbedUrl(raw, false);
    if (!embedUrl) return <div style={{ padding: 20, textAlign: 'center' }}>Unable to build embed URL</div>;

    return (
      <div style={{ width: '100%', minHeight: '80vh', marginTop: 12 }}>
        <iframe
          src={embedUrl}
          title={note?.title || 'Google Doc'}
          style={iframeStyle}
          allowFullScreen
          allow="clipboard-write; encrypted-media; fullscreen; camera; microphone"
        />
      </div>
    );
  };

  const buildFileUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return `${API_BASE}${raw}`;
    return `${API_BASE}/${raw}`;
  };

  const renderFilePreview = () => {
    if (!note?.fileUrl) return <div style={{ padding: 20, textAlign: 'center' }}>File not available</div>;
    const fileUrl = buildFileUrl(note.fileUrl);
    const t = (note.fileType || '').toLowerCase();
    if (t.includes('pdf') || fileUrl.endsWith('.pdf')) {
      return <div style={{ marginTop: 12 }}><iframe src={fileUrl} title={note.title} style={iframeStyle} /></div>;
    }
    if (fileUrl.match(/\.(png|jpg|jpeg|gif)$/i)) {
      return <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}><img src={fileUrl} alt={note.title} style={{ maxHeight: '85vh', maxWidth: '100%' }} /></div>;
    }
    if (fileUrl.match(/\.(doc|docx|ppt|pptx|xls|xlsx)$/i)) {
      const enc = encodeURIComponent(fileUrl);
      const office = `https://view.officeapps.live.com/op/embed.aspx?src=${enc}`;
      return <div style={{ marginTop: 12 }}><iframe src={office} title={note.title} style={iframeStyle} /></div>;
    }
    return <div style={{ padding: 20, textAlign: 'center' }}><a href={fileUrl} download>Download File</a></div>;
  };

  const handleBack = () => {
    const fromPath = location.state?.fromPath;
    if (fromPath) return navigate(fromPath);
    const fromFlag = location.state?.from;
    if (fromFlag === 'private') return navigate('/notes');
    if (fromFlag === 'public') return navigate('/public-notes');
    if (fromFlag === 'homepage_private') return navigate('/homepage_private');
    if (fromFlag === 'homepage_public') return navigate('/homepage_public');
    navigate(-1);
  };

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>;
  if (error) return <div style={{ padding: 24 }}><div style={{ color: 'crimson' }}>{error}</div><button onClick={handleBack}>← Back</button></div>;
  if (!note) return null;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleBack} style={{ padding: '6px 10px' }}>← Back</button>
      </div>

      <div style={{ padding: 16, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.05)' }}>
        <h1 style={{ margin: '0 0 12px 0' }}>{note.title}</h1>

        <div style={{ color: '#666', marginBottom: 12 }}>
          {note.user && note.user.username && <div>Owner: {note.user.username}</div>}
          <div>Created: {note.createdAt ? format(new Date(note.createdAt), 'PPP p') : '—'}</div>
          <div>Type: {note.type}</div>
          <div>Public: {note.isPublic ? 'Yes' : 'No'}</div>
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