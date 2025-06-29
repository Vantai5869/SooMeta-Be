import Comment from '../models/Comment.js';

const commentAuthMiddleware = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        
        if (!commentId) {
            return res.status(400).json({
                success: false,
                error: "Comment ID is required",
                code: "MISSING_COMMENT_ID"
            });
        }

        // Find the comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                error: "Comment not found",
                code: "COMMENT_NOT_FOUND"
            });
        }

        // Check if user is admin
        if (req.currentUser.role === 'admin') {
            // Admin can delete any comment
            req.comment = comment;
            return next();
        }

        // Check if user is the comment creator
        if (comment.userId.toString() === req.currentUser.id) {
            // Comment creator can delete their own comment
            req.comment = comment;
            return next();
        }

        // User is neither admin nor comment creator
        return res.status(403).json({
            success: false,
            error: "You don't have permission to delete this comment",
            code: "UNAUTHORIZED_DELETE"
        });

    } catch (error) {
        console.error('Comment authorization error:', error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            code: "INTERNAL_ERROR"
        });
    }
};

export default commentAuthMiddleware; 