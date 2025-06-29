// models/Vocabulary.js
import mongoose from "mongoose";

const exampleSchema = new mongoose.Schema({
    koreanExample: { type: String, required: true },
    vietnameseExample: { type: String, required: true }
}, { _id: false }); // không cần _id cho sub-document này

const vocabularySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Hoặc 'user' tùy theo tên bạn đặt cho User model
        required: true 
    },
    koreanWord: { type: String, required: true, trim: true },
    vietnameseMeaning: { type: String, required: true, trim: true },
    examples: { // Lưu tối đa 2 ví dụ
        type: [exampleSchema],
        validate: [val => val.length <= 2, 'Chỉ được lưu tối đa 2 ví dụ']
    },
    createdAt: { type: Date, default: Date.now }
});

// Để tránh một user lưu cùng một từ nhiều lần
vocabularySchema.index({ userId: 1, koreanWord: 1 }, { unique: true });

export default mongoose.model('Vocabulary', vocabularySchema);