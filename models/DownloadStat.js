// models/DownloadStat.js
import mongoose from "mongoose";

const downloadStatSchema = new mongoose.Schema({
  examFileId: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

downloadStatSchema.index({ examFileId: 1 }, { unique: true });

export default mongoose.models.DownloadStat || mongoose.model('DownloadStat', downloadStatSchema); 