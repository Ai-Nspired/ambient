// What the wheel feels like: the pulses, in one place, with the motor passed in.
//
// Haptics are not decoration here. The whole premise is that a hand on a wheel
// can operate the thing without looking, so the motor is the primary channel and
// speech is the optional one: he is not visually impaired, he wants the touch
// system, and he wants her voice off. If the pulse is missing, the wheel is a
// slider with no numbers.
//
// Android's `navigator.vibrate` is the motor. Two things it does that cost feel:
//
//   - Durations under about 10 ms are often dropped by the driver, so a "tick"
//     that returns 6 ms is a tick that never happens.
//   - Calls closer than ~20 ms merge into one buzz, so a fast turn has to raise
//     its strength rather than fire more pulses. That coalescing is decided in
//     detents.js (pulsePlan); this file only gives each tier a shape.
//
// Nothing here reads the browser: the motor is injected, so the patterns are
// testable and a device without a motor degrades to no-op instead of throwing.

/**
 * One shape per meaning.
 *
 * These began as tapeflow's numbers — Soft 35, Light 40, Rigid 45, selection 50,
 * Heavy 60, and the three-beat Error — chosen on a phone where that build's wheel
 * already felt right. On the operator's device they did not, and neither did 50–200 ms
 * raised shapes, nor stacked two-beat ones. The cause was never the patterns: the phone
 * was in Do Not Disturb, which silences `navigator.vibrate` while leaving the OS's own
 * long-press haptic alive — so the one pulse he could feel was the system's, not ours.
 * With DND off every shape lands, and the detents are back to single beats.
 *
 * The beep fires alongside the pulse on every mark, never as a fallback: it costs
 * nothing, it is the channel that worked while the motor was silent, and on a device
 * with no motor at all it is the whole of the feel.
 */
export const PATTERNS = {
  /**
   * Single beats. The detents spent a day stacked into two beats because a hand in Do
   * Not Disturb feels nothing at any length — the wrong lesson, and the stacking made a
   * spin stutter. `navigator.vibrate` has no amplitude, only duration, so 70–80 ms reads
   * as a click where 140 ms read as two. Two-beat shapes remain only where a gesture has
   * to be distinguishable from a detent: the grip, the hold, the send.
   */
  /** A detent: the smallest thing the wheel says. */
  soft: [70],
  /** An edge, between a detent and a landmark. */
  edge: [80],
  /** A landmark: the slot a value settles in. */
  medium: [90],
  /** A hard stop: past the end of a list, or a refusal. */
  hard: [120],
  /** A grip on the kill's dot: two beats, short, so it never reads as a detent. */
  grip: [60, 40, 60],
  /** The microphone opened: Warning, two beats. A live mic must be unmistakable. */
  hold: [50, 100, 50],
  /** Released and sending: two short beats, a release rather than a tick. */
  send: [40, 40],
  /** A choice landed and the next card is being made: Success, two beats. */
  chosen: [40, 100, 40],
  /** Something failed: Error, three beats. The only pattern unpleasant on purpose. */
  error: [60, 100, 60, 100, 60],
  /**
   * The first words of a language that has no words in it: yes is one beat long enough
   * to be an answer rather than a detent, no is two quick ones with the gap between them
   * tight, so it cannot be mistaken for the wider spacing of `chosen` or `grip`.
   */
  yes: [260],
  no: [45, 55, 45],
};

/** Tiers name patterns; passing a tier is the normal call. */
const TIERS = ['soft', 'medium', 'hard'];

/** A vibrate() that cannot be called must not break a gesture. */
function defaultMotor() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return null;
  return (pattern) => navigator.vibrate(pattern);
}

/**
 * The motor, wrapped.
 *
 * `enabled` exists because a motor is not always wanted — a quiet room, a device
 * in a case — and because a test needs to prove the patterns without buzzing.
 * The count is kept so the client can verify it fired: a silent motor and a
 * missing call look the same from the outside otherwise.
 */
export function createHaptics(options = {}) {
  const motor = typeof options.vibrate === 'function' ? options.vibrate : defaultMotor();
  let enabled = options.enabled !== false;
  let count = 0;
  let last = null;
  // Chrome answers `false` for a pattern it will not run and `true` for one it will;
  // `undefined` is a motor that does not answer. Keeping the tally is what lets a
  // silent hand be told apart from a call that never happened.
  let accepted = 0;
  let refused = 0;

  const fire = (name) => {
    if (!enabled || !motor) return null;
    const pattern = PATTERNS[name];
    if (!pattern) return null;
    count += 1;
    last = name;
    try {
      const sent = motor(pattern.slice());
      if (sent === false) refused += 1;
      else accepted += 1;
    } catch {
      // A refused vibration is not a failed gesture.
      return null;
    }
    return name;
  };

  return {
    get enabled() {
      return enabled;
    },
    /** False when the device has no motor at all; the client says so once. */
    get available() {
      return Boolean(motor);
    },
    get count() {
      return count;
    },
    get last() {
      return last;
    },
    /** Pulses the platform took, and pulses it answered `false` to. */
    get accepted() {
      return accepted;
    },
    get refused() {
      return refused;
    },
    setEnabled(next) {
      enabled = Boolean(next);
      if (!enabled && motor) {
        try {
          motor([]);
        } catch {
          // nothing to stop
        }
      }
      return enabled;
    },
    /** A detent, or the tier the rate limiter raised it to. */
    pulse(tier) {
      const name = TIERS.includes(tier) ? tier : 'soft';
      return fire(name);
    },
    edge() {
      return fire('edge');
    },
    hold() {
      return fire('hold');
    },
    send() {
      return fire('send');
    },
    chosen() {
      return fire('chosen');
    },
    error() {
      return fire('error');
    },
    /** A hand closing on the kill's dot. Two beats: gripped, not a detent. */
    grip() {
      return fire('grip');
    },
    /** Yes: one long beat. */
    yes() {
      return fire('yes');
    },
    /** No: two quick beats. */
    no() {
      return fire('no');
    },
    /** For a control that has to stop a pattern it started. */
    stop() {
      if (motor) {
        try {
          motor([]);
        } catch {
          // nothing to stop
        }
      }
    },
  };
}

export default { PATTERNS, createHaptics };
