import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import axios from "axios";
// import os from 'os';
const OUTPUT_DIR = '/tmp';

// ✅ Hàm trích xuất videoId từ URL YouTube
function extractVideoId(videoUrl) {
  try {
    const urlObj = new URL(videoUrl);
    let videoId = urlObj.searchParams.get("v");
    if (!videoId) {
      // Xử lý cho link dạng rút gọn (youtu.be)
      videoId = urlObj.pathname.split("/").pop();
    }
    return videoId;
  } catch (error) {
    console.error("❌ Lỗi khi trích xuất videoId:", error);
    return null;
  }
}

// ✅ Hàm tải audio (MP3) từ YouTube qua RapidAPI
async function downloadAudio(videoUrl) {
  try {
    console.log("📥 Đang lấy thông tin video từ YouTube qua RapidAPI...");

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error("Không thể trích xuất videoId từ URL.");
    }

    const rapidApiOptions = {
      method: "GET",
      url: "https://youtube-mp36.p.rapidapi.com/dl",
      params: { id: videoId },
      headers: {
        "x-rapidapi-key": "f5e1f04522msh10562b05d31776bp16145djsnf23c78ea2636", // Thay thế bằng RapidAPI key của bạn
        "x-rapidapi-host": "youtube-mp36.p.rapidapi.com"
      }
    };

    let response;
    response = await axios.request(rapidApiOptions);
    console.log("response.data====")
    console.log(response.data)
    while (response.data.status === 'processing') {
      console.log("===================")
      response = await axios.request(rapidApiOptions);

    }

    // console.log({response})
    if (response.data.status !== "ok") {
      console.error("❌ Lỗi API RapidAPI:", response.data.msg);
      return null;
    }

    console.log("✅ Metadata video:", response.data.title);

    // Lấy link tải file MP3 từ phản hồi của API
    const downloadLink = response.data.link;
    // const filePath = path.join(OUTPUT_DIR, `temp_audio_${Date.now()}.mp3`);

    // console.log("📥 Đang tải file MP3 từ link:", downloadLink);
    // const fileResponse = await axios.get(downloadLink);
    // const writer = fs.createWriteStream(filePath, { highWaterMark: 1024 * 1024 * 8 });
    // await pipeline(fileResponse.data, writer);

    // console.log("✅ File đã tải về:", filePath);
    const filePath = await downloadFileFromUrl(downloadLink)
    // console.log(response.data)

    const trans = await getTranscript(filePath)
    return { videoId, title: response.data.title, duration: response.data.duration, data: trans };
  } catch (error) {
    console.error("❌ Lỗi khi tải audio từ YouTube:", error);
    return null;
  }
}

export async function getYoutubeVideoInfo(videoUrl) {
  try {
    console.log("📥 Đang lấy thông tin video từ YouTube qua RapidAPI...");

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error("Không thể trích xuất videoId từ URL.");
    }

    const rapidApiOptions = {
      method: "GET",
      url: "https://youtube-mp36.p.rapidapi.com/dl",
      params: { id: videoId },
      headers: {
        "x-rapidapi-key": "f5e1f04522msh10562b05d31776bp16145djsnf23c78ea2636", // Thay thế bằng RapidAPI key của bạn
        "x-rapidapi-host": "youtube-mp36.p.rapidapi.com"
      }
    };

    let response;
    response = await axios.request(rapidApiOptions);
    console.log("response.data====")
    console.log(response.data)
    return response.data
  } catch (error) {
    console.error("❌ Lỗi khi lấy thông tin từ YouTube:", error);
    return null;
  }
}

// ✅ Hàm chính để lấy thông tin MP3 từ YouTube sử dụng RapidAPI
export async function getMP3Info(videoUrl) {
  try {
    console.log("📌 Bắt đầu xử lý video...");
    const audioData = await downloadAudio(videoUrl);
    if (!audioData) throw new Error("Không thể tải audio từ video!");
    console.log("✅ Xử lý hoàn thành!");
    return audioData;
  } catch (error) {
    console.error("❌ Lỗi trong quá trình xử lý:", error);
    return null;
  }
}

// ✅ Hàm tải file từ URL (dành cho file MP3 tải từ YouTube)
export async function downloadFileFromUrl(url) {
  try {
    console.log("📥 Đang tải file từ URL:", url);

    const filePath = `${OUTPUT_DIR}/temp_audio_${Date.now()}.mp3`;

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream", // Dùng stream để tải file
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", // Giả lập trình duyệt
        "Accept": "*/*", // Cho phép tải mọi loại dữ liệu
      },
      maxRedirects: 5, // Cho phép Axios theo dõi tối đa 5 lần chuyển hướng
    });

    if (response.status !== 200) {
      throw new Error(`Lỗi tải file: Server phản hồi ${response.status} ${response.statusText}`);
    }

    console.log("📤 Đang ghi file...");
    const writer = fs.createWriteStream(filePath, { highWaterMark: 1024 * 1024 * 16 });
    await pipeline(response.data, writer);

    console.log("✅ File đã tải về:", filePath);
    return filePath;
  } catch (error) {
    console.error("❌ Lỗi khi tải file từ URL:", error.response ? error.response.data : error.message);
    return null;
  }
}

// ✅ Hàm xóa file sau khi xử lý
export function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("🗑 Đã xóa file:", filePath);
  } else {
    console.log("⚠️ File không tồn tại:", filePath);
  }
}

// Hàm tách ytVideoId từ URL YouTube
export const extractYouTubeId = (url) => {
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*vi\/|.*embed\/))([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};


import FormData from 'form-data';

export const sendAudioToDeepgram = async (filePath) => {
  try {
    const formData = new FormData();
    // formData.append('file', fs.createReadStream(filePath));
    const audioStream = fs.createReadStream(filePath);
    const response = await axios.post(
      'https://api.deepgram.com/v1/listen?smart_format=true&paragraphs=true&utterances=true&utt_split=0.9&language=ko&model=whisper',
      audioStream,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Token 9155204600563f32b848f52356912546ec8dfb41',
        },
      }
    );

    // const newSentences = response.data.results.channels[0].alternatives[0].paragraphs.paragraphs.reduce((acc, current) => {
    //   return acc.concat(current.sentences);
    // }, []);
    const newSentences = response.data.results.utterances;

    // const newWords = response.data.results.channels[0].alternatives[0].words;
    // const sentencesWithWords = newSentences.map((sentence) => {
    //   const sentenceWords = newWords.filter((word) => word.start >= sentence.start && word.end <= sentence.end);
    //   return {
    //     sentence: sentence.text,
    //     start: sentence.start,
    //     end: sentence.end,
    //     words: sentenceWords,
    //   };
    // });

    // return sentencesWithWords;
    return newSentences;
  } catch (error) {
    console.error('Error sending audio to Deepgram: ', error.response ? error.response.data : error.message);
    return []
  }
};

// GEMINI API
import { GoogleGenerativeAI } from "@google/generative-ai";

// Khởi tạo Gemini API
const genAI = new GoogleGenerativeAI("AIzaSyAD-DPPuCS-rdQjR-qqmrlh6jwF5c7An0Y"); // Thay bằng API key của bạn
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Hàm làm sạch phản hồi từ Gemini
const cleanResponse = (text) => {
  return text.replace(/```json\n|```|\n/g, "").trim();
};

// Hàm tách câu dài thành các câu ngắn hơn dựa trên mảng words
export const splitLongSentences = async (sentences, maxWords = 20) => {
  const result = [];

  for (const sentence of sentences) {
    const wordCount = sentence.words.length;

    // Nếu câu ngắn hơn ngưỡng, giữ nguyên
    if (wordCount <= maxWords) {
      result.push(sentence);
      continue;
    }

    // Nếu câu quá dài, gửi tới Gemini để tìm điểm tách
    const wordList = sentence.words.map((word) => word.text).join(" ");
    const prompt = `
      You are a text processing assistant. Given a sentence, suggest how to split it into shorter sentences, each with no more than ${maxWords} words, using only the original words in the exact order, without adding or modifying any words. Return the result as a JSON array of arrays, where each inner array contains the indices of words (from the original word list) that form a shorter sentence. Ensure the split sentences are semantically coherent.

      Sentence: "${wordList}"
      Word list: ${JSON.stringify(sentence.words.map((word) => word.text))}

      Example input: "The quick brown fox jumps over the lazy dog and runs to the forest to hunt for food."
      Example word list: ["The", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "and", "runs", "to", "the", "forest", "to", "hunt", "for", "food"]
      Example output: [[0, 9], [10, 14], [15, 17]]

      Return only the JSON array of index ranges.
    `;

    try {
      const geminiResult = await model.generateContent(prompt);
      const responseText = cleanResponse(await geminiResult.response.text());
      const splitIndices = JSON.parse(responseText); // Mảng các [startIndex, endIndex]

      // Tạo các câu mới từ indices
      const newSentences = splitIndices.map(([startIndex, endIndex]) => {
        const newWords = sentence.words.slice(startIndex, endIndex + 1);
        const newText = newWords.map((word) => word.text).join(" ");
        const start = newWords[0].start;
        const end = newWords[newWords.length - 1].end;
        const confidence = newWords.reduce((sum, word) => sum + word.confidence, 0) / newWords.length;

        return {
          text: newText,
          start: Math.round(start),
          end: Math.round(end),
          confidence: Number(confidence.toFixed(2)),
          words: newWords,
        };
      });

      result.push(...newSentences);
    } catch (error) {
      console.error("Error splitting sentence:", sentence.text, error);
      result.push(sentence); // Nếu lỗi, giữ nguyên câu
    }
  }

  return result;
};



// AssemblyAI API

import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: '674d42163f3a448ea246cc6b877a4eac',
});

export const getTranscript = async (audio) => {
  const data = {
    language_detection: true,
    audio: audio,
  }

  const transcript = await client.transcripts.transcribe(data);
  const { sentences } = await client.transcripts.sentences(transcript.id)

  const dataRes = await splitLongSentences(sentences, 16);
  // Trả về định dạng tương thích với Flutter
  return dataRes;
};