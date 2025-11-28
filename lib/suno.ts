
// Suno provider removed. Keep a compatibility stub to avoid runtime import errors.
export class SunoAPIStub {
  generateSong(): Promise<any> { throw new Error('Suno integration removed. Use Eleven/OpenRouter flows.'); }
  generateMp4(): Promise<any> { throw new Error('Suno integration removed. Use Eleven/OpenRouter flows.'); }
  pollForMp4(): Promise<any> { throw new Error('Suno integration removed. Use Eleven/OpenRouter flows.'); }
}

export function createSunoClient(): SunoAPIStub {
  return new SunoAPIStub();
}