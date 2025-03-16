import { AssemblyAI, TranscriptSentence} from 'assemblyai';

const client = new AssemblyAI({
    apiKey: '674d42163f3a448ea246cc6b877a4eac',
});

export const getTranscript = async (audio, language_code='ko') => {
    // audio la link online/ link off
    const data = {
        language_code: language_code,
        audio: audio
    }

    const transcript = await client.transcripts.transcribe(data);
    const { sentences } = await client.transcripts.sentences(transcript.id)
    // const { paragraphs } = await client.transcripts.paragraphs(transcript.id)
    return sentences;
}