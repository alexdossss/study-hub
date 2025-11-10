import express from 'express';
import * as spaceController from '../controllers/spaceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Public routes
 */
// List all spaces (public). Optional query: ?mine=true (requires auth token but route left public)
router.get('/', spaceController.listSpaces);

// Get space details
router.get('/:spaceId', spaceController.getSpace);

/**
 * Authenticated routes
 */
router.post('/', protect, spaceController.createSpace);

// Request to join a space
router.post('/:spaceId/join', protect, spaceController.requestJoin);

// Admin approve/reject a join request
router.post('/:spaceId/join/:memberId', protect, spaceController.handleJoinRequest);

// Leave space
router.post('/:spaceId/leave', protect, spaceController.leaveSpace);

// Admin remove member
router.post('/:spaceId/remove', protect, spaceController.removeMember);

// Share a note into space
router.post('/:spaceId/share/note', protect, spaceController.shareNote);

// Get shared notes for a space (members expected to call)
router.get('/:spaceId/shared/notes', protect, spaceController.getSharedNotes);

// Chat endpoints
router.post('/:spaceId/messages', protect, spaceController.postMessage);
router.get('/:spaceId/messages', protect, spaceController.getMessages);

export default router;