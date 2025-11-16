import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { songs } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const songId = params.id;
    
    const songResult = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);
    const song = songResult[0];

    if (!song) {
      return NextResponse.json(
        { success: false, error: "Song not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      song: {
        id: song.id,
        title: song.title,
        story: song.story,
        style: song.style,
        previewUrl: song.previewUrl,
        fullUrl: song.isPurchased ? song.fullUrl : song.previewUrl,
        isPurchased: song.isPurchased,
        createdAt: song.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching song:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch song" },
      { status: 500 }
    );
  }
}
