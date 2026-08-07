/* CardEffects — resolve card effects through the damage/block pipeline */
import { BALANCE } from '../constants.js';
import RelicManager from './RelicManager.js';

const CardEffects = {
  /**
   * Resolve a card being played.
   * @param {object} card — full card object from hand
   * @param {object} combat — CombatState reference
   * @param {number} targetIdx — index of target subject (default 0)
   * @returns {object} result — { pressureDone, rapportGained, cardsDrawn, focusSpent, effects[] }
   */
  resolve(card, combat, targetIdx = 0) {
    const result = {
      pressureDone: 0,
      rapportGained: 0,
      cardsDrawn: 0,
      focusSpent: 0,
      effects: [],
    };
    const reporter = combat.reporter;
    const target = combat.subjects[targetIdx];
    if (!target || target.composure <= 0) return result;

    // Determine focus cost
    let cost = card.focusCost;
    if (card.keywords?.includes('x-cost')) {
      cost = reporter.focus; // Spend all remaining focus
    }
    result.focusSpent = cost;

    // Process each effect
    for (const effect of (card.effects || [])) {
      switch (effect.type) {
        case 'pressure': {
          const hits = effect.hits || 1;
          const base = card.keywords?.includes('x-cost') ? effect.value * cost : effect.value;
          // Anteckningsbok: every 2nd pressure card deals double
          const doubleDmg = RelicManager.shouldDoublePressure();
          for (let h = 0; h < hits; h++) {
            let dmg = this._calcPressure(base, reporter, target);
            if (doubleDmg) dmg *= 2;
            this._applyPressure(dmg, target);
            result.pressureDone += dmg;
            result.effects.push({ type: 'pressure', value: dmg, targetIdx });
          }
          break;
        }
        case 'pressure-all': {
          const base = effect.value;
          for (let si = 0; si < combat.subjects.length; si++) {
            const s = combat.subjects[si];
            if (s.composure <= 0) continue;
            const dmg = this._calcPressure(base, reporter, s);
            this._applyPressure(dmg, s);
            result.pressureDone += dmg;
            result.effects.push({ type: 'pressure', value: dmg, targetIdx: si });
          }
          break;
        }
        case 'rapport': {
          const base = effect.value;
          const block = this._calcRapport(base, reporter);
          reporter.rapport += block;
          result.rapportGained += block;
          result.effects.push({ type: 'rapport', value: block });
          break;
        }
        case 'draw': {
          const n = effect.value;
          combat.deckManager.draw(n);
          result.cardsDrawn += n;
          result.effects.push({ type: 'draw', value: n });
          break;
        }
        case 'apply-status': {
          const entity = effect.target === 'self' ? reporter : target;
          entity.statuses.add(effect.status, effect.stacks || 1);
          result.effects.push({ type: 'status', status: effect.status, stacks: effect.stacks || 1, target: effect.target });
          break;
        }
        case 'apply-status-all': {
          for (const s of combat.subjects) {
            if (s.composure > 0) {
              s.statuses.add(effect.status, effect.stacks || 1);
            }
          }
          result.effects.push({ type: 'status-all', status: effect.status, stacks: effect.stacks || 1 });
          break;
        }
        case 'heal': {
          const healAmt = effect.value;
          combat.reporter.credibility = Math.min(
            combat.reporter.maxCredibility,
            combat.reporter.credibility + healAmt
          );
          result.effects.push({ type: 'heal', value: healAmt });
          break;
        }
        case 'gain-focus': {
          reporter.focus += effect.value;
          result.effects.push({ type: 'gain-focus', value: effect.value });
          break;
        }
        case 'exhaust-random': {
          // Exhaust random cards from hand (for subject attacks that strip cards)
          for (let i = 0; i < effect.value; i++) {
            const hand = combat.deckManager.hand;
            if (hand.length > 0) {
              const idx = Math.floor(Math.random() * hand.length);
              combat.deckManager.exhaust(hand[idx]);
            }
          }
          result.effects.push({ type: 'exhaust-random', value: effect.value });
          break;
        }
      }
    }

    // Handle keywords: Off the Record → exhaust
    if (card.keywords?.includes('exhaust')) {
      combat.deckManager.exhaust(card);
    } else if (card.type === 'angle') {
      // Power/Angle cards exhaust (not discarded)
      combat.deckManager.exhaust(card);
    } else {
      combat.deckManager.discard(card);
    }

    return result;
  },

  /** Damage pipeline: base + On a Roll → ×Flustered → −Guarded → −Lawyer Present */
  _calcPressure(base, reporter, target) {
    let dmg = base;

    // +On a Roll
    dmg += reporter.statuses.get('on-a-roll');

    // +Notoriety
    dmg += reporter.statuses.get('notoriety');

    // Rattled on reporter reduces pressure output
    if (reporter.statuses.has('rattled')) {
      dmg = Math.floor(dmg * BALANCE.RATTLED_MULTIPLIER);
    }

    // ×Flustered on target (1.5×)
    if (target.statuses.has('flustered')) {
      dmg = Math.floor(dmg * BALANCE.FLUSTERED_MULTIPLIER);
    }

    return Math.max(0, dmg);
  },

  /** Apply pressure through Guarded → Lawyer Present → Composure */
  _applyPressure(dmg, target) {
    let remaining = dmg;

    // Absorb by Guarded
    const guarded = target.statuses.get('guarded');
    if (guarded > 0) {
      const absorbed = Math.min(guarded, remaining);
      target.statuses.remove('guarded', absorbed);
      remaining -= absorbed;
    }

    // Absorb by Sympathy Armor (boss buff)
    const sympathy = target.statuses.get('sympathy-armor');
    if (sympathy > 0) {
      const absorbed = Math.min(sympathy, remaining);
      target.statuses.remove('sympathy-armor', absorbed);
      remaining -= absorbed;
    }

    // Reduce by Lawyer Present
    const lawyer = target.statuses.get('lawyer-present');
    if (lawyer > 0) {
      remaining = Math.max(0, remaining - lawyer);
    }

    // Apply to Composure
    target.composure = Math.max(0, target.composure - remaining);
    return remaining;
  },

  /** Rapport pipeline: base + Thick Skin */
  _calcRapport(base, reporter) {
    let block = base;
    block += reporter.statuses.get('thick-skin');
    return Math.max(0, block);
  },
};

export default CardEffects;
