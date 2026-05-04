/**
 * Notification Sound Utility
 * Plays audio alerts when notifications arrive
 */

let audioContext: AudioContext | null = null;

/**
 * Initialize Web Audio API context
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a simple beep sound using Web Audio API
 * This works on all browsers and doesn't require external audio files
 */
export function playNotificationSound(type: 'order' | 'delivery' | 'alert' = 'alert'): void {
  try {
    const context = getAudioContext();
    
    // Resume audio context if suspended (required on mobile)
    if (context.state === 'suspended') {
      context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Different sounds for different notification types
    switch (type) {
      case 'order':
        // Order notification: two quick beeps
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.setValueAtTime(800, now + 0.1);
        oscillator.frequency.setValueAtTime(600, now + 0.15);
        oscillator.frequency.setValueAtTime(600, now + 0.25);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.setValueAtTime(0.3, now + 0.1);
        gainNode.gain.setValueAtTime(0, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now + 0.15);
        gainNode.gain.setValueAtTime(0, now + 0.25);
        
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;

      case 'delivery':
        // Delivery notification: ascending tones
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.setValueAtTime(800, now + 0.1);
        oscillator.frequency.setValueAtTime(1000, now + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.setValueAtTime(0, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'alert':
      default:
        // Alert notification: single beep
        oscillator.frequency.setValueAtTime(1000, now);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.setValueAtTime(0.3, now + 0.1);
        gainNode.gain.setValueAtTime(0, now + 0.1);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
    }
  } catch (error) {
    console.error('[Notification Sound] Error playing sound:', error);
  }
}

/**
 * Play notification sound with optional vibration on mobile
 */
export function playNotificationWithVibration(type: 'order' | 'delivery' | 'alert' = 'alert'): void {
  // Play sound
  playNotificationSound(type);

  // Add vibration on mobile devices
  if (navigator.vibrate) {
    switch (type) {
      case 'order':
        navigator.vibrate([100, 50, 100]); // Two short vibrations
        break;
      case 'delivery':
        navigator.vibrate([50, 100, 50, 100, 50]); // Ascending pattern
        break;
      case 'alert':
      default:
        navigator.vibrate([200]); // Single vibration
        break;
    }
  }
}
