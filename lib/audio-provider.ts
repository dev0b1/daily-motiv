export interface AudioProvider {
  generateSong(params: {
    story: string;
    style: string;
  }): Promise<{ previewUrl: string; fullUrl: string }>;
}

class PlaceholderAudioProvider implements AudioProvider {
  async generateSong(params: { story: string; style: string }): Promise<{ previewUrl: string; fullUrl: string }> {
    return {
      previewUrl: '/audio/sample-preview.mp3',
      fullUrl: '/audio/sample-preview.mp3',
    };
  }
}

class ElevenLabsAudioProvider implements AudioProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateSong(params: { story: string; style: string }): Promise<{ previewUrl: string; fullUrl: string }> {
    throw new Error('ElevenLabs integration not yet implemented. Add your API key and implementation here.');
  }
}

export function getAudioProvider(): AudioProvider {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (apiKey && apiKey !== '') {
    return new ElevenLabsAudioProvider(apiKey);
  }
  
  return new PlaceholderAudioProvider();
}
