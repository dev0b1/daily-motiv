# Implementation Notes for Production

## ✅ What's Been Implemented

### Database & Persistence
- **Prisma ORM with SQLite** - Songs are now stored persistently across server restarts
- **Database Schema** - Songs and Transactions tables with proper indexing
- **Idempotent Webhook Processing** - Prevents duplicate transaction processing
- **Migration Ready** - Uses Prisma schema for easy database migrations

### Paddle Integration
- **Webhook Signature Verification** - Uses official Paddle SDK for secure verification
- **Transaction Logging** - All Paddle events are logged to database
- **Song Unlocking** - Purchases automatically unlock full songs
- **Idempotency** - Duplicate webhook events are safely ignored
- **Error Handling** - Validates custom_data and handles missing fields gracefully

### Audio Provider Pattern
- **Pluggable Architecture** - Easy to swap between placeholder and real audio
- **Placeholder Provider** - Works out-of-the-box without API keys
- **ElevenLabs Scaffolding** - Ready for implementation when API key is added

### API Routes
- **Persistent Storage** - All routes use Prisma instead of in-memory storage
- **Error Handling** - Proper 404/500 responses with error messages
- **Type Safety** - TypeScript interfaces for all API requests/responses

### Share & Social Features
- **Share Page** - Displays song with audio player and story
- **Open Graph Images** - Dynamic OG image generation for social sharing
- **Social Buttons** - TikTok, Instagram, WhatsApp, Twitter sharing

---

## 🚨 Critical Areas for Production

This document outlines the remaining work needed before deploying to production.

## 🚨 Critical: Song Storage & Generation

### Current State
- Songs are stored in-memory (`global.songs`) which is lost on server restart
- Preview audio uses a placeholder file
- Full song URLs point to non-existent files
- **This means users cannot download purchased songs**

### Required Implementation

#### 1. Database Setup
Add a proper database (PostgreSQL, MongoDB, etc.) to store:
```typescript
interface Song {
  id: string;
  userId?: string;  // Link to authenticated user
  title: string;
  story: string;
  style: 'sad' | 'savage' | 'healing';
  previewUrl: string;  // S3/Cloud Storage URL
  fullUrl: string;     // S3/Cloud Storage URL
  isPurchased: boolean;
  purchaseTransactionId?: string;
  createdAt: Date;
  expiresAt?: Date;
}
```

#### 2. File Storage
Set up cloud storage (AWS S3, Google Cloud Storage, or similar):
- Store generated audio files persistently
- Generate signed URLs for secure access
- Implement expiration for unpurchased previews
- Keep full songs accessible for purchased users

#### 3. ElevenLabs Integration
Complete the implementation in `lib/elevenlabs.ts`:

```typescript
// Example implementation structure
export class ElevenLabsMusicAPI {
  async generateSong(params: {
    prompt: string;
    duration: number;
    style: string;
  }): Promise<{ previewUrl: string; fullUrl: string }> {
    // 1. Call ElevenLabs API to generate music
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-music', {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.prompt,
        duration_seconds: params.duration,
      }),
    });

    const audioData = await response.arrayBuffer();

    // 2. Upload full audio to cloud storage
    const fullUrl = await uploadToStorage(audioData, 'full');

    // 3. Create 10-second preview
    const previewData = await createPreview(audioData, 10);
    const previewUrl = await uploadToStorage(previewData, 'preview');

    return { previewUrl, fullUrl };
  }
}
```

Update `app/api/generate-song/route.ts`:
```typescript
import { ElevenLabsMusicAPI } from '@/lib/elevenlabs';

export async function POST(request: NextRequest) {
  const { story, style } = await request.json();

  // Generate song using ElevenLabs
  const elevenlabs = new ElevenLabsMusicAPI(process.env.ELEVENLABS_API_KEY!);
  const { previewUrl, fullUrl } = await elevenlabs.generateSong({
    prompt: story,
    duration: 120,
    style: style,
  });

  // Save to database
  const song = await db.songs.create({
    title: generateSongTitle(story, style),
    story,
    style,
    previewUrl,
    fullUrl,
    isPurchased: false,
  });

  return NextResponse.json({ success: true, songId: song.id });
}
```

## 🔐 Paddle Webhook Implementation

### Current State
- Webhook route exists but doesn't verify signatures
- No actual fulfillment logic
- No connection between purchases and song access

### Required Implementation

#### 1. Signature Verification
Install Paddle Node SDK:
```bash
npm install @paddle/paddle-node-sdk
```

Update `app/api/webhook/route.ts`:
```typescript
import { Paddle } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('paddle-signature') || '';

  try {
    // Verify webhook signature
    const eventData = await paddle.webhooks.unmarshal(
      body,
      process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET!,
      signature
    );

    // Handle different event types...
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
}
```

#### 2. Purchase Fulfillment
When a transaction completes, unlock the song:

```typescript
async function handleTransactionCompleted(transaction: any) {
  const customData = transaction.custom_data;
  const songId = customData?.songId;
  const userId = customData?.userId;

  if (songId) {
    // Unlock the song in database
    await db.songs.update({
      where: { id: songId },
      data: {
        isPurchased: true,
        purchaseTransactionId: transaction.id,
        userId: userId,
      },
    });

    // Send email with download link
    await sendPurchaseConfirmationEmail(transaction.customer_email, songId);
  }
}
```

#### 3. Pass Song ID to Checkout
Update `components/SubscriptionCTA.tsx`:
```typescript
const handleSingleSongPurchase = (songId: string) => {
  window.Paddle.Checkout.open({
    items: [{ priceId: 'pri_single_song', quantity: 1 }],
    customData: {
      songId: songId,
      userId: currentUserId, // From auth
    },
    settings: {
      successUrl: `${window.location.origin}/success?songId=${songId}`,
    },
  });
};
```

## 👤 User Authentication

### Why It's Needed
- Track which songs belong to which users
- Allow users to access purchased songs later
- Prevent unauthorized downloads

### Recommended: Next-Auth
```bash
npm install next-auth
```

Or use a Replit integration for authentication if available.

## 📊 Song Access Control

### Current State
- Anyone with a song ID can view it
- No differentiation between preview and full access

### Required Implementation

Create a download endpoint with access control:
```typescript
// app/api/song/[id]/download/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const songId = params.id;
  const userId = await getCurrentUserId(request); // From auth

  // Check if user has purchased this song
  const song = await db.songs.findUnique({
    where: { id: songId },
  });

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // Check access rights
  if (!song.isPurchased || song.userId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Generate signed download URL (for S3, etc.)
  const downloadUrl = await generateSignedUrl(song.fullUrl);

  return NextResponse.redirect(downloadUrl);
}
```

## 🔄 Share Page Metadata

Add Open Graph tags for social sharing in `app/share/[id]/page.tsx`:

```typescript
export async function generateMetadata({ params }: { params: { id: string } }) {
  const song = await fetchSongFromDB(params.id);

  return {
    title: song.title,
    description: `Listen to this AI-generated breakup song: ${song.story.substring(0, 150)}...`,
    openGraph: {
      title: song.title,
      description: song.story,
      images: ['/og-image.png'], // Create a dynamic OG image
      type: 'music.song',
    },
    twitter: {
      card: 'summary_large_image',
      title: song.title,
      description: song.story,
    },
  };
}
```

## 📝 Environment Variables Checklist

Before going to production, ensure these are set:

```bash
# Paddle (Production Mode)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_production_client_token
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production
NEXT_PUBLIC_PADDLE_PRICE_STANDARD=pri_production_standard
NEXT_PUBLIC_PADDLE_PRICE_PREMIUM=pri_production_premium
NEXT_PUBLIC_PADDLE_PRICE_SINGLE=pri_production_single_song
PADDLE_API_KEY=your_production_api_key
PADDLE_NOTIFICATION_WEBHOOK_SECRET=your_webhook_secret

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Database
DATABASE_URL=your_production_database_url

# File Storage
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# Auth (if using NextAuth)
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your_random_secret
```

## 🚀 Deployment Checklist

Before deploying:

- [ ] Set up production database
- [ ] Configure cloud storage for audio files
- [ ] Implement ElevenLabs integration
- [ ] Add user authentication
- [ ] Implement webhook signature verification
- [ ] Add purchase fulfillment logic
- [ ] Create access control for song downloads
- [ ] Test full user journey end-to-end
- [ ] Set up monitoring and error tracking
- [ ] Configure Paddle webhook URL in dashboard
- [ ] Switch Paddle to production mode
- [ ] Test actual payment with real card
- [ ] Verify emails are being sent
- [ ] Add rate limiting to API routes
- [ ] Set up CDN for audio files

## 📚 Additional Resources

- [Paddle Billing Documentation](https://developer.paddle.com/)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [AWS S3 Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)

---

**Note**: This app is currently a functional prototype. The above implementations are REQUIRED before accepting real payments from users.
