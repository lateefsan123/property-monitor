export function createBrowserVoiceTransport(audio, onError) {
  return {
    async microphone() {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('Voice needs a supported browser on HTTPS.');
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    },
    peer: () => new RTCPeerConnection(),
    answer: sdp => ({ type: 'answer', sdp }),
    play(event) {
      if (!audio) return;
      audio.srcObject = event.streams?.[0] || new MediaStream([event.track]);
      audio.play().catch(() => onError('Press play on the audio player to hear the assistant.'));
    },
    cleanup() { if (audio) { audio.pause(); audio.srcObject = null; } },
  };
}
