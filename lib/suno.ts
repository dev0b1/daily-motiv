import axios from 'axios';

export interface SunoGenerationParams {
  prompt: string;
  title: string;
  style: string;
  tags?: string;
  make_instrumental?: boolean;
  export_video?: boolean;
}

export interface SunoGenerationResult {
  id: string;
  audioUrl: string;
  videoUrl?: string;
  lyrics?: string;
  duration?: number;
  status: string;
  taskId?: string;
  audioId?: string;
}

export class SunoAPI {
  private apiKey: string;
  private baseUrl = 'https://api.sunoapi.org/v1/suno';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateMp4(options: { taskId: string; audioId: string; callBackUrl?: string; author?: string; domainName?: string; }) {
    if (!this.apiKey || this.apiKey === '') {
      throw new Error('Suno API key not configured');
    }

    try {
      const body: any = {
        taskId: options.taskId,
        audioId: options.audioId,
      };
      if (options.callBackUrl) body.callBackUrl = options.callBackUrl;
      if (options.author) body.author = options.author;
      if (options.domainName) body.domainName = options.domainName;

      const url = 'https://api.sunoapi.org/api/v1/mp4/generate';
      const resp = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const mp4TaskId = resp.data?.data?.id || resp.data?.id;
      return { raw: resp.data, mp4TaskId };
    } catch (err: any) {
      console.error('Suno MP4 generation error', err?.response?.data || err?.message || err);
      throw new Error('Failed to request mp4 generation');
    }
  }

  async pollForMp4(mp4TaskId: string, maxAttempts = 60) {
    if (!mp4TaskId) throw new Error('No mp4 task id provided');
    const url = 'https://api.sunoapi.org/api/v1/mp4/get';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(3000);
      try {
        const resp = await axios.get(`${url}?id=${encodeURIComponent(mp4TaskId)}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        });

        const data = resp.data?.data || resp.data;
        const item = Array.isArray(data) ? data[0] : data;
        if (item && (item.status === 'complete' || item.status === 'ready') && (item.video_url || item.mp4_url)) {
          return { videoUrl: item.video_url || item.mp4_url };
        }

        if (item && item.status === 'error') {
          throw new Error('MP4 generation failed');
        }
      } catch (err: any) {
        if (attempt === maxAttempts - 1) throw err;
      }
    }
    throw new Error('MP4 generation timed out');
  }

  async generateSong(params: SunoGenerationParams): Promise<SunoGenerationResult> {
    if (!this.apiKey || this.apiKey === '') {
      throw new Error('Suno API key not configured');
    }

    try {
      console.log('Creating song with Suno AI...');
      
      const createBody: any = {
        custom_mode: true,
        title: params.title,
        tags: params.tags || params.style,
        prompt: params.prompt,
        make_instrumental: params.make_instrumental || false,
        mv: 'chirp-v4',
      };

      // If caller requests video export, pass it through. The Suno API may ignore unknown fields,
      // but some deployments accept `export_video` or similar flags. This makes the wrapper
      // forward the intent without breaking existing behavior.
      if (params.export_video) createBody.export_video = true;

      const createResponse = await axios.post(
        `${this.baseUrl}/create`,
        createBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const taskId = createResponse.data.data?.id || createResponse.data.id;
      
      if (!taskId) {
        throw new Error('No task ID returned from Suno API');
      }

      console.log('Song task created, polling for completion...');
      
      const result = await this.pollForCompletion(taskId);

      // attach the original create task id if available
      if (taskId) result.taskId = taskId;

      return result;
    } catch (error: any) {
      console.error('Suno API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Suno API key. Please check your configuration.');
      }
      
      if (error.response?.status === 402) {
        throw new Error('Insufficient Suno API credits. Please add more credits.');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Suno API rate limit exceeded. Please try again later.');
      }

      throw new Error(
        `Failed to generate music with Suno: ${error.response?.data?.error || error.message}`
      );
    }
  }

  private async pollForCompletion(taskId: string, maxAttempts = 60): Promise<SunoGenerationResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(3000);

      try {
        const response = await axios.get(
          `${this.baseUrl}/get?id=${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );

        const songs = response.data.data || response.data;
        const song = Array.isArray(songs) ? songs[0] : songs;

        if (song && song.status === 'complete' && song.audio_url) {
          console.log('Song generation complete!');
          
          const audioUrl = song.audio_url;
          const videoUrl = song.video_url || audioUrl;
          // try to capture any audio id fields Suno may return
          const audioId = song.audio_id || song.audio?.id || song.audioId || undefined;

          return {
            id: song.id,
            audioUrl: audioUrl,
            videoUrl: videoUrl,
            lyrics: song.lyric || song.prompt,
            duration: song.duration || 60,
            status: 'complete',
            audioId,
          };
        }

        if (song && song.status === 'error') {
          throw new Error('Song generation failed');
        }

        console.log(`Polling attempt ${attempt + 1}/${maxAttempts}...`);
      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Song generation timed out');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createSunoClient(): SunoAPI {
  const apiKey = process.env.SUNO_API_KEY || '';
  return new SunoAPI(apiKey);
}
