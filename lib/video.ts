import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface MakeVideoOpts {
  audioPath: string;
  outPath: string;
  lyricsLines: string[];
  durationSeconds?: number;
}

export function makeLyricVideo(opts: MakeVideoOpts) {
  const { audioPath, outPath, lyricsLines, durationSeconds = 60 } = opts;
  const fontFile = process.env.LYRIC_FONT_PATH || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const w = 1280;
  const h = 720;

  // Create temporary filter graph with drawtext per line
  const lineCount = Math.max(1, lyricsLines.length);
  const perLine = Math.max(2, Math.floor(durationSeconds / Math.max(1, lineCount)));

  // Build drawtext filters
  const drawFilters: string[] = [];
  for (let i = 0; i < lyricsLines.length; i++) {
    const start = i * perLine;
    const end = Math.min(durationSeconds, start + perLine);
    const safeText = lyricsLines[i].replace(/[:\\\"]+/g, '');
    const y = Math.floor(h / 2 - (lyricsLines.length * 30) / 2 + i * 60);
    drawFilters.push(`drawtext=fontfile=${fontFile}:text='${safeText}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=${y}:enable='between(t,${start},${end})'`);
  }

  // showwaves filter (reduced height for speed)
  const waveHeight = 120;
  const filters = [`color=s=${w}x${h}:c=black:d=${durationSeconds}[bg]`, `[0:a]showwaves=s=${w}x${waveHeight}:mode=line:colors=White@0.7[w]`, `[bg][w]overlay=0:${h - waveHeight - 80},${drawFilters.join(',')}`];

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Build ffmpeg command
  const args = [
    '-y',
    '-i', audioPath,
    '-filter_complex', filters.join(','),
    '-map', '0:a',
    // Video codec and performance tuning
    // Use NVENC if explicitly requested via env var `FFMPEG_NVENC=yes`
    ...(process.env.FFMPEG_NVENC === 'yes' ? ['-c:v', 'h264_nvenc', '-preset', 'fast'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28']),
    // Audio codec
    '-c:a', 'aac',
    // Use multiple threads to speed up encoding
    '-threads', String(require('os').cpus().length || 2),
    // Make the file streamable early
    '-movflags', '+faststart',
    // Ensure shortest (stop when audio ends)
    '-shortest',
    // Pixel format for compatibility
    '-pix_fmt', 'yuv420p',
    outPath,
  ];

  // Provide a concise preview for logs (don't print all args)
  console.info('[video] running ffmpeg', { cmd: `ffmpeg ${args.slice(0, 6).join(' ')} ...` });
  const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error('ffmpeg failed to generate video');
  }

  return outPath;
}

export default { makeLyricVideo };
