import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import express from "express";
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import transcriptionRoutes from './routes/transcriptionRoutes.js';
import uploadFileToCloudRoutes from './routes/uploadFileToCloudRoutes.js';
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: '674d42163f3a448ea246cc6b877a4eac',
});

const app = express();
app.use(cors());
app.use(express.json());

app.use('/users', userRoutes);
app.use('/upload', uploadRoutes);
app.use('/transcriptions', transcriptionRoutes);
app.use('/upload-file-cloud', uploadFileToCloudRoutes);
app.get('/test',async (req,res)=>{
  const data = {
    language_code:'ko',
    audio: 'https://res.cloudinary.com/dueyjeqd5/video/upload/v1742093511/5A_SB_3%EB%8B%A8%EC%9B%90_%EB%93%A3%EA%B8%B0_1_oUqpEv87GlQ_vpgfc1.mp3'
  }
  
    const transcript = await client.transcripts.transcribe(data);
    const { sentences } = await client.transcripts.sentences(transcript.id)
    const { paragraphs } = await client.transcripts.paragraphs(transcript.id)
    // console.log(transcript.text);
  res.json({sentences,paragraphs, transcript})
})

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