import { createBrowserVoiceTransport } from '../../../src/voice/voice-transport';
export function createNativeVoiceTransport(onError) {
  const audio = new Audio(); audio.autoplay = true;
  return createBrowserVoiceTransport(audio, onError);
}
