import axios from 'axios';

export interface SunoGenerationParams {
  prompt: string;
  title?: string;
  style?: string;
  tags?: string;
  make_instrumental?: boolean;
  export_video?: boolean;
  callBackUrl?: string;
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
  imageUrl?: string;
  title?: string;
}

export class SunoAPI {
  private apiKey: string;
  private baseUrl = 'https://api.sunoapi.org/api/v1';

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

      const url = `${this.baseUrl}/mp4/generate`;
      const start = Date.now();
      console.info('[suno] request mp4 generate', { taskId: options.taskId, audioId: options.audioId, hasCallback: !!options.callBackUrl });
      const resp = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      const duration = Date.now() - start;
      const mp4TaskId = resp.data?.data?.id || resp.data?.id;
      console.info('[suno] mp4 generate response', { mp4TaskId, status: resp.status, durationMs: duration });
      return { raw: resp.data, mp4TaskId };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      console.error('[suno] MP4 generation error', err?.response?.data || msg);
      throw new Error(`Failed to request mp4 generation: ${msg}`);
    }
  }

  async pollForMp4(mp4TaskId: string, maxAttempts = 60) {
    if (!mp4TaskId) throw new Error('No mp4 task id provided');
    const url = `${this.baseUrl}/mp4/get`;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(3000);
      try {
        console.debug('[suno] poll mp4 attempt', { mp4TaskId, attempt: attempt + 1 });
        const resp = await axios.get(`${url}?id=${encodeURIComponent(mp4TaskId)}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        });

        const data = resp.data?.data || resp.data;
        const item = Array.isArray(data) ? data[0] : data;
        const status = item?.status;
        console.debug('[suno] poll mp4 response', { mp4TaskId, attempt: attempt + 1, status });
        if (item && (item.status === 'complete' || item.status === 'ready')) {
          const videoUrl = item.video_url || item.mp4_url || item.videoUrl;
          if (videoUrl) {
            console.info('[suno] mp4 ready', { mp4TaskId, videoUrl });
            return { videoUrl };
          }
        }

        if (item && item.status === 'error') {
          console.error('[suno] mp4 error status', { mp4TaskId, item });
          throw new Error('MP4 generation failed');
        }
      } catch (err: any) {
        const msg = err?.message || 'Unknown error';
        console.warn('[suno] poll mp4 attempt error', { mp4TaskId, attempt: attempt + 1, message: msg });
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
      console.info('[suno] create song request', { title: params.title, style: params.style, hasCallback: !!params.callBackUrl });

      const createBody: any = {
        gpt_description_prompt: params.prompt,
        mv: 'chirp-v3-5',
        make_instrumental: params.make_instrumental || false,
      };

      if (params.title) createBody.title = params.title;
      if (params.tags || params.style) createBody.tags = params.tags || params.style;
      if (params.callBackUrl) createBody.callBackUrl = params.callBackUrl;

      const start = Date.now();
      const createResponse = await axios.post(`${this.baseUrl}/music/generate`, createBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - start;
      const responseData = createResponse.data.data || createResponse.data;

      console.info('[suno] create response', { status: createResponse.status, durationMs: duration, songsCount: Array.isArray(responseData) ? responseData.length : 1 });

      if (!responseData) {
        console.error('[suno] create returned no data', { body: createResponse.data });
        throw new Error('No data returned from Suno API');
      }

      const songs = Array.isArray(responseData) ? responseData : [responseData];
      const songIds = songs.map((s: any) => s.id).filter(Boolean);

      // If callback requested, return immediately with pending status (worker or callback handler can map and update later)
      if (params.callBackUrl) {
        const first = songs[0];
        return {
          id: first.id,
          audioUrl: '',
          status: 'pending',
          taskId: first.id,
          title: first.title || params.title,
          audioId: first.id,
        };
      }

      // Otherwise poll for completion (backwards-compatible single-result response)
      const results = await this.pollForCompletion(songIds);
      // return first result for compatibility with worker
      return results[0];
    } catch (error: any) {
      console.error('[suno] API Error:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        throw new Error('Invalid Suno API key. Please check your configuration.');
      }

      if (error.response?.status === 402) {
        throw new Error('Insufficient Suno API credits. Please add more credits.');
      }

      if (error.response?.status === 429) {
        throw new Error('Suno API rate limit exceeded. Please try again later.');
      }

      throw new Error(`Failed to generate music with Suno: ${error.response?.data?.error || error.message}`);
    }
  }

  private async pollForCompletion(songIds: string[], maxAttempts = 60): Promise<SunoGenerationResult[]> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(3000);

      try {
        console.debug('[suno] poll music attempt', { songIds, attempt: attempt + 1 });

        const response = await axios.post(`${this.baseUrl}/music/query`, { ids: songIds }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const responseData = response.data.data || response.data;
        const songs = Array.isArray(responseData) ? responseData : [responseData];

        console.debug('[suno] poll music response', { songIds, attempt: attempt + 1, statuses: songs.map((s: any) => s?.status) });

        const allComplete = songs.every((song: any) => song && (song.status === 'complete' || song.status === 'ready') && (song.audio_url || song.video_url));

        if (allComplete) {
          console.info('[suno] all songs generation complete', { songIds, count: songs.length });
          return songs.map((song: any) => ({
            id: song.id,
            audioUrl: song.audio_url,
            videoUrl: song.video_url,
            imageUrl: song.image_url || song.image_large_url,
            lyrics: song.lyric || song.prompt,
            duration: song.duration || 0,
            status: 'complete',
            title: song.title,
            audioId: song.id,
          }));
        }

        const hasError = songs.some((song: any) => song && song.status === 'error');
        if (hasError) {
          const errorSongs = songs.filter((s: any) => s.status === 'error');
          console.error('[suno] song generation error status', { errorSongs });
          throw new Error('Song generation failed');
        }

        console.debug(`Polling attempt ${attempt + 1}/${maxAttempts}...`);
      } catch (error: any) {
        const errMsg = error?.message || 'Unknown error';
        console.warn('[suno] poll attempt caught error', { songIds, attempt: attempt + 1, message: errMsg });
        if (attempt === maxAttempts - 1) {
          console.error('[suno] poll max attempts reached, failing', { songIds });
          throw error;
        }
      }
    }

    throw new Error('Song generation timed out');
  }

  async querySongs(songIds: string[]): Promise<SunoGenerationResult[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/music/query`, { ids: songIds }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = response.data.data || response.data;
      const songs = Array.isArray(responseData) ? responseData : [responseData];

      return songs.map((song: any) => ({
        id: song.id,
        audioUrl: song.audio_url || '',
        videoUrl: song.video_url,
        imageUrl: song.image_url || song.image_large_url,
        lyrics: song.lyric || song.prompt,
        duration: song.duration || 0,
        status: song.status || 'unknown',
        title: song.title,
        audioId: song.id,
      }));
    } catch (error: any) {
      console.error('[suno] Query error:', error.response?.data || error.message);
      throw new Error(`Failed to query songs: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createSunoClient(): SunoAPI {
  const apiKey = process.env.SUNO_API_KEY || '';
  if (!apiKey) {
    console.warn('[suno] No API key found in environment');
  }
  return new SunoAPI(apiKey);
}
