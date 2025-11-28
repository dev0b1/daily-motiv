import { getFallbackMotivation } from './daily-motivations';
import { generateMusicWithEleven } from './eleven';
import { uploadPreviewAudio } from './file-storage';

export interface NudgeGenerationParams {
  userStory: string;
  dayNumber?: number;
  mood?: string;
  motivationText?: string;
}

export interface NudgeGenerationResult {
  id: string;
  audioUrl: string;
  motivationText: string;
  duration: number;
}

export class ElevenNudgeAPI {
  async generateDailyNudge(params: { userStory: string; mood: string; motivationText?: string; dayNumber?: number; userName?: string; }): Promise<NudgeGenerationResult> {
    const dayNumber = params.dayNumber || 1;
    const motivationText = params.motivationText || getFallbackMotivation(dayNumber);

    try {
      // Use ElevenLabs music generation as a short TTS/voiceover generator
      const res = await generateMusicWithEleven(motivationText, 'voiceover', params.mood || 'confidence', 15);

      if (res.audioUrl) {
        return {
          id: crypto.randomUUID(),
          audioUrl: res.audioUrl,
          motivationText,
          duration: 15,
        };
      }

      if (res.audioBuffer) {
        // Persist buffer to public previews and return a public URL
        const filename = `${crypto.randomUUID()}.mp3`;
        const publicPath = await uploadPreviewAudio(res.audioBuffer, filename);
        return {
          id: crypto.randomUUID(),
          audioUrl: publicPath || '/audio/placeholder-preview.mp3',
          motivationText,
          duration: 15,
        };
      }

      // fallback
      return {
        id: crypto.randomUUID(),
        audioUrl: '/audio/placeholder-preview.mp3',
        motivationText,
        duration: 15,
      };
    } catch (err) {
      console.warn('ElevenNudgeAPI.generateDailyNudge failed, falling back to text-only', err);
      return {
        id: crypto.randomUUID(),
        audioUrl: '/audio/placeholder-preview.mp3',
        motivationText,
        duration: 15,
      };
    }
  }
}

export function createSunoNudgeClient(): ElevenNudgeAPI {
  // Keep function name for compatibility; returns Eleven-backed client
  return new ElevenNudgeAPI();
}

export function getDailySavageQuote(dayNumber: number = 1): string {
  try {
    return getFallbackMotivation(dayNumber);
  } catch (e) {
    return "You're the plot twist they didn't see coming.";
  }
}
