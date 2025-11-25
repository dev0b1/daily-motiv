import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { songs } from '@/src/db/schema';
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

    const [song] = await db.insert(songs).values({
      title: `${style.charAt(0).toUpperCase() + style.slice(1)} Roast`,
      lyrics: templateLyrics,
      previewUrl: selectedTemplate.storageUrl,
      fullUrl: '',
      style,
      story: story.substring(0, 500),
      genre: musicStyle || null,
      // Template preview length — show 20s demo
      duration: 20,
      isPurchased: false,
      isTemplate: true
    }).returning();

    try {
      await saveRoast({
        story: story.substring(0, 500),
        mode: style,
        title: song.title,
        lyrics: templateLyrics,
        audioUrl: selectedTemplate.storageUrl,
        isTemplate: true
      });
    } catch (saveError) {
      console.log('Failed to save roast (non-critical):', saveError);
    }

    return NextResponse.json({
      success: true,
      songId: song.id,
      title: song.title,
      // Return the mp3 preview URL directly for free users (will be replaced with video later)
      previewUrl: selectedTemplate.storageUrl,
      message: 'Template preview generated! Upgrade to Pro for personalized roasts.',
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
