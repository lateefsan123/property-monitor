export function createNativeVoiceTransport() {
  let rtc, audioManager, disposed = false, audioStarted = false;
  return {
    async microphone() {
      try {
        rtc = await import('react-native-webrtc');
        const module = await import('react-native-incall-manager');
        audioManager = module.default;
      } catch { throw new Error('Install the latest Repeat AI build to use voice. Expo Go does not include its audio module.'); }
      if (disposed) throw new Error('Conversation ended.');
      const stream = await rtc.mediaDevices.getUserMedia({ audio: true, video: false });
      if (disposed) return stream; // Controller stops a late permission result.
      try {
        // Video mode selects speaker by default while still respecting wired
        // audio routes. Only an AUDIO track is requested above; no camera use.
        audioManager.start({ media: 'video' }); audioStarted = true;
        return stream;
      } catch { stream.getTracks().forEach(track => track.stop()); throw new Error('Could not start voice audio.'); }
    },
    peer: () => new rtc.RTCPeerConnection({}),
    answer: sdp => new rtc.RTCSessionDescription({ type: 'answer', sdp }),
    play() { /* WebRTC renders the remote audio track natively. */ },
    cleanup() { disposed = true; if (audioStarted) { audioManager.stop(); audioStarted = false; } },
  };
}
