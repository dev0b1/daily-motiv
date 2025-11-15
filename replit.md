# ExRoast.fm - Replit Project

## Overview
ExRoast.fm is a Next.js web application that turns breakup stories into savage, TikTok-viral AI roast songs. 100% petty, zero sadness. Built with Next.js 16, Tailwind CSS, Framer Motion, Suno AI, and OpenRouter.

## Recent Changes (November 15, 2025)

### Complete Rebrand to ExRoast.fm (November 15, 2025)
- ✅ **Rebranded from HeartHeal to ExRoast.fm** - Complete transformation from healing to savage roast app
- ✅ **New color scheme** - Almost black (#0f0f0f), hot pink (#ff006e), gold (#ffd23f)
- ✅ **Updated all emojis** - Replaced hearts with 🔥💅🗡️👑
- ✅ **Simplified modes** - Removed sad/heal/vibe/meme, kept only:
  - Petty Roast (savage rap/trap)
  - Glow-Up Flex (upbeat victory pop/EDM)
- ✅ **Updated AI prompts** - New savage, TikTok-viral roast prompts with zero healing vibes
- ✅ **Mobile-first bold design** - Club/revenge party aesthetic with bold fonts
- ✅ **Updated tagline** - "Turn your breakup story into a savage 30-second roast song in seconds 🔥"
- ✅ **Updated pricing display** - $4.99 one-time, $12.99/mo unlimited
- ✅ **New placeholder text** - "Spill the tea — what did they do? 👀"
- ✅ **Commented out Supabase auth** - Using Drizzle ORM setup (commented for dev)

### Previous Updates - Viral Features Implementation
- ✅ **Analysis Screen for Chat Uploads** - Shows red flag level, heartbreak intensity, recommended vibe
- ✅ **Enhanced UX - Character Counter** - Live character counter (0/500) on story textarea
- ✅ **First-Time User Experience** - Free first song (15-20 sec preview) with subscription modal
- ✅ **Subscription Modal** - Appears after first song preview, shows benefits and pricing
- ✅ **Mobile Responsive** - All features optimized for mobile devices

### Previous Updates - Suno AI Integration
- ✅ **Integrated Suno AI** - Professional music generation
- ✅ **Added OpenRouter integration** - Using Mistral 7B for prompt generation
- ✅ **Created LyricsOverlay component** - Smooth scrolling lyrics synchronized with playback
- ✅ **Enhanced Share/Preview pages** - Animated backgrounds, custom audio player

## Project Architecture

### Frontend
- **Next.js 16 App Router**: Modern React framework with server components
- **Tailwind CSS**: Dark theme with ExRoast.fm custom colors
- **Framer Motion**: Bold animations and transitions
- **React Icons**: Icon library for UI elements

### Pages
1. `/` - Landing page with savage messaging, TikTok-viral positioning
2. `/pricing` - Pricing page with $4.99 one-time and $12.99/mo unlimited
3. `/story` - Story input with "Spill the tea" messaging and 2 mode selection
4. `/preview` - Song preview with 15-second watermarked version, unlock options
5. `/share/[id]` - Public song share page with TikTok share button
6. `/success` - Payment confirmation page

### Components
- `Header` - Navigation with ExRoast.fm branding (🔥 logo, hot pink/gold)
- `Footer` - Links and social media (TikTok-focused)
- `StyleSelector` - Choose vibe (Petty Roast / Glow-Up Flex)
- `SongPlayer` - Audio playback with gold waveform
- `LyricsOverlay` - Animated scrolling lyrics
- `AnimatedBackground` - Fire and revenge party animations
- `SubscriptionModal` - Pricing and unlock prompt
- `FileUpload` - Screenshot upload ("Drop those receipts")
- `SocialShareButtons` - TikTok share with pre-filled caption
- `LoadingProgress` - Progress indicator for roast generation

### API Routes
- `/api/generate-song` - POST endpoint for savage roast generation (OpenRouter + Suno AI)
- `/api/song/[id]` - GET endpoint for song retrieval
- `/api/ocr` - POST endpoint for chat screenshot text extraction
- `/api/webhook` - Paddle webhook handler

### Libraries
- `lib/suno.ts` - Suno AI client for music generation
- `lib/openrouter.ts` - OpenRouter client with savage roast prompts
- `lib/ocr.ts` - Tesseract.js OCR functionality
- `lib/lyrics.ts` - Lyrics generation utilities
- `lib/prisma.ts` - Prisma database client

## Paddle Billing Integration

### Subscription Tiers
- **Free**: $0 - 15-second watermarked previews ("Full roast at ExRoast.fm")
- **One-Time**: $4.99 - Full 30-second roast song
- **Unlimited**: $12.99/month - Unlimited roasts, no watermark, priority generation

### Setup Instructions

1. **Create Paddle Account**
   - Sign up at https://www.paddle.com/
   - Complete account verification

2. **Create Products in Paddle Dashboard**
   - Create pricing products (One-Time $4.99, Monthly $12.99)
   - Note the Price IDs

3. **Configure Environment Variables**
   ```
   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_client_token_here
   NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox (or "production")
   NEXT_PUBLIC_PADDLE_PRICE_ONETIME=pri_01xxxxx
   NEXT_PUBLIC_PADDLE_PRICE_UNLIMITED=pri_01xxxxx
   PADDLE_API_KEY=your_api_key_here
   PADDLE_NOTIFICATION_WEBHOOK_SECRET=pdl_ntfset_xxxxx
   ```

4. **Set up Webhook**
   - Add webhook URL: `https://your-replit-url.repl.co/api/webhook`
   - Select events: `transaction.completed`, `subscription.created`, etc.

## AI Integration

### Suno AI Music Generation
**Required Environment Variables:**
```
SUNO_API_KEY=your_api_key_here
```

**Integration Flow:**
1. User provides breakup story (text or screenshot)
2. OCR extracts text from screenshot (if applicable)
3. OpenRouter generates savage roast prompt
4. Suno AI generates 30-35 second roast song
5. Free version: 15-second preview with watermark
6. Paid: Full 30-second roast with ending: "Your ex just got roasted at ExRoast.fm — link in bio"

### OpenRouter LLM Integration
**Required Environment Variables:**
```
OPENROUTER_API_KEY=your_api_key_here
```

**Purpose:**
- Creates brutal, hilarious, TikTok-viral roast prompts
- Uses Mistral 7B Instruct (free tier)
- Generates petty song titles and savage lyrics
- 100% savage energy, zero sadness/healing
- Specific to user's breakup story

**Prompt Style:**
- Petty Roast: Rap/trap, Cardi B/Eminem energy, brutal and funny
- Glow-Up Flex: Upbeat pop/EDM, victory anthem, confident celebration

## User Preferences
- Mobile-first responsive design
- Bold, aggressive fonts (font-black everywhere)
- Dark theme: black (#0f0f0f) background, hot pink/gold accents
- Club/revenge party aesthetic
- TikTok-viral positioning
- No placeholder data - production-ready code

## Dependencies
```json
{
  "@paddle/paddle-js": "^1.5.1",
  "next": "^16.0.3",
  "react": "^19.2.0",
  "tailwindcss": "^4.1.17",
  "framer-motion": "^12.23.24",
  "openai": "^6.9.0",
  "drizzle-orm": "^0.44.7",
  "drizzle-kit": "^0.31.7",
  "@supabase/supabase-js": "^2.81.1"
}
```

## Development
- Dev server runs on port 5000 (required for Replit webview)
- All hosts allowed for iframe compatibility
- TypeScript strict mode enabled
- Supabase auth commented out for development (implement with Drizzle when ready)

## Complete Workflow

### Song Generation Flow
1. **User Input**: User types story OR uploads chat screenshot
2. **OCR Processing** (if screenshot): Tesseract.js extracts text
3. **LLM Generation**: OpenRouter creates savage roast prompt with:
   - Petty song title
   - Genre tags (rap/trap or pop/EDM)
   - Brutal, funny roast prompt
4. **Music Generation**: Suno AI creates 30-35 second roast song
5. **Preview Display**: 
   - Free: 15-second watermarked preview
   - Paid: Full 30-second roast
   - TikTok share button with caption: "POV: My ex hears this 😈 #ExRoast @exroastfm"
6. **Sharing**: Auto-generate share image (black background, gold text "MY EX GOT ROASTED" + 🔥)

### Technical Features
- **Mobile-first bold design** with aggressive typography
- **Dark theme** - almost black with neon pink/gold accents
- **Fire animations** - club/revenge party aesthetic
- **Watermarked previews** - "Full roast at ExRoast.fm" for free tier
- **TikTok-viral positioning** - Pre-filled captions, share images
- **Savage AI prompts** - 100% petty, zero healing vibes

## Next Steps
1. ✅ Complete ExRoast.fm transformation
2. Test Suno AI integration with new roast prompts
3. Set up Paddle products ($4.99 one-time, $12.99/mo)
4. Configure webhook endpoint
5. Test watermark on free previews
6. Implement TikTok share image generation
7. Add authentication with Drizzle ORM (currently commented out)
8. Deploy and test complete roast workflow
