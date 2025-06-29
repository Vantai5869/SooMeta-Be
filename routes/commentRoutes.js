import express from 'express';
import Comment from '../models/Comment.js';
import authMiddleware from '../middleware/auth.js';
import commentAuthMiddleware from '../middleware/commentAuth.js';

const router = express.Router();

// GET /api/comments - Get comments by examId with pagination and sorting
router.get('/', async (req, res) => {
  try {
    const { examId, page = 1, limit = 10, sort = 'newest', includeReplies = 'false' } = req.query;

    if (!examId) {
      return res.status(400).json({
        success: false,
        error: "examId is required",
        code: "MISSING_EXAM_ID"
      });
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'mostLiked':
        sortObj = { likes: -1, createdAt: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get only top-level comments (parentId is null)
    const query = { examId, parentId: null };
    
    const comments = await Comment.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('replies', null, null, { sort: { createdAt: 1 } })
      .lean();

    // Add isLiked field if user is authenticated
    if (req.currentUser) {
      const userId = req.currentUser.id;
      comments.forEach(comment => {
        comment.isLiked = comment.likedBy.includes(userId);
        // Also check likes for replies
        if (comment.replies) {
          comment.replies.forEach(reply => {
            reply.isLiked = reply.likedBy.includes(userId);
          });
        }
      });
    }

    // Get total count for pagination (only top-level comments)
    const totalComments = await Comment.countDocuments(query);
    const totalPages = Math.ceil(totalComments / parseInt(limit));

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalComments,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      },
      message: "Comments retrieved successfully"
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// GET /api/comments/:commentId/replies - Get replies for a specific comment
router.get('/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get replies for the comment
    const replies = await Comment.find({ parentId: commentId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add isLiked field if user is authenticated
    if (req.currentUser) {
      const userId = req.currentUser.id;
      replies.forEach(reply => {
        reply.isLiked = reply.likedBy.includes(userId);
      });
    }

    // Get total count for pagination
    const totalReplies = await Comment.countDocuments({ parentId: commentId });
    const totalPages = Math.ceil(totalReplies / parseInt(limit));

    res.json({
      success: true,
      data: {
        replies,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalReplies,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      },
      message: "Replies retrieved successfully"
    });

  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// POST /api/comments - Create a new comment or reply (requires authentication)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { examId, content, parentId } = req.body;

    // Validation
    if (!examId || !content) {
      return res.status(400).json({
        success: false,
        error: "examId and content are required",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }

    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        error: "Content cannot be empty",
        code: "EMPTY_CONTENT"
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Content cannot exceed 1000 characters",
        code: "CONTENT_TOO_LONG"
      });
    }

    // If this is a reply, validate parent comment exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          error: "Parent comment not found",
          code: "PARENT_COMMENT_NOT_FOUND"
        });
      }
    }

    // Create new comment or reply using authenticated user info
    const newComment = new Comment({
      examId,
      userId: req.currentUser.id,
      userName: req.currentUser.email, // You might want to add a name field to your user model
      userAvatar: req.currentUser.avatar || null,
      content: content.trim(),
      parentId: parentId || null
    });

    const savedComment = await newComment.save();

    // If this is a reply, update the parent comment's reply count
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: { replyCount: 1 }
      });
    }

    res.status(201).json({
      success: true,
      data: savedComment,
      message: parentId ? "Reply created successfully" : "Comment created successfully"
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// POST /api/comments/:commentId/like - Toggle like status (requires authentication)
router.post('/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.currentUser.id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
        code: "COMMENT_NOT_FOUND"
      });
    }

    // Check if user already liked the comment
    const isLiked = comment.likedBy.includes(userId);

    if (isLiked) {
      // Remove like
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Add like
      comment.likedBy.push(userId);
      comment.likes += 1;
    }

    const updatedComment = await comment.save();

    res.json({
      success: true,
      data: {
        comment: updatedComment,
        isLiked: !isLiked
      },
      message: isLiked ? "Like removed successfully" : "Comment liked successfully"
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// DELETE /api/comments/:commentId - Delete a comment (requires authentication + authorization)
router.delete('/:commentId', authMiddleware, commentAuthMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = req.comment; // Set by commentAuthMiddleware

    // If this is a top-level comment, also delete all its replies
    if (!comment.parentId) {
      await Comment.deleteMany({ parentId: commentId });
    } else {
      // If this is a reply, update the parent comment's reply count
      await Comment.findByIdAndUpdate(comment.parentId, {
        $inc: { replyCount: -1 }
      });
    }

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    res.json({
      success: true,
      message: "Comment deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

export default router; 