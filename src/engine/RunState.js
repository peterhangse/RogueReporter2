/* RunState — persistent state for a single run */
import { BALANCE } from '../constants.js';
import RelicManager from './RelicManager.js';

const STORAGE_KEY = 'the-scoop-save';

// Veteran Reporter starter deck
const STARTER_DECK = [
  // 5 × Routine Question
  ...Array(5).fill(null).map((_, i) => ({
    id: `starter-rq-${i}`, cardId: 'routine-question', upgraded: false,
  })),
  // 4 × Active Listening
  ...Array(4).fill(null).map((_, i) => ({
    id: `starter-al-${i}`, cardId: 'active-listening', upgraded: false,
  })),
  // 1 × Confidence Boost
  { id: 'starter-cb-0', cardId: 'confidence-boost', upgraded: false },
];

let _state = null;

const RunState = {
  fresh() {
    _state = {
      act: 1,
      floor: 0,
      credibility: BALANCE.STARTING_CREDIBILITY,
      maxCredibility: BALANCE.MAX_CREDIBILITY,
      pressPasses: 99,
      deck: STARTER_DECK.map(c => ({ ...c })),
      relics: [{ id: 'branschrykte', name: 'Branschrykte', icon: '📰',
        description: 'Heal 6 Credibility after each interview.',
        hook: 'onInterviewWin', effect: { type: 'heal', value: 6 } }],
      consumables: [],
      currentMap: null,
      completedNodes: [],
      currentNode: null,
      cardRemoveCount: 0,
      score: 0,
    };
    this.save();
    RelicManager.resetInterview();  // Reset static relic counters on new run
    return _state;
  },

  get() {
    if (!_state) this.fresh();
    return _state;
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch {}
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { _state = JSON.parse(raw); return _state; }
    } catch {}
    return this.fresh();
  },

  hasSave() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  },

  clearSave() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    _state = null;
  },

  // ─── Mutations ───

  takeDamage(amount) {
    _state.credibility = Math.max(0, _state.credibility - amount);
    this.save();
    return _state.credibility;
  },

  heal(amount) {
    _state.credibility = Math.min(_state.maxCredibility, _state.credibility + amount);
    this.save();
    return _state.credibility;
  },

  addCard(deckEntry) {
    if (_state.deck.length >= 40) return false; // Deck size cap
    _state.deck.push(deckEntry);
    this.save();
    return true;
  },

  removeCard(entryId) {
    _state.deck = _state.deck.filter(c => c.id !== entryId);
    this.save();
  },

  upgradeCard(entryId) {
    const entry = _state.deck.find(c => c.id === entryId);
    if (entry) entry.upgraded = true;
    this.save();
  },

  addRelic(relic) {
    if (!_state.relics.find(r => r.id === relic.id)) {
      _state.relics.push(relic);
      // Trigger onPickup effects immediately (e.g., Pulitzerprisnominering)
      if (relic.hook === 'onPickup' && relic.effect) {
        if (relic.effect.type === 'max-credibility') {
          _state.maxCredibility += relic.effect.value;
          _state.credibility = _state.maxCredibility;
        }
      }
      this.save();
    }
  },

  hasRelic(relicId) {
    return _state.relics.some(r => r.id === relicId);
  },

  addConsumable(consumable) {
    if (_state.consumables.length < BALANCE.MAX_CONSUMABLES) {
      _state.consumables.push(consumable);
      this.save();
      return true;
    }
    return false;
  },

  useConsumable(index) {
    const c = _state.consumables.splice(index, 1)[0];
    this.save();
    return c;
  },

  addPressPasses(amount) {
    _state.pressPasses += amount;
    this.save();
  },

  spendPressPasses(amount) {
    if (_state.pressPasses < amount) return false;
    _state.pressPasses -= amount;
    this.save();
    return true;
  },

  completeNode(nodeId) {
    if (!_state.completedNodes.includes(nodeId)) {
      _state.completedNodes.push(nodeId);
    }
    _state.floor = Math.max(_state.floor, 
      _state.currentMap?.nodes.find(n => n.id === nodeId)?.row + 1 || _state.floor);
    this.save();
  },

  advanceAct() {
    _state.act++;
    _state.floor = 0;
    _state.currentMap = null;
    _state.completedNodes = [];
    _state.currentNode = null;
    // Full heal between acts
    _state.credibility = _state.maxCredibility;
    this.save();
  },
};

export default RunState;
