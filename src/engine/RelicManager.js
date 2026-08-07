/* RelicManager — triggers relic hooks during combat and run */
import RunState from './RunState.js';

const RelicManager = {
  _pressureCardCount: 0,

  /** Reset per-interview state */
  resetInterview() {
    this._pressureCardCount = 0;
  },

  /** Trigger all relics matching a given hook.
   *  @param {string} hookName
   *  @param {object} combat — CombatState instance (nullable for non-combat hooks)
   *  @param {object} [extra] — extra context (e.g. { card, targetIdx })
   *  @returns {object[]} — array of { relic, applied } descriptions for animation
   */
  trigger(hookName, combat, extra = {}) {
    const run = RunState.get();
    const results = [];

    for (const relic of run.relics) {
      if (relic.hook !== hookName) continue;
      const applied = this._applyEffect(relic.effect, combat, extra);
      if (applied) results.push({ relic, applied });
    }

    return results;
  },

  _applyEffect(effect, combat, extra) {
    if (!effect) return null;

    // Multi-effect wrapper
    if (effect.type === 'multi') {
      const subs = [];
      for (const sub of effect.effects || []) {
        const r = this._applyEffect(sub, combat, extra);
        if (r) subs.push(r);
      }
      return subs.length ? subs : null;
    }

    switch (effect.type) {
      case 'heal': {
        RunState.heal(effect.value);
        if (combat) combat.reporter.credibility = RunState.get().credibility;
        return { type: 'heal', value: effect.value };
      }
      case 'max-focus': {
        if (combat) {
          combat.reporter.maxFocus += effect.value;
          combat.reporter.focus += effect.value;
        }
        return { type: 'max-focus', value: effect.value };
      }
      case 'draw': {
        if (combat) combat.deckManager.draw(effect.value);
        return { type: 'draw', value: effect.value };
      }
      case 'apply-status': {
        if (combat) combat.reporter.statuses.add(effect.status, effect.stacks || 1);
        return { type: 'apply-status', status: effect.status, stacks: effect.stacks || 1 };
      }
      case 'rapport': {
        if (combat) combat.reporter.rapport += effect.value;
        return { type: 'rapport', value: effect.value };
      }
      case 'pressure-all': {
        if (combat) {
          for (const s of combat.subjects) {
            if (s.composure > 0) {
              s.composure = Math.max(0, s.composure - effect.value);
            }
          }
        }
        return { type: 'pressure-all', value: effect.value };
      }
      case 'gain-focus': {
        if (combat) combat.reporter.focus += effect.value;
        return { type: 'gain-focus', value: effect.value };
      }
      case 'double-damage-every-n': {
        // Tracked externally — return whether THIS card gets doubled
        this._pressureCardCount++;
        if (this._pressureCardCount % effect.n === 0) {
          return { type: 'double-damage', active: true };
        }
        return null;
      }
      case 'conditional-rapport': {
        if (combat && effect.condition === 'rapport-zero' && combat.reporter.rapport === 0) {
          combat.reporter.rapport += effect.value;
          return { type: 'rapport', value: effect.value };
        }
        return null;
      }
      case 'max-credibility': {
        const run = RunState.get();
        run.maxCredibility += effect.value;
        run.credibility = run.maxCredibility;
        RunState.save();
        return { type: 'max-credibility', value: effect.value };
      }
      default:
        return null;
    }
  },

  /** Check if reporter should get double damage on next pressure card (Anteckningsbok) */
  shouldDoublePressure() {
    const run = RunState.get();
    const hasAnteckningsbok = run.relics.some(r => r.id === 'anteckningsbok');
    if (!hasAnteckningsbok) return false;
    // Double every 2nd pressure card (counter already incremented by trigger)
    return this._pressureCardCount % 2 === 0;
  },
};

export default RelicManager;
