import fs from 'fs';

export interface ElevenResult {
  audioUrl?: string;
  audioBuffer?: Buffer;
}

export async function generateMusicWithEleven(lyrics: string, genre: string, mood: string, durationSeconds = 60): Promise<ElevenResult> {
  const apiKey = process.env.ELEVEN_API_KEY;
  const endpoint = process.env.ELEVEN_MUSIC_URL || 'https://api.elevenlabs.io/v1/generate';
  if (!apiKey) throw new Error('ELEVEN_API_KEY not set');

  const body = {
    lyrics,
    genre: genre || 'pop',
    mood: mood || 'moody',
    duration_seconds: durationSeconds,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs error: ${res.status} ${text}`);
  }

  // Try parse JSON response
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const j = await res.json();
    // prefer an audio URL if provided
    if (j?.audio_url) return { audioUrl: j.audio_url };
    if (j?.result?.audio_url) return { audioUrl: j.result.audio_url };
    // some APIs return base64 audio directly
    if (j?.audio_base64) {
      const buf = Buffer.from(j.audio_base64, 'base64');
      return { audioBuffer: buf };
    }
    // fallback: if raw data present
    return { audioBuffer: Buffer.from(JSON.stringify(j)) };
  }

  // If response is binary audio, buffer it
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { audioBuffer: buffer };
}

export async function downloadToFile(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  await fs.promises.mkdir(require('path').dirname(outPath), { recursive: true });
  await fs.promises.writeFile(outPath, Buffer.from(arrayBuffer));
  return outPath;
}

export default { generateMusicWithEleven, downloadToFile };
