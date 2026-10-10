// Tone.js Audio Engine for Allay Motifs
import * as Tone from 'https://cdn.jsdelivr.net/npm/tone@14.8.49/+esm';

const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
    filter: { type: 'lowpass', frequency: 2000, Q: 2 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1, baseFrequency: 200, octaves: 4 }
}).toDestination();

const keyNotes = {
    'C': { major: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], minor: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'] },
    'G': { major: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5'], minor: ['E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5'] },
    'D': { major: ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5'], minor: ['B3', 'C#4', 'D4', 'E4', 'F#4', 'G4', 'A4'] },
    'A': { major: ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5'], minor: ['F#4', 'G#4', 'A4', 'B4', 'C#5', 'D5', 'E5'] },
    'E': { major: ['E4', 'F#4', 'G#4', 'A4', 'B4', 'C#5', 'D#5'], minor: ['C#4', 'D#4', 'E4', 'F#4', 'G#4', 'A4', 'B4'] },
    'F': { major: ['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5'], minor: ['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5'] },
    'Bb': { major: ['Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5', 'A5'], minor: ['G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5'] },
    'Eb': { major: ['Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'D5'], minor: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4'] }
};

const timeSigBeats = {
    '4/4': 4, '3/4': 3, '2/4': 2, '6/8': 6
};

let currentSequence = null;
let isPlaying = false;
let currentParams = null;

function getScaleNotes(keySig, isMinor = false) {
    return keyNotes[keySig]?.[isMinor ? 'minor' : 'major'] || keyNotes['C'].major;
}

function generatePattern(params) {
    const { bpm, timeSignature, keySignature, variability, complexity, density } = params;
    const beats = timeSigBeats[timeSignature] || 4;
    const notes = getScaleNotes(keySignature, Math.random() > 0.5);
    const pattern = [];

    const varFactor = variability / 100;
    const compFactor = complexity / 100;
    const densFactor = density / 100;

    const noteCount = Math.floor(2 + densFactor * 6);
    const subdivision = 4;

    for (let beat = 0; beat < beats; beat++) {
        for (let sub = 0; sub < subdivision; sub++) {
            if (Math.random() > densFactor) continue;

            const noteIndex = Math.floor(Math.random() * notes.length);
            const octaveShift = Math.floor(Math.random() * 2) * 12;
            const note = Tone.Frequency(notes[noteIndex]).transpose(octaveShift).toNote();

            const velocity = 0.4 + Math.random() * 0.6;
            const duration = ['8n', '16n', '4n'][Math.floor(Math.random() * 3)];

            const time = `${beat}:${sub}:0`;
            pattern.push({ time, note, velocity, duration });
        }
    }

    return pattern;
}

function playPattern(pattern, bpm) {
    if (currentSequence) {
        currentSequence.dispose();
    }

    Tone.Transport.bpm.value = bpm;

    currentSequence = new Tone.Sequence((time, event) => {
        synth.triggerAttackRelease(event.note, event.duration, time, event.velocity);
    }, pattern, '16n').start(0);

    Tone.Transport.start();
    isPlaying = true;
}

function stopPattern() {
    if (currentSequence) {
        currentSequence.stop();
        currentSequence.dispose();
        currentSequence = null;
    }
    Tone.Transport.stop();
    Tone.Transport.cancel();
    isPlaying = false;
}

function createAudioControls() {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:12px; width:100%;';

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.className = 'btn';
    playBtn.style.cssText = 'width:100%; padding:14px; font-size:1.1rem;';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = '■ Stop';
    stopBtn.className = 'btn ghost';
    stopBtn.style.cssText = 'width:100%; padding:14px; font-size:1.1rem;';
    stopBtn.disabled = true;

    const status = document.createElement('div');
    status.style.cssText = 'color:var(--muted); font-size:0.9rem; text-align:center;';
    status.textContent = 'Ready';

    playBtn.addEventListener('click', async () => {
        if (!currentParams) {
            status.textContent = 'Click Apply first';
            return;
        }
        await Tone.start();
        playPattern(currentParams.pattern, currentParams.bpm);
        playBtn.disabled = true;
        stopBtn.disabled = false;
        status.textContent = 'Playing...';
        status.style.color = 'var(--success)';
    });

    stopBtn.addEventListener('click', () => {
        stopPattern();
        playBtn.disabled = false;
        stopBtn.disabled = true;
        status.textContent = 'Stopped';
        status.style.color = 'var(--muted)';
    });

    container.append(playBtn, stopBtn, status);
    return container;
}

window.addEventListener('controlsApplied', (e) => {
    const params = e.detail;
    params.pattern = generatePattern(params);
    currentParams = params;

    const audioControls = createAudioControls();
    window.AllameinFrontend?.setOutputElement(audioControls);
});

window.addEventListener('controlsCleared', () => {
    stopPattern();
    currentParams = null;
    window.AllameinFrontend?.clearOutput();
});

window.AllameinAudio = { playPattern, stopPattern, generatePattern };