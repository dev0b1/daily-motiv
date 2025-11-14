import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAudioProvider } from "@/lib/audio-provider";

interface GenerateSongRequest {
  story: string;
  style: "sad" | "savage" | "healing";
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSongRequest = await request.json();
    const { story, style } = body;

    if (!story || story.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Story is too short" },
        { status: 400 }
      );
    }

    const audioProvider = getAudioProvider();
    const { previewUrl, fullUrl } = await audioProvider.generateSong({ story, style });

    const song = await prisma.song.create({
      data: {
        title: generateSongTitle(story, style),
        story,
        style,
        previewUrl,
        fullUrl,
        isPurchased: false,
      },
    });

    return NextResponse.json({
      success: true,
      songId: song.id,
      message: "Song generated successfully",
    });
  } catch (error) {
    console.error("Error generating song:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate song" },
      { status: 500 }
    );
  }
}

function generateSongTitle(story: string, style: string): string {
  const words = story.split(" ").slice(0, 5);
  const stylePrefix = {
    sad: "Tears of",
    savage: "Burn It Down:",
    healing: "Moving On From",
  };
  
  return `${stylePrefix[style as keyof typeof stylePrefix]} ${words.join(" ").substring(0, 30)}...`;
}
