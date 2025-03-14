import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import express from "express";
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import uploadFileToCloudRoutes from './routes/uploadFileToCloudRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/users', userRoutes);
app.use('/upload', uploadRoutes);
app.use('/transcriptions', transcriptionRoutes);
app.use('/upload-file-cloud', uploadFileToCloudRoutes);

const URI = process.env.MONGODB_URL;
const connectDB = async () => {
  try {
      await mongoose.connect(URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
      });
      console.log('MongoDB connected successfully');
  } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
  }
};

connectDB();

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});