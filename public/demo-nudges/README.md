Place demo audio nudges here for local previewing.

New naming convention (mood-based files):
- /public/demo-nudges/hurting.mp3
- /public/demo-nudges/confidence.mp3
- /public/demo-nudges/angry.mp3
- /public/demo-nudges/feeling-unstoppable.mp3

Behavior:
- After the user generates a daily motivation, the UI will load `/demo-nudges/{feeling}.mp3` based on the selected mood.
- The player will be programmatically paused after 15 seconds and the upgrade upsell modal will appear.

Notes:
- If you prefer multiple demo variants per mood, add files with different names and update the mapping in `components/DailyCheckInTab.tsx`.
-- Example: `/public/demo-nudges/hurting-1.mp3`, `/public/demo-nudges/hurting-2.mp3` and pick randomly.

Update `components/DailyCheckInTab.tsx` if you change filenames or mapping logic.