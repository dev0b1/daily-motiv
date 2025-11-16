import { NextRequest, NextResponse } from 'next/server';
import { uploadPreviewAudio } from '@/lib/file-storage';
import { trimAudioToPreview } from '@/lib/audio-utils';
import { unlink, readFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { templateUrl, templateId } = await request.json();

    if (!templateUrl || !templateId) {
      return NextResponse.json(
        { success: false, error: 'Template URL and ID required' },
        { status: 400 }
      );
    }
    
    const previewFilename = `preview_${templateId}_${Date.now()}.mp3`;
    const tempPreviewPath = path.join('/tmp', previewFilename);

    let audioBuffer: Buffer;
    
    if (templateUrl.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', templateUrl.replace(/^\//, ''));
      audioBuffer = await readFile(localPath);
    } else {
      const audioResponse = await fetch(templateUrl);
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch template audio');
      }
      audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    }
    
    await trimAudioToPreview(audioBuffer, tempPreviewPath, 15, 0);

    const previewBuffer = await import('fs/promises').then(fs => fs.readFile(tempPreviewPath));
    
    const previewUrl = await uploadPreviewAudio(previewBuffer, previewFilename);

    await unlink(tempPreviewPath).catch(() => {});

    if (!previewUrl) {
      throw new Error('Failed to upload preview');
    }

    return NextResponse.json({
      success: true,
      previewUrl
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview'
      },
      { status: 500 }
    );
  }
}
