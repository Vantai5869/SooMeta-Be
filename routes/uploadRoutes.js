import express from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import { deleteFile, downloadFileFromUrl, getMP3Info } from "../helper.js";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
    let filePath;
    let type;
    try {
        const { mp3Url } = req.body;
        type = req.body.type || 'youtube';

        if (!mp3Url) return res.status(400).json({ error: 'Missing audio URL' });

        if (type === 'youtube') {
            const youtubeMP3Info = await getMP3Info(mp3Url);
            if (youtubeMP3Info) {
                filePath = youtubeMP3Info.filePath;
            } else {
                return res.status(400).json({ error: 'Không thể tải file âm thanh từ YouTube.' });
            }
        } else {
            filePath = await downloadFileFromUrl(mp3Url);
            if (!filePath) {
                return res.status(400).json({ error: 'Không thể tải file âm thanh từ URL trực tiếp.' });
            }
        }

        console.log('Sending to OpenAI Whisper...');
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment', 'word'],
        });

        const filteredSegments = transcription.segments.map(segment => ({
            start: segment.start,
            end: segment.end,
            text: segment.text,
        }));

        const filteredWords = transcription.words.map(word => ({
            word: word.word,
            start: word.start,
            end: word.end,
        }));

        res.json({ segments: filteredSegments, words: filteredWords });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        if (filePath) {
            deleteFile(filePath);
        }
    }
});

export default router;