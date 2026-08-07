/* StatusManager — buff/debuff system per entity */

// Status types:
// intensity — stacks accumulate (On a Roll, Thick Skin, Flustered, etc.)
// duration  — tick down each turn
// counter   — triggered by specific events

const STATUS_DEFS = {
  // Reporter buffs
  'on-a-roll':      { type: 'intensity', name: 'On a Roll', icon: '📈', desc: '+{n} Pressure per hit' },
  'thick-skin':     { type: 'intensity', name: 'Thick Skin', icon: '🛡️', desc: '+{n} Rapport per block card' },
  'adrenaline':     { type: 'intensity', name: 'Adrenaline', icon: '⚡', desc: 'Draw {n} extra cards next turn' },
  'notoriety':      { type: 'intensity', name: 'Notoriety', icon: '📰', desc: '+{n} Pressure to ALL subjects' },
  'press-shield':   { type: 'duration',  name: 'Press Shield', icon: '🔰', desc: 'Negate next {n} attacks' },
  'persistent-narrative': { type: 'intensity', name: 'Persistent Narrative', icon: '📝', desc: '{n} Pressure at end of turn' },

  // Subject debuffs
  'flustered':      { type: 'duration', name: 'Flustered', icon: '😰', desc: 'Take 50% more Pressure for {n} turns' },
  'rattled':        { type: 'duration', name: 'Rattled', icon: '😨', desc: 'Deal 25% less damage for {n} turns' },
  'cornered':       { type: 'duration',  name: 'Cornered', icon: '🔒', desc: 'Cannot gain Guarded for {n} turns' },
  'contradicted':   { type: 'intensity', name: 'Contradicted', icon: '❌', desc: 'Take {n} damage when buffing' },
  'off-message':    { type: 'duration',  name: 'Off Message', icon: '🤐', desc: 'Cannot attack for {n} turns' },

  // Subject buffs
  'guarded':        { type: 'intensity', name: 'Guarded', icon: '🛡️', desc: 'Absorb {n} Pressure' },
  'lawyer-present': { type: 'intensity', name: 'Lawyer Present', icon: '⚖️', desc: 'Reduce Pressure by {n}' },
  'sympathy-armor': { type: 'intensity', name: 'Sympathy Armor', icon: '💔', desc: 'Absorb {n} Pressure (boss)' },
  'pr-spin':        { type: 'intensity', name: 'PR Spin', icon: '🔄', desc: 'Gain {n} Composure each turn' },
};

export default class StatusManager {
  constructor() {
    this.statuses = {}; // { statusId: stacks }
  }

  add(statusId, stacks = 1) {
    const def = STATUS_DEFS[statusId];
    if (!def) { console.warn(`Unknown status: ${statusId}`); return; }
    this.statuses[statusId] = (this.statuses[statusId] || 0) + stacks;
  }

  remove(statusId, stacks = Infinity) {
    if (!this.statuses[statusId]) return;
    this.statuses[statusId] -= stacks;
    if (this.statuses[statusId] <= 0) {
      delete this.statuses[statusId];
    }
  }

  get(statusId) {
    return this.statuses[statusId] || 0;
  }

  has(statusId) {
    return (this.statuses[statusId] || 0) > 0;
  }

  /** Tick at end of turn — decrement duration statuses */
  tickTurnEnd() {
    for (const [id, stacks] of Object.entries(this.statuses)) {
      const def = STATUS_DEFS[id];
      if (def?.type === 'duration') {
        this.statuses[id] = stacks - 1;
        if (this.statuses[id] <= 0) delete this.statuses[id];
      }
    }
  }

  /** Clear all statuses (combat end) */
  clear() {
    this.statuses = {};
  }

  /** Get all active statuses as array of { id, stacks, ...def } */
  getAll() {
    return Object.entries(this.statuses).map(([id, stacks]) => ({
      id, stacks, ...(STATUS_DEFS[id] || {}),
    }));
  }

  static getDef(statusId) {
    return STATUS_DEFS[statusId];
  }
}
