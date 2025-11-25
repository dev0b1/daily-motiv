import axios from 'axios';

export interface OpenRouterParams {
  extractedText: string;
  style: string;
  musicStyle?: string;
}

export interface OpenRouterResult {
  prompt: string;
  title: string;
  tags: string;
}

export class OpenRouterAPI {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateSongPrompt(params: OpenRouterParams): Promise<OpenRouterResult> {
    if (!this.apiKey || this.apiKey === '') {
      throw new Error('OpenRouter API key not configured');
    }

    const styleDescriptions = {
      petty: 'savage, brutal rap/trap, petty roast, TikTok-viral, Cardi B/Eminem energy, hilarious, zero sadness',
      glowup: 'upbeat pop/EDM, victory anthem, confident, glow-up flex, empowering, celebration',
    };

    const systemPrompt = `You are an AI assistant that creates SAVAGE, TikTok-viral ex-roast song prompts for Suno AI.

Your task is to:
1. Clean up any OCR errors from the user's breakup story
2. Create a petty, hilarious song title (max 50 characters)
3. Generate music genre/style tags for ${params.style} style (max 80 characters)
4. Create a BRUTAL, FUNNY Suno AI prompt that roasts their ex with ZERO sadness

CRITICAL RULES:
- 100% savage and funny. ZERO sadness or healing vibes.
- Make it specific to their story - use exact details they shared
- Style: ${params.style === 'petty' ? 'rap/trap with Cardi B/Eminem energy' : 'upbeat pop/EDM victory energy'}
- Vocals: confident ${params.style === 'petty' ? 'female or male with attitude' : 'celebratory and upbeat'}
- Length: 35 seconds max
- End with spoken line: "Your ex just got roasted at ExRoast.fm — link in bio"
- Make it laugh-out-loud funny and TikTok-viral worthy

Style requested: ${params.style} (${styleDescriptions[params.style as keyof typeof styleDescriptions] || 'savage'})
${params.musicStyle ? `Music backing requested: ${params.musicStyle} (use instrumentation, tempo, and genre-appropriate elements)` : ''}

Return your response in this exact JSON format:
{
  "title": "Petty Song Title Here",
  "tags": "genre, style, mood, tempo",
  "prompt": "Create a brutal, hilarious, TikTok-viral 35-second ex-roast song. [INSERT USER STORY DETAILS]. Make it petty, specific, and laugh-out-loud. End with: 'Your ex just got roasted at ExRoast.fm — link in bio'"
}`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Create a savage ExRoast.fm ${params.style} roast song from this breakup story:\n\n${params.extractedText}${params.musicStyle ? `\n\nMusic backing notes: ${params.musicStyle} — use appropriate instrumentation and tempo.` : ''}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://exroast.fm',
            'X-Title': 'ExRoast.fm',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse OpenRouter response as JSON:', content);
        throw new Error('Invalid response format from AI model');
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI returned invalid data structure');
      }

      const defaultTags = styleDescriptions[params.style as keyof typeof styleDescriptions] || 'savage';
      
      return {
        prompt: parsed.prompt || parsed.lyrics || parsed.lyric || '',
        title: parsed.title || `${params.style === 'petty' ? 'Petty' : 'Glow-Up'} Roast`,
        tags: parsed.tags || parsed.genre || defaultTags,
      };
    } catch (error: any) {
      console.error('OpenRouter API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid OpenRouter API key. Please check your configuration.');
      }
      
      if (error.response?.status === 402) {
        throw new Error('Insufficient OpenRouter credits. Please add more credits.');
      }

      throw new Error(
        `Failed to generate prompt with OpenRouter: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }
}

export function createOpenRouterClient(): OpenRouterAPI {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  return new OpenRouterAPI(apiKey);
}
