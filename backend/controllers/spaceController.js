import Space from '../models/Space.js';
import Member from '../models/Member.js';
import Message from '../models/Message.js';
import SharedNote from '../models/SharedNote.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import Quiz from '../models/Quiz.js';
import User from '../models/userModel.js';
import { getIo } from '../utils/socket.js';

/**
 * Space controller
 * - Assumes protect middleware has set req.user = { id, ... }
 */

/* Create a space
 * POST /api/spaces
 * body: { title, description, isPublic }
 */
export async function createSpace(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { title, description = '', isPublic = true } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const space = await Space.create({
      title: title.trim(),
      description: (description || '').trim(),
      isPublic: !!isPublic,
      admin: userId,
      members: [{ user: userId, role: 'admin', joinedAt: new Date() }]
    });

    // create Member record
    try {
      await Member.create({ user: userId, space: space._id, role: 'admin', status: 'approved', requestedAt: new Date(), approvedAt: new Date() });
    } catch (e) { /* non-fatal */ }

    return res.status(201).json({ space: space.toSummary ? space.toSummary() : { id: space._id, title: space.title } });
  } catch (err) {
    console.error('createSpace', err);
    return res.status(500).json({ message: 'Failed to create space' });
  }
}

/* List spaces (public listing). GET /api/spaces?mine=true -> spaces where user is member */
export async function listSpaces(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const mine = req.query.mine === 'true';
    let docs;
    if (mine && userId) {
      docs = await Space.find({ 'members.user': userId }).sort({ createdAt: -1 }).lean();
    } else {
      docs = await Space.find({}).sort({ createdAt: -1 }).lean();
    }
    const list = docs.map((d) => ({
      id: d._id,
      title: d.title,
      description: d.description,
      isPublic: d.isPublic,
      admin: d.admin,
      memberCount: (d.members || []).length,
      createdAt: d.createdAt
    }));
    return res.json({ spaces: list });
  } catch (err) {
    console.error('listSpaces', err);
    return res.status(500).json({ message: 'Failed to list spaces' });
  }
}

/* Get space details
 * GET /api/spaces/:spaceId
 */
export async function getSpace(req, res) {
  try {
    const { spaceId } = req.params;
    const space = await Space.findById(spaceId)
      .populate('admin', 'name username email')
      .populate('members.user', 'name username email')
      .lean();
    if (!space) return res.status(404).json({ message: 'Space not found' });
    return res.json({ space });
  } catch (err) {
    console.error('getSpace', err);
    return res.status(500).json({ message: 'Failed to load space' });
  }
}

/* Request to join a space
 * POST /api/spaces/:spaceId/join
 */
export async function requestJoin(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    // if already member
    if ((space.members || []).some((m) => String(m.user) === String(userId))) {
      return res.status(400).json({ message: 'Already a member' });
    }

    await space.requestJoin(userId);
    // create Member record if not exists
    await Member.updateOne(
      { user: userId, space: space._id },
      { $setOnInsert: { user: userId, space: space._id, status: 'requested', requestedAt: new Date() } },
      { upsert: true }
    );

    // notify admin via socket (if connected)
    try {
      const io = getIo();
      io.to(String(space.admin)).emit('space:joinRequest', { spaceId: space._id, userId });
    } catch (e) { /* ignore */ }

    return res.json({ message: 'Join requested' });
  } catch (err) {
    console.error('requestJoin', err);
    return res.status(500).json({ message: 'Failed to request join' });
  }
}

/* Approve or reject a join request
 * POST /api/spaces/:spaceId/join/:memberId (body: { action: 'approve'|'reject' })
 * Only admin can call this.
 */
export async function handleJoinRequest(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId, memberId } = req.params;
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid action' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    if (String(space.admin) !== String(userId)) return res.status(403).json({ message: 'Only admin can approve/reject' });

    // update Member model
    const memberRecord = await Member.findOne({ _id: memberId }) || await Member.findOne({ user: memberId, space: spaceId });
    if (!memberRecord) return res.status(404).json({ message: 'Join request not found' });

    if (action === 'approve') {
      if (typeof memberRecord.approve === 'function') await memberRecord.approve();
      if (typeof space.addMember === 'function') await space.addMember(memberRecord.user, 'member');
      try { getIo().to(String(memberRecord.user)).emit('space:joinApproved', { spaceId: space._id }); } catch (e) {}
      return res.json({ message: 'Approved' });
    } else {
      if (typeof memberRecord.reject === 'function') await memberRecord.reject();
      // remove request from space.joinRequests
      space.joinRequests = (space.joinRequests || []).filter((r) => String(r.user) !== String(memberRecord.user));
      await space.save();
      try { getIo().to(String(memberRecord.user)).emit('space:joinRejected', { spaceId: space._id }); } catch (e) {}
      return res.json({ message: 'Rejected' });
    }
  } catch (err) {
    console.error('handleJoinRequest', err);
    return res.status(500).json({ message: 'Failed to handle request' });
  }
}

/* Leave space
 * POST /api/spaces/:spaceId/leave
 */
export async function leaveSpace(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    // admin cannot leave (unless implement transfer)
    if (String(space.admin) === String(userId)) {
      return res.status(400).json({ message: 'Admin cannot leave space. Transfer admin before leaving.' });
    }

    if (typeof space.removeMember === 'function') await space.removeMember(userId);
    await Member.updateOne({ user: userId, space: space._id }, { $set: { status: 'left', leftAt: new Date() } });

    try { getIo().to(String(space._id)).emit('space:memberLeft', { spaceId: space._id, userId }); } catch (e) {}
    return res.json({ message: 'Left space' });
  } catch (err) {
    console.error('leaveSpace', err);
    return res.status(500).json({ message: 'Failed to leave space' });
  }
}

/* Remove member (admin)
 * POST /api/spaces/:spaceId/remove
 * body: { userId }
 */
export async function removeMember(req, res) {
  try {
    const actorId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });
    if (String(space.admin) !== String(actorId)) return res.status(403).json({ message: 'Only admin can remove members' });

    if (typeof space.removeMember === 'function') await space.removeMember(userId);
    await Member.updateOne({ user: userId, space: space._id }, { $set: { status: 'rejected', rejectedAt: new Date() } });

    try { getIo().to(String(space._id)).emit('space:memberRemoved', { spaceId: space._id, userId }); } catch (e) {}

    return res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('removeMember', err);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
}

/* Share a note in a space
 * POST /api/spaces/:spaceId/share/note
 * body: { noteRef (optional), title, content }
 * only members/admin can share
 */
export async function shareNote(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const { noteRef, title, content, meta = {} } = req.body;
    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const isMember = (space.members || []).some((m) => String(m.user) === String(userId));
    if (!isMember) return res.status(403).json({ message: 'Only members can share content' });

    const sn = await SharedNote.create({
      space: space._id,
      noteRef: noteRef || undefined,
      sharedBy: userId,
      title: title || '',
      content: content || '',
      meta
    });

    // add reference into space.sharedContent for quick list (optional)
    if (typeof space.shareContent === 'function') {
      await space.shareContent('note', sn._id, userId, { title: title || '' });
    } else {
      space.sharedContent = space.sharedContent || [];
      space.sharedContent.push({ kind: 'note', refId: sn._id, sharedBy: userId, sharedAt: new Date(), meta: { title: title || '' } });
      await space.save();
    }

    // emit to room
    try { getIo().to(String(space._id)).emit('space:sharedItem', { spaceId: space._id, item: { kind: 'note', refId: String(sn._id), sharedBy: userId, meta: { title: sn.title } } }); } catch (e) {}

    return res.status(201).json({ shared: sn });
  } catch (err) {
    console.error('shareNote', err);
    return res.status(500).json({ message: 'Failed to share note' });
  }
}

/* Get shared notes for a space
 * GET /api/spaces/:spaceId/shared/notes
 */
export async function getSharedNotes(req, res) {
  try {
    const { spaceId } = req.params;
    const notes = await SharedNote.find({ space: spaceId }).sort({ createdAt: -1 }).populate('sharedBy', 'name username').lean();
    return res.json({ notes: notes.map((n) => ({ id: n._id, title: n.title, content: n.content, sharedBy: n.sharedBy, createdAt: n.createdAt })) });
  } catch (err) {
    console.error('getSharedNotes', err);
    return res.status(500).json({ message: 'Failed to fetch shared notes' });
  }
}

/* Post message to space chat
 * POST /api/spaces/:spaceId/messages
 * body: { text }
 */
export async function postMessage(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text required' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const isMember = (space.members || []).some((m) => String(m.user) === String(userId));
    if (!isMember) return res.status(403).json({ message: 'Only members can post messages' });

    const msg = await Message.create({ space: space._id, user: userId, text: text.trim() });
    const payload = await Message.findById(msg._id).populate('user', 'name username').lean();

    // emit via socket to room (space._id used as room)
    try { getIo().to(String(space._id)).emit('space:message', payload); } catch (e) {}

    return res.status(201).json({ message: payload });
  } catch (err) {
    console.error('postMessage', err);
    return res.status(500).json({ message: 'Failed to post message' });
  }
}

/* Get recent messages for space
 * GET /api/spaces/:spaceId/messages?limit=50
 */
export async function getMessages(req, res) {
  try {
    const { spaceId } = req.params;
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const msgs = await Message.find({ space: spaceId }).sort({ createdAt: -1 }).limit(limit).populate('user', 'name username').lean();
    return res.json({ messages: msgs.reverse() }); // oldest first
  } catch (err) {
    console.error('getMessages', err);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
}

/* Share a flashcard deck in a space
 * POST /api/spaces/:spaceId/share/flashcard
 * body: { deckId }
 */
export async function shareFlashcard(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const { deckId } = req.body;
    if (!deckId) return res.status(400).json({ message: 'deckId required' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const isMember = (space.members || []).some((m) => String(m.user) === String(userId));
    if (!isMember) return res.status(403).json({ message: 'Only members can share content' });

    const deck = await FlashcardDeck.findById(deckId).lean();
    if (!deck) return res.status(404).json({ message: 'Flashcard deck not found' });

    if (typeof space.shareContent === 'function') {
      await space.shareContent('flashcard', deck._id, userId, { title: deck.title || deck.name });
    } else {
      space.sharedContent = space.sharedContent || [];
      space.sharedContent.push({ kind: 'flashcard', refId: deck._id, sharedBy: userId, sharedAt: new Date(), meta: { title: deck.title || deck.name } });
      await space.save();
    }

    const payload = {
      kind: 'flashcard',
      refId: String(deck._id),
      sharedBy: userId,
      meta: { title: deck.title || deck.name },
      sharedAt: new Date()
    };

    try { getIo().to(String(space._id)).emit('space:sharedItem', { spaceId: space._id, item: payload }); } catch (e) {}

    return res.status(201).json({ shared: payload });
  } catch (err) {
    console.error('shareFlashcard', err);
    return res.status(500).json({ message: 'Failed to share flashcard' });
  }
}

/* Share a quiz in a space
 * POST /api/spaces/:spaceId/share/quiz
 * body: { quizId }
 */
export async function shareQuiz(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const { quizId } = req.body;
    if (!quizId) return res.status(400).json({ message: 'quizId required' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const isMember = (space.members || []).some((m) => String(m.user) === String(userId));
    if (!isMember) return res.status(403).json({ message: 'Only members can share content' });

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (typeof space.shareContent === 'function') {
      await space.shareContent('quiz', quiz._id, userId, { title: quiz.title || quiz.name });
    } else {
      space.sharedContent = space.sharedContent || [];
      space.sharedContent.push({ kind: 'quiz', refId: quiz._id, sharedBy: userId, sharedAt: new Date(), meta: { title: quiz.title || quiz.name } });
      await space.save();
    }

    const payload = {
      kind: 'quiz',
      refId: String(quiz._id),
      sharedBy: userId,
      meta: { title: quiz.title || quiz.name },
      sharedAt: new Date()
    };

    try { getIo().to(String(space._id)).emit('space:sharedItem', { spaceId: space._id, item: payload }); } catch (e) {}

    return res.status(201).json({ shared: payload });
  } catch (err) {
    console.error('shareQuiz', err);
    return res.status(500).json({ message: 'Failed to share quiz' });
  }
}

/* List combined shared items for a space
 * GET /api/spaces/:spaceId/shared/items
 */
export async function getSharedItems(req, res) {
  try {
    const { spaceId } = req.params;
    const space = await Space.findById(spaceId).lean();
    if (!space) return res.status(404).json({ message: 'Space not found' });

    const items = await Promise.all((space.sharedContent || []).map(async (c) => {
      const base = {
        kind: c.kind,
        refId: String(c.refId),
        sharedBy: c.sharedBy,
        sharedAt: c.sharedAt,
        meta: c.meta || {}
      };

      if (c.kind === 'note') {
        const sn = await SharedNote.findById(c.refId).populate('sharedBy', 'name username').lean();
        return { ...base, payload: sn ? { id: sn._id, title: sn.title, content: sn.content, sharedBy: sn.sharedBy } : null };
      } else if (c.kind === 'flashcard') {
        const deck = await FlashcardDeck.findById(c.refId).lean();
        return { ...base, payload: deck ? { id: deck._id, title: deck.title || deck.name, cardsCount: deck.cards?.length || 0 } : null };
      } else if (c.kind === 'quiz') {
        const quiz = await Quiz.findById(c.refId).lean();
        return { ...base, payload: quiz ? { id: quiz._id, title: quiz.title || quiz.name, questionsCount: quiz.questions?.length || 0 } : null };
      }
      return base;
    }));

    // populate sharedBy user objects for easier client rendering
    const populated = await Promise.all(items.map(async (it) => {
      try {
        const u = await User.findById(it.sharedBy).select('name username').lean();
        return { ...it, sharedByUser: u || null };
      } catch {
        return { ...it, sharedByUser: null };
      }
    }));

    return res.json({ items: populated });
  } catch (err) {
    console.error('getSharedItems', err);
    return res.status(500).json({ message: 'Failed to fetch shared items' });
  }
}

/* Unshare an item from a space
 * POST /api/spaces/:spaceId/unshare
 * body: { kind: 'note'|'flashcard'|'quiz', refId }
 * Only admin or the user who shared can unshare.
 */
export async function unshareItem(req, res) {
  try {
    const actorId = req.user?.id || req.user?._id;
    const { spaceId } = req.params;
    const { kind, refId } = req.body;
    if (!kind || !refId) return res.status(400).json({ message: 'kind and refId required' });

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Space not found' });

    // find matching entries
    const matches = (space.sharedContent || []).filter((c) => String(c.kind) === String(kind) && String(c.refId) === String(refId));
    if (matches.length === 0) return res.status(404).json({ message: 'Shared item not found in space' });

    // permission check: admin or original sharer
    const allowed = matches.some((m) => String(m.sharedBy) === String(actorId)) || String(space.admin) === String(actorId);
    if (!allowed) return res.status(403).json({ message: 'Not allowed to unshare this item' });

    // remove entries
    space.sharedContent = (space.sharedContent || []).filter((c) => !(String(c.kind) === String(kind) && String(c.refId) === String(refId)));
    await space.save();

    // if it was a SharedNote doc created for sharing, remove it to avoid orphan (best-effort)
    if (kind === 'note') {
      try {
        await SharedNote.findByIdAndDelete(refId);
      } catch (e) {}
    }

    try { getIo().to(String(space._id)).emit('space:unsharedItem', { spaceId: space._id, kind, refId, actorId }); } catch (e) {}

    return res.json({ message: 'Unshared' });
  } catch (err) {
    console.error('unshareItem', err);
    return res.status(500).json({ message: 'Failed to unshare item' });
  }
}

export default {
  createSpace,
  listSpaces,
  getSpace,
  requestJoin,
  handleJoinRequest,
  leaveSpace,
  removeMember,
  shareNote,
  shareFlashcard,
  shareQuiz,
  getSharedNotes,
  getSharedItems,
  unshareItem,
  postMessage,
  getMessages
};