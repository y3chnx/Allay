import * as Tone from "https://cdn.skypack.dev/tone@14.7.77";

/* synth setup */
const synth = new Tone.Synth().toDestination();

/* small helpers */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/* ReRandom returns an integer 0..99 */
function ReRandom() {
  return randInt(0, 100);
}

/**
 * randomMotifCreator schedules a short motif on the synth.
 *
 * @param {number} bpmNumber - beats per minute (e.g., 120)
 * @param {string} timeSig - time signature string like "4/4", "6/8"
 * @param {string} keySig - root note as a Tone-compatible note string, e.g. "C4", "A3"
 * @param {number} variability - 0..100 (affects timing jitter)
 * @param {number} complexity - 0..100 (affects melodic leaps probability)
 * @param {number} density - 0..100 (affects how many notes per beat)
 *
 * Returns an array of scheduled events (for debugging/inspection).
 */
export function randomMotifCreator(bpmNumber, timeSig, keySig, variability = 20, complexity = 40, density = 50) {
  // Parse beats per bar from timeSig (e.g., "4/4" -> 4)
  const usedsig = (() => {
    const parts = String(timeSig).split('/');
    const n = parseInt(parts[0], 10);
    return Number.isFinite(n) ? n : 4;
  })();

  // Seconds per beat
  const secondsPerBeat = 60 / clamp(Number(bpmNumber) || 120, 30, 240);

  // variability as fraction for jitter (0..1)
  const varFrac = clamp(variability / 100, 0, 0.9);

  // density fraction (0..1) controls probability of note on a subdivision
  const densFrac = clamp(density / 100, 0, 1);

  // complexity fraction (0..1) controls chance of larger leaps
  const compFrac = clamp(complexity / 100, 0, 1);

  // subdivisions per beat (1..4) influenced by complexity
  const subdivisions = 1 + Math.round(compFrac * 3);

  // base time to start scheduling (use Tone.now())
  const startTime = Tone.now() + 0.05; // small offset to ensure scheduling after user action

  // convert keySig to a Tone.Frequency object for transposition
  const baseFreq = Tone.Frequency(keySig);

  // helper to compute a note name transposed by semitones
  function transposedNote(rootFreq, semitones) {
    return rootFreq.transpose(semitones).toNote();
  }

  // helper to compute a jittered duration around secondsPerBeat
  function jitteredDuration() {
    const jitter = randFloat(-varFrac, varFrac) * secondsPerBeat;
    const dur = clamp(secondsPerBeat + jitter, 0.05, secondsPerBeat * 2);
    return dur;
  }

  // schedule events array for inspection
  const scheduled = [];

  // For each beat in the bar, optionally schedule subdivisions
  let eventIndex = 0;
  for (let beat = 0; beat < usedsig; beat++) {
    for (let sub = 0; sub < subdivisions; sub++) {
      // decide whether to place a note based on density
      if (Math.random() <= densFrac) {
        // choose an offset within the bar: beat + subdivision fraction
        const offsetBeats = beat + (sub / subdivisions);
        const time = startTime + offsetBeats * secondsPerBeat;

        // pick melodic interval relative to keySig using randomness and complexity
        const r = ReRandom(); // 0..99
        // intervals in semitones (common diatonic-ish jumps and octaves)
        // smaller intervals more likely; larger intervals scaled by complexity
        let semitoneOffset = 0;
        if (r < 10) semitoneOffset = -12;          // octave down
        else if (r < 20) semitoneOffset = -7;      // fifth down
        else if (r < 30) semitoneOffset = -5;      // fourth down
        else if (r < 40) semitoneOffset = -2;      // whole-step down
        else if (r < 60) semitoneOffset = 0;       // root
        else if (r < 70) semitoneOffset = 2;       // whole-step up
        else if (r < 80) semitoneOffset = 4;       // major third up
        else if (r < 90) semitoneOffset = 7;       // fifth up
        else semitoneOffset = 12;                  // octave up

        // bias larger jumps by complexity
        if (Math.random() > compFrac) {
          // reduce magnitude of semitoneOffset to favor smaller steps
          semitoneOffset = Math.sign(semitoneOffset) * Math.round(Math.abs(semitoneOffset) * 0.5);
        }

        const noteName = transposedNote(baseFreq, semitoneOffset);
        const dur = jitteredDuration();

        // schedule the note
        synth.triggerAttackRelease(noteName, dur, time);

        scheduled.push({
          index: eventIndex++,
          time,
          beat,
          subdivision: sub,
          note: noteName,
          semitoneOffset,
          duration: dur
        });
      }
    }
  }

  // return scheduled events for debugging or further processing
  return scheduled;
}

/* Example usage:
   - Ensure Tone.start() is called in a user gesture (e.g., button click) in browsers.
   - Then call randomMotifCreator(120, "4/4", "C4", 20, 40, 60);
*/

// Example: attach to a button in your UI
document.addEventListener("DOMContentLoaded", () => {
  const applyBtn = document.getElementById("apply");
  if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
      // ensure audio context is started by a user gesture
      await Tone.start();
      // read values from your page (IDs must match your HTML)
      const bpm = Number(document.getElementById("bpmNumber")?.value || 120);
      const timeSig = document.getElementById("timeSig")?.value || "4/4";
      const keySig = document.getElementById("keySig")?.value || "C4";
      const variability = Number(document.getElementById("variability")?.value || 20);
      const complexity = Number(document.getElementById("complexity")?.value || 40);
      const density = Number(document.getElementById("density")?.value || 50);

      const events = randomMotifCreator(bpm, timeSig, keySig, variability, complexity, density);
      console.log("Scheduled events:", events);
    });
  }
});
