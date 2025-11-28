// Audio worker retired: audio generation is no longer part of the daily motivation product.
// This stub keeps the module present to avoid import errors but prevents background
// audio-generation processes from running. If you later re-enable generation, replace
// this file with the previous implementation or a new worker that targets Eleven/OpenRouter.

if (require.main === module) {
  console.info('Audio worker disabled — audio generation retired for DailyMotiv. Exiting.');
  process.exit(0);
}

export default async function runWorkerStub() {
  console.info('Audio worker is disabled in this build. No-op.');
}
