/* IntentAI — subject behavior + anti-repetition */

const IntentAI = {
  /**
   * Choose next intent for a subject.
   * @param {object} subject — { def, composure, maxComposure, statuses, lastIntent, consecutiveCount, turnCount }
   * @param {object} combat — CombatState
   * @returns {{ type, value, hits?, icon, label }}
   */
  getIntent(subject, combat) {
    const def = subject.def;

    // Boss/elite phase check (bosses + elites with phases)
    if (def.phases) {
      return this._getBossIntent(subject, combat);
    }

    // Use behavior pattern from subject definition
    const behavior = def.behavior || 'rotation';
    const moves = def.moves || [];

    if (moves.length === 0) {
      return { type: 'ATTACK', value: 6, icon: '🎤', label: 'Pressure 6' };
    }

    let chosen;
    if (behavior === 'rotation') {
      chosen = this._rotationPick(subject, moves);
    } else {
      chosen = this._weightedPick(subject, moves);
    }

    // Anti-repetition: force change after 2 consecutive same intents
    if (subject.lastIntent === chosen.type && subject.consecutiveCount >= 2) {
      const alternatives = moves.filter(m => m.type !== chosen.type);
      if (alternatives.length > 0) {
        chosen = alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    }

    // Anti-oscillation: detect A-B-A-B pattern
    const hist = subject.intentHistory || [];
    if (hist.length >= 3 && chosen.type === hist[hist.length - 2] && hist[hist.length - 1] === hist[hist.length - 3]) {
      const alternatives = moves.filter(m => m.type !== chosen.type && m.type !== hist[hist.length - 1]);
      if (alternatives.length > 0) {
        chosen = alternatives[Math.floor(Math.random() * alternatives.length)];
      }
    }

    // Track
    if (subject.lastIntent === chosen.type) {
      subject.consecutiveCount++;
    } else {
      subject.consecutiveCount = 1;
    }
    subject.lastIntent = chosen.type;
    if (!subject.intentHistory) subject.intentHistory = [];
    subject.intentHistory.push(chosen.type);
    if (subject.intentHistory.length > 6) subject.intentHistory.shift();

    return this._buildIntent(chosen, subject);
  },

  _rotationPick(subject, moves) {
    const idx = (subject.turnCount || 0) % moves.length;
    return moves[idx];
  },

  _weightedPick(subject, moves) {
    const totalWeight = moves.reduce((s, m) => s + (m.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const m of moves) {
      roll -= (m.weight || 1);
      if (roll <= 0) return m;
    }
    return moves[moves.length - 1];
  },

  _getBossIntent(subject, combat) {
    const def = subject.def;
    const hpPercent = subject.composure / subject.maxComposure;

    // Find current phase based on composure threshold
    let currentPhase = def.phases[0];
    for (const phase of def.phases) {
      if (hpPercent <= (phase.threshold || 1)) {
        currentPhase = phase;
      }
    }

    // Special turn-based moves (e.g., Borgmästaren's Presskonferens on turn 7)
    if (def.specialMoves) {
      for (const sm of def.specialMoves) {
        if (sm.trigger === 'turn' && subject.turnCount === sm.turnNumber) {
          return this._buildIntent(sm.move, subject);
        }
      }
    }

    // Pick from phase moves
    const moves = currentPhase.moves || [];
    if (moves.length === 0) {
      return { type: 'ATTACK', value: 10, icon: '🎤', label: 'Pressure 10' };
    }

    const chosen = this._weightedPick(subject, moves);
    return this._buildIntent(chosen, subject);
  },

  _buildIntent(move, subject) {
    const iconMap = {
      ATTACK: '🎤', GUARD: '🛡️', BUFF: '📈', DEBUFF: '🌀',
      SPIN: '📰', SUMMON: '📞', NO_COMMENT: '🤐', PHASE_SHIFT: '⚡',
    };
    return {
      type: move.type,
      value: move.value || 0,
      hits: move.hits || 1,
      status: move.status || null,
      stacks: move.stacks || 0,
      icon: iconMap[move.type] || '❓',
      label: move.label || move.type,
    };
  },

  /** Peek at what the next intent would be without modifying state */
  peekNextIntent(subject, combat) {
    const def = subject.def;
    if (def.phases) {
      const hpPercent = subject.composure / subject.maxComposure;
      let currentPhase = def.phases[0];
      for (const phase of def.phases) {
        if (hpPercent <= (phase.threshold || 1)) currentPhase = phase;
      }
      const moves = currentPhase.moves || [];
      if (moves.length === 0) return { icon: '❓', label: '???' };
      const chosen = this._weightedPick(subject, moves);
      return this._buildIntent(chosen, subject);
    }
    const moves = def.moves || [];
    if (moves.length === 0) return { icon: '❓', label: '???' };
    const behavior = def.behavior || 'rotation';
    if (behavior === 'rotation') {
      const idx = ((subject.turnCount || 0) + 1) % moves.length;
      return this._buildIntent(moves[idx], subject);
    }
    const chosen = this._weightedPick(subject, moves);
    return this._buildIntent(chosen, subject);
  },
};

export default IntentAI;
