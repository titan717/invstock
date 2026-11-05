/** A quiet generative ambient pad played through Web Audio while the Music setting is on. */
let context: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;

const CHORDS = [
  [220, 277.18, 329.63],
  [196, 246.94, 293.66],
  [174.61, 220, 261.63],
  [196, 246.94, 329.63],
];

function playChord(index: number) {
  if (!context || !master) return;
  const now = context.currentTime;
  for (const frequency of CHORDS[index % CHORDS.length]) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 2);
    gain.gain.linearRampToValueAtTime(0, now + 7.5);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 8);
  }
}

export function startAmbientMusic() {
  if (typeof window === "undefined" || timer !== null || !("AudioContext" in window)) return;
  try {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.6;
    master.connect(context.destination);
    let index = 0;
    playChord(index++);
    timer = window.setInterval(() => playChord(index++), 6000);
  } catch {
    stopAmbientMusic();
  }
}

export function stopAmbientMusic() {
  if (timer !== null && typeof window !== "undefined") window.clearInterval(timer);
  timer = null;
  void context?.close().catch(() => undefined);
  context = null;
  master = null;
}
