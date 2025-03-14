// models/Transcription.js
import mongoose from 'mongoose';

const TranscriptionSchema = new mongoose.Schema({
    ytVideoId: { type: String, required: false },
    type: { type: String, enum: ['mp3', 'mp4', 'youtube'], required: true },
    url: { type: String, required: false },
    title: { type: String, required: true },
    duration: { type: Number, required: false }, // Duration in seconds
    data: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now },
    createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    deviceId:{ type: String, required: false },
});

export default mongoose.model('Transcription', TranscriptionSchema);