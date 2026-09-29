import { useCallback, useEffect, useRef, useState } from 'react';

import { isMarkerCue } from '../utils/markers.js';

const DISPLAY_INTERVAL_MS = 250;
const TICK_MS = 50;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Battuta che deve essere in proiezione al tempo `time` (secondi), secondo i tempi registrati.
export function findCueIndexByTime(cues, time) {
  return cues.findIndex((cue, index) => {
    if (isMarkerCue(cue)) return false;
    const start = toNumber(cue.startTime);
    if (start === null) return false;
    const nextStart = cues[index + 1] ? toNumber(cues[index + 1].startTime) : null;
    const end = toNumber(cue.endTime) ?? nextStart ?? Infinity;
    return time >= start && time < end;
  });
}

// Card Tempi, modalità Riproduci: le battute avanzano da sole seguendo i tempi registrati.
export function useTimedPlayback({ cues, activeIndex, setActiveIndex, clearBlackout }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const cuesRef = useRef(cues);
  const activeIndexRef = useRef(activeIndex);
  const baseTimeRef = useRef(0);
  const startedAtRef = useRef(null);
  const lastDisplayRef = useRef(0);

  useEffect(() => { cuesRef.current = cues; }, [cues]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const currentTime = useCallback(() => (
    startedAtRef.current === null
      ? baseTimeRef.current
      : baseTimeRef.current + (performance.now() - startedAtRef.current) / 1000
  ), []);

  const pause = useCallback(() => {
    const time = currentTime();
    baseTimeRef.current = time;
    startedAtRef.current = null;
    setIsPlaying(false);
    setPlaybackTime(time);
  }, [currentTime]);

  // Riparte dal tempo registrato della battuta indicata (o di quella in proiezione).
  const startFrom = useCallback((index) => {
    const target = Number.isInteger(index) ? index : activeIndexRef.current;
    const startAt = toNumber(cuesRef.current[target]?.startTime) ?? 0;
    clearBlackout();
    baseTimeRef.current = startAt;
    startedAtRef.current = performance.now();
    setPlaybackTime(startAt);
    setIsPlaying(true);
  }, [clearBlackout]);

  // Intervallo invece di requestAnimationFrame: le battute avanzano anche se la finestra
  // principale non è in primo piano (lì rAF si ferma).
  useEffect(() => {
    if (!isPlaying) return undefined;
    function tick() {
      const now = performance.now();
      const time = currentTime();
      if (now - lastDisplayRef.current >= DISPLAY_INTERVAL_MS) {
        lastDisplayRef.current = now;
        setPlaybackTime(time);
      }
      const index = findCueIndexByTime(cuesRef.current, time);
      if (index !== -1 && index !== activeIndexRef.current) {
        clearBlackout();
        setActiveIndex(index);
      }
    }
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [clearBlackout, currentTime, isPlaying, setActiveIndex]);

  return { isPlaying, playbackTime, startFrom, pause };
}
