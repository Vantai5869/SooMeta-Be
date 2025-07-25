import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    required: false
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000 
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'comment',
    default: null // null means it's a top-level comment
  },
  likes: { 
    type: Number, 
    default: 0 
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  replyCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt
});

// Index for better query performance
commentSchema.index({ examId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ examId: 1, likes: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });

// Virtual for replies (not stored in database, computed on demand)
commentSchema.virtual('replies', {
  ref: 'comment',
  localField: '_id',
  foreignField: 'parentId'
});

// Ensure virtuals are included when converting to JSON
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

export default mongoose.model('comment', commentSchema); 