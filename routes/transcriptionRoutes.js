import express from 'express';
import OpenAI from 'openai';
import { deleteFile, extractYouTubeId, getMP3Info, getTranscript } from '../helper.js';
import Transcription from '../models/Transcription.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Tạo mới một transcription hoặc trả về bản ghi nếu ytVideoId đã tồn tại
router.post('/', async (req, res) => {
    let filePath, title, duration;
    try {
        // url la url audio/video cloud
        const { type, createBy, title: inputTitle, isPublic, duration: duration1, url, deviceId } = req.body;

        // neu la audio/mp3 thi luu luon
        if (type === 'mp3'|| type ==="mp4") {
            let data = await getTranscript(url)
            const newAudioTranscription = new Transcription({type, title: inputTitle, duration: duration1, data, createBy, isPublic,url, deviceId });
            await newAudioTranscription.save();
            return res.status(201).json(newAudioTranscription);
        }

        if (!type || !url) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let ytVideoId = null;

        if (type === 'youtube') {
            ytVideoId = extractYouTubeId(url);
            if (!ytVideoId) {
                return res.status(400).json({ error: 'Invalid YouTube URL' });
            }
            const youtubeMP3Info = await getMP3Info(url);
            if (youtubeMP3Info) {
                filePath = youtubeMP3Info.filePath;
                title = inputTitle || youtubeMP3Info.title;
                duration = youtubeMP3Info.duration;
            } else {
                return res.status(400).json({ error: 'Không thể tải file âm thanh từ YouTube.' });
            }
            const newTranscription = new Transcription({ ytVideoId, type, title, duration, data: youtubeMP3Info.data, createBy, isPublic,url, deviceId });
            await newTranscription.save();
            res.status(201).json(newTranscription);
        } 
        
        // else {
        //     filePath = await downloadFileFromUrl(mp3Url);
        //     if (!filePath) {
        //         return res.status(400).json({ error: 'Không thể tải file âm thanh từ URL trực tiếp.' });
        //     }
        //     title = inputTitle || 'Unknown Title';
        // }

        // console.log('Processing transcription with OpenAI Whisper...');
        // const transcription = await openai.audio.transcriptions.create({
        //     file: fs.createReadStream(filePath),
        //     model: 'whisper-1',
        //     response_format: 'verbose_json',
        //     timestamp_granularities: ['segment', 'word'],
        // });

        // const filteredData = {
        //     segments: transcription.segments.map(segment => ({
        //         start: segment.start,
        //         end: segment.end,
        //         text: segment.text,
        //     })),
        //     words: transcription.words.map(word => ({
        //         word: word.word,
        //         start: word.start,
        //         end: word.end,
        //     }))
        // };

       
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    } finally {
        if (filePath) {
            deleteFile(filePath);
        }
    }
});

// Lấy danh sách tất cả transcriptions
router.get('/', async (req, res) => {
    try {
        const { deviceId, page = 1 } = req.query; // Lấy deviceId và page từ query parameters
        const limit = 8; // Số bản ghi mỗi trang

        // Kiểm tra xem deviceId có tồn tại hay không
        if (!deviceId) {
            return res.status(400).json({ error: 'Device ID is required' });
        }

        // Tính toán số bản ghi cần bỏ qua (skip) dựa trên trang
        const skip = (parseInt(page) - 1) * limit;

        // Truy vấn Transcription với điều kiện
        const transcriptions = await Transcription.find({ deviceId: deviceId })
            .sort({ createdAt: -1 }) // Sắp xếp theo thứ tự mới nhất → cũ nhất
            .skip(skip) // Bỏ qua các bản ghi của trang trước
            .limit(limit) // Giới hạn số bản ghi
            .select('-data'); // Loại bỏ trường data

        // Nếu không có transcription nào, trả về 404
        if (transcriptions.length === 0) {
            return res.status(404).json({ error: 'No transcriptions found for this device' });
        }

        // Trả về kết quả kèm thông tin phân trang
        res.json( transcriptions);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Lấy transcription theo ID
router.get('/:id', async (req, res) => {
    try {
        const transcription = await Transcription.findById(req.params.id);
        if (!transcription) {
            return res.status(404).json({ error: 'Transcription not found' });
        }
        res.json(transcription);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Cập nhật transcription
router.put('/:id', async (req, res) => {
    try {
        const updatedTranscription = await Transcription.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTranscription) {
            return res.status(404).json({ error: 'Transcription not found' });
        }
        res.json(updatedTranscription);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Xóa transcription
router.delete('/:id', async (req, res) => {
    try {
        const deletedTranscription = await Transcription.findByIdAndDelete(req.params.id);
        if (!deletedTranscription) {
            return res.status(404).json({ error: 'Transcription not found' });
        }
        res.json({ message: 'Transcription deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

export default router;
