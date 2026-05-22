export const playHarpChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // F5 (698.46Hz), A5 (880Hz), C6 (1046.5Hz), E6 (1318.51Hz) - F Major Add9 Arpeggio
    const notes = [698.46, 880.00, 1046.50, 1318.51];
    const delayBetweenNotes = 0.08; // 80ms interval

    notes.forEach((freq, index) => {
      const startTime = now + index * delayBetweenNotes;
      const duration = 0.9; // Decay length in seconds

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Mix of sine (crystal clarity) and triangle (warm plucked harp string)
      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Volume envelope: Plucked string/Harp shape
      gainNode.gain.setValueAtTime(0, startTime);
      // Fast attack (5ms)
      gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.005);
      // Exponential decay to silence
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  } catch (error) {
    console.warn('Web Audio API playback failed or was blocked by browser autoplay policy:', error);
  }
};
