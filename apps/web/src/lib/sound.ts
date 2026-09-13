/**
 * EF-8.1 — sons de partie, synthétisés à la volée : aucun fichier à télécharger, donc rien
 * qui puisse arriver après le démarrage du chronomètre (CA-13).
 */
export type SoundEffect = 'reveal' | 'match' | 'miss' | 'finish';

interface Note {
  frequency: number;
  /** Décalage de départ, en secondes. */
  at: number;
  duration: number;
  type?: OscillatorType;
}

const EFFECTS: Record<SoundEffect, Note[]> = {
  reveal: [{ frequency: 660, at: 0, duration: 0.06, type: 'triangle' }],
  match: [
    { frequency: 660, at: 0, duration: 0.09 },
    { frequency: 990, at: 0.08, duration: 0.14 },
  ],
  miss: [{ frequency: 220, at: 0, duration: 0.14, type: 'triangle' }],
  finish: [
    { frequency: 523, at: 0, duration: 0.12 },
    { frequency: 659, at: 0.1, duration: 0.12 },
    { frequency: 784, at: 0.2, duration: 0.12 },
    { frequency: 1047, at: 0.3, duration: 0.26 },
  ],
};

const VOLUME = 0.08;
let context: AudioContext | null = null;

export function playSound(effect: SoundEffect): void {
  try {
    context ??= new AudioContext();
    // Contexte suspendu tant qu'aucun geste de l'utilisateur ne l'a autorisé : le son est alors simplement perdu.
    if (context.state === 'suspended') void context.resume();
    const start = context.currentTime;
    for (const note of EFFECTS[effect]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type ?? 'sine';
      oscillator.frequency.value = note.frequency;
      // Enveloppe courte : attaque et extinction progressives, sans claquement.
      gain.gain.setValueAtTime(0, start + note.at);
      gain.gain.linearRampToValueAtTime(VOLUME, start + note.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + note.at);
      oscillator.stop(start + note.at + note.duration + 0.02);
    }
  } catch {
    // Audio indisponible : le jeu reste entièrement jouable en silence.
  }
}
