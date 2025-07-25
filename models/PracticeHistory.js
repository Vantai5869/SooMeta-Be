// models/PracticeHistory.js
import mongoose from "mongoose";

const practiceHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  questionId: {
    type: String,
    required: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // Có thể là string, number, object tuỳ loại câu hỏi
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

practiceHistorySchema.index({ userId: 1, questionId: 1 }, { unique: true });

export default mongoose.models.PracticeHistory || mongoose.model('PracticeHistory', practiceHistorySchema); 