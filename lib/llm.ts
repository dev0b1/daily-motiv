// This module uses the global `fetch` available in Node 18+/Next.js runtime.
export async function generateLyricsFromLLM(story: string, style: string, mood: string, lines = 10) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  const prompt = `Write a short, punchy breakup roast song from this story:\n\n"${story}"\n\nStyle: ${style}\nMood: ${mood}\nLength: ${lines} lines\nFormat:\n[Intro]\n[Verse]\n[Chorus]\n[Verse]\n[Outro]\n\nReturn plain lyrics only.`;

  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes short song lyrics.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });
    const j = await res.json();
    const txt = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || '';
    return txt.trim();
  }

  if (openrouterKey) {
    // Generic OpenRouter-ish call — user should supply OPENROUTER_API_KEY and URL in env if needed
    const openrouterUrl = process.env.OPENROUTER_URL || 'https://api.openrouter.ai/v1/chat/completions';
    const res = await fetch(openrouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes short song lyrics.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });
    const j = await res.json();
    const txt = j?.choices?.[0]?.message?.content || j?.result || '';
    return txt.trim();
  }

  throw new Error('No LLM provider configured (set OPENAI_API_KEY or OPENROUTER_API_KEY)');
}

export function splitLyricsIntoLines(lyrics: string) {
  // naive split into non-empty lines
  const lines = lyrics.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // if lines too long, try splitting by sentences
  if (lines.length === 0) return [lyrics.slice(0, 200)];
  return lines;
}

export default { generateLyricsFromLLM, splitLyricsIntoLines };
