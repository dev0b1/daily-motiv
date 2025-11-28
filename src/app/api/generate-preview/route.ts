import { NextRequest, NextResponse } from 'next/server';
import { getAllTemplates, saveRoast } from '@/lib/db-service';
import { matchTemplate } from '@/lib/template-matcher';
import { LYRICS_DATA } from '@/lib/lyrics-data';

export async function POST(request: NextRequest) {
  try {
    const { story, style, musicStyle } = await request.json();

    if (!story || story.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Story is too short (min 10 characters)' },
        { status: 400 }
      );
    }

    console.log('Free user - generating template-based preview');

    const templates = await getAllTemplates();
    
    if (templates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Template system not set up yet. Please upgrade to Pro for AI-generated songs.'
      }, { status: 503 });
    }

    const match = matchTemplate(story, style, templates);
    const selectedTemplate = match ? match.template : templates[0];

    console.log('Selected template:', selectedTemplate.filename, 'Score:', match?.score || 0);

    // Get lyrics for the selected template
    const templateId = selectedTemplate.filename.replace('.mp3', '');
    const templateLyrics = LYRICS_DATA[templateId] || '';

    // Persist a lightweight history entry for the preview (so guests can see recentHistory)
    const title = `${style.charAt(0).toUpperCase() + style.slice(1)} Track`;
    let savedId: string | null = null;
    try {
      savedId = await saveRoast({
        story: story.substring(0, 500),
        mode: style,
        title,
        lyrics: templateLyrics,
        audioUrl: selectedTemplate.storageUrl,
        isTemplate: true
      });
    } catch (saveError) {
      console.log('Failed to save history (non-critical):', saveError);
    }

    return NextResponse.json({
      success: true,
      songId: savedId || null,
      title,
      // Return the mp3 preview URL directly for free users (will be replaced with video later)
      previewUrl: selectedTemplate.storageUrl,
      message: 'Template preview generated! Upgrade to Pro for personalized tracks.',
      isTemplate: true,
      matchScore: match?.score || 0
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
