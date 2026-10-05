// Film mode only (EXPO_PUBLIC_FILM=1, see metro.config.js): the real voice hook,
// plus a scripted scene so the real voice panel can be captured listening and
// answering without a live session. The capture script sets window.__filmVoice
// (state, captions, loading, result) and dispatches 'film-voice'; null returns to
// the real hook.
import { useEffect, useState } from 'react';
import { useVoice as useLiveVoice } from '../../shared/use-voice';

export function useVoice(options) {
  const live = useLiveVoice(options);
  const [scene, setScene] = useState(null);
  useEffect(() => {
    const update = () => setScene(window.__filmVoice || null);
    window.addEventListener('film-voice', update);
    return () => window.removeEventListener('film-voice', update);
  }, []);
  return scene ? { ...live, captions: { you: '', assistant: '' }, result: null, loading: false, ...scene } : live;
}
