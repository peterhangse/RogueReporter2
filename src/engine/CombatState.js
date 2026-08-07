/* CombatState — interview-local state (one fight) */
import { BALANCE } from '../constants.js';
import DeckManager from './DeckManager.js';
import StatusManager from './StatusManager.js';
import IntentAI from './IntentAI.js';
import CardEffects from './CardEffects.js';
import RelicManager from './RelicManager.js';

export default class CombatState {
  /**
   * @param {object[]} subjectDefs — array of subject definitions from JSON
   * @param {object} run — RunState.get()
   * @param {object[]} cardDefs — all card definitions from JSON
   */
  constructor(subjectDefs, run, cardDefs) {
    this.turn = 0;
    this.isPlayerTurn = true;
    this.cardDefs = cardDefs;

    // Reporter state
    this.reporter = {
      credibility: run.credibility,
      maxCredibility: run.maxCredibility,
      focus: BALANCE.FOCUS_PER_TURN,
      maxFocus: BALANCE.FOCUS_PER_TURN,
      rapport: 0,
      statuses: new StatusManager(),
    };

    // Subjects (scale composure by act)
    const actScale = 1 + (run.act - 1) * 0.15; // Act 1: 1x, Act 2: 1.15x, Act 3: 1.3x
    this.subjects = subjectDefs.map(def => {
      const baseComposure = def.composure || 40;
      const composure = Math.round(baseComposure * actScale);
      return {
        def,
        name: def.name,
        composure,
        maxComposure: composure,
        statuses: new StatusManager(),
        currentIntent: null,
        lastIntent: null,
        consecutiveCount: 0,
        turnCount: 0,
      };
    });

    // Deck
    this.deckManager = new DeckManager();
    this.deckManager.init(run.deck, cardDefs);
    this.deckManager._combat = this;

    // Active angles (power cards in play)
    this.activeAngles = [];
    this._spinCounter = 0;
  }

  /** Start of player turn */
  startPlayerTurn() {
    this.turn++;
    this.isPlayerTurn = true;

    // Reset focus
    this.reporter.focus = this.reporter.maxFocus;

    // Clear rapport from last turn
    this.reporter.rapport = 0;

    // Tick reporter duration statuses
    this.reporter.statuses.tickTurnEnd();

    // Draw cards
    let drawCount = BALANCE.CARDS_PER_DRAW;
    drawCount += this.reporter.statuses.get('adrenaline');
    // Clear adrenaline after applying
    this.reporter.statuses.remove('adrenaline');

    this.deckManager.draw(drawCount);

    // Trigger onTurnStart relic hooks
    RelicManager.trigger('onTurnStart', this);

    // Choose intents for all living subjects (shown to player)
    for (const s of this.subjects) {
      if (s.composure > 0 && !s.currentIntent) {
        s.currentIntent = IntentAI.getIntent(s, this);
      }
    }
  }

  /** Player plays a card from hand */
  playCard(handIndex, targetIdx = 0) {
    const card = this.deckManager.hand[handIndex];
    if (!card) return null;

    // Validate target — default to first living subject
    const living = this.subjects.map((s, i) => ({ s, i })).filter(x => x.s.composure > 0);
    if (living.length === 0) return null;
    if (!this.subjects[targetIdx] || this.subjects[targetIdx].composure <= 0) {
      targetIdx = living[0].i;
    }

    // Check focus
    const cost = card.keywords?.includes('x-cost') ? this.reporter.focus : card.focusCost;
    if (cost > this.reporter.focus) return null;

    // Check if card is playable (Spin and Lawsuit cards are not)
    if (card.type === 'spin' || card.type === 'lawsuit') return null;

    // Spend focus
    this.reporter.focus -= cost;

    // Remove from hand before resolving (CardEffects handles discard/exhaust)
    this.deckManager.hand = this.deckManager.hand.filter((_, i) => i !== handIndex);

    // Trigger onPressureCardPlayed for pressure-type cards
    if (card.type === 'pressure') {
      RelicManager.trigger('onPressureCardPlayed', this, { card });
    }

    // Resolve effects
    const result = CardEffects.resolve(card, this, targetIdx);
    result.card = card;

    return result;
  }

  /** End player turn — discard hand, apply end-of-turn effects, execute subject turns */
  endPlayerTurn() {
    this.isPlayerTurn = false;

    // Persistent Narrative damage at end of turn
    const pn = this.reporter.statuses.get('persistent-narrative');
    if (pn > 0) {
      for (const s of this.subjects) {
        if (s.composure > 0) {
          CardEffects._applyPressure(pn, s);
        }
      }
    }

    // Discard remaining hand (handles Retain + Ethereal)
    this.deckManager.discardHand();

    // Execute subject turns
    const subjectActions = this._executeSubjectTurns();

    // Tick subject statuses
    for (const s of this.subjects) {
      if (s.composure > 0) {
        s.statuses.tickTurnEnd();
        s.turnCount++;
      }
    }

    // Choose next intents for living subjects
    for (const s of this.subjects) {
      if (s.composure > 0) {
        s.currentIntent = IntentAI.getIntent(s, this);
      }
    }

    return subjectActions;
  }

  _executeSubjectTurns() {
    const actions = [];

    // Clear previous turn's Guarded before subjects act (like StS block clearing)
    for (const s of this.subjects) {
      if (s.composure > 0) s.statuses.remove('guarded');
    }

    for (const s of this.subjects) {
      if (s.composure <= 0) continue;
      const intent = s.currentIntent;
      if (!intent) continue;

      // Check Off Message (cannot attack)
      if (intent.type === 'ATTACK' && s.statuses.has('off-message')) {
        actions.push({ subject: s, type: 'BLOCKED', label: 'Off Message!' });
        s.currentIntent = null;
        continue;
      }

      switch (intent.type) {
        case 'ATTACK': {
          let dmg = intent.value;
          const hits = intent.hits || 1;
          for (let h = 0; h < hits; h++) {
            // Rattled on subject reduces their damage output
            if (s.statuses.has('rattled')) {
              dmg = Math.floor(dmg * BALANCE.RATTLED_MULTIPLIER);
            }
            // Flustered on reporter increases damage taken
            if (this.reporter.statuses.has('flustered')) {
              dmg = Math.floor(dmg * BALANCE.FLUSTERED_MULTIPLIER);
            }
            // Press Shield negates
            if (this.reporter.statuses.has('press-shield')) {
              this.reporter.statuses.remove('press-shield', 1);
              actions.push({ subject: s, type: 'BLOCKED_BY_SHIELD' });
              continue;
            }
            // Absorb by Rapport
            let remaining = dmg;
            if (this.reporter.rapport > 0) {
              const absorbed = Math.min(this.reporter.rapport, remaining);
              this.reporter.rapport -= absorbed;
              remaining -= absorbed;
            }
            // Apply to Credibility
            if (remaining > 0) {
              this.reporter.credibility = Math.max(0, this.reporter.credibility - remaining);
              // Trigger onDamageTaken relic hooks
              RelicManager.trigger('onDamageTaken', this, { damage: remaining });
            }
            actions.push({ subject: s, type: 'ATTACK', value: dmg, damageToCredibility: remaining });
          }
          break;
        }
        case 'GUARD': {
          // Cornered prevents gaining Guarded
          if (!s.statuses.has('cornered')) {
            s.statuses.add('guarded', intent.value);
          }
          // If subject has Contradicted, take damage when buffing
          const contradicted = s.statuses.get('contradicted');
          if (contradicted > 0) {
            s.composure = Math.max(0, s.composure - contradicted);
          }
          actions.push({ subject: s, type: 'GUARD', value: intent.value, blocked: s.statuses.has('cornered') });
          break;
        }
        case 'BUFF': {
          if (intent.status) {
            s.statuses.add(intent.status, intent.stacks || intent.value);
          }
          // Contradicted triggers
          const contradicted = s.statuses.get('contradicted');
          if (contradicted > 0) {
            s.composure = Math.max(0, s.composure - contradicted);
          }
          actions.push({ subject: s, type: 'BUFF', status: intent.status, value: intent.stacks || intent.value });
          break;
        }
        case 'DEBUFF': {
          if (intent.status) {
            this.reporter.statuses.add(intent.status, intent.stacks || intent.value);
          }
          actions.push({ subject: s, type: 'DEBUFF', status: intent.status, value: intent.stacks || intent.value });
          break;
        }
        case 'SPIN': {
          // Add Spin cards to discard pile
          const spinCard = this.cardDefs.find(c => c.id === 'spin');
          if (spinCard) {
            for (let i = 0; i < (intent.value || 1); i++) {
              this.deckManager.discardPile.push({
                ...spinCard,
                instanceId: `spin-${++this._spinCounter}-${Math.random().toString(36).slice(2, 6)}`,
                upgraded: false,
              });
            }
          }
          actions.push({ subject: s, type: 'SPIN', value: intent.value || 1 });
          break;
        }
        case 'NO_COMMENT': {
          // Subject does nothing
          actions.push({ subject: s, type: 'NO_COMMENT' });
          break;
        }
      }

      // PR Spin healing
      const prSpin = s.statuses.get('pr-spin');
      if (prSpin > 0) {
        s.composure = Math.min(s.maxComposure, s.composure + prSpin);
      }

      s.currentIntent = null;
    }

    return actions;
  }

  /** Check win: all subjects at 0 composure */
  checkWin() {
    return this.subjects.every(s => s.composure <= 0);
  }

  /** Check lose: reporter credibility at 0 */
  checkLose() {
    return this.reporter.credibility <= 0;
  }

  /** Get subject at index */
  getSubject(idx) {
    return this.subjects[idx] || null;
  }

  /** Count living subjects */
  livingSubjects() {
    return this.subjects.filter(s => s.composure > 0).length;
  }
}
