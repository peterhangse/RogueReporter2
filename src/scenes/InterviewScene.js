/* InterviewScene — turn-based card combat (THE core scene) */
import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, BALANCE, CARD_TYPE_COLORS, INTENT_COLORS, isMobile } from '../constants.js';
import CombatState from '../engine/CombatState.js';
import RunState from '../engine/RunState.js';
import RelicManager from '../engine/RelicManager.js';
import StatusManager from '../engine/StatusManager.js';
import IntentAI from '../engine/IntentAI.js';

export default class InterviewScene extends Phaser.Scene {
  constructor() { super('InterviewScene'); }

  init(data) {
    this.nodeData = data?.node || {};
  }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);

    const run = RunState.get();
    const cardDefs = this.cache.json.get('cards-veteran') || [];

    // Determine which subjects to fight
    const subjectDefs = this._pickSubjects(run);

    // Create combat state
    this.combat = new CombatState(subjectDefs, run, cardDefs);

    // Trigger interview-start relic hooks
    RelicManager.resetInterview();
    RelicManager.trigger('onInterviewStart', this.combat);

    // UI containers
    this.handCards = [];
    this.subjectDisplays = [];
    this.tooltip = null;     // status tooltip overlay
    this.cardDetail = null;  // card hover detail panel
    this.pileViewer = null;  // deck/discard/exhaust viewer
    this._playLocked = false; // prevent double-click race

    // Draw background
    this._drawBackground();

    // Create subject displays
    this._createSubjectDisplays();

    // Create reporter HUD
    this._createReporterHUD();

    // Create pile counters
    this._createPileCounters();

    // Create consumable slots
    this._createConsumableSlots();

    // Create END TURN button
    this._createEndTurnButton();

    // Drag drop-zone indicator (hidden until card is dragged) — desktop only
    this._dropZone = this.add.graphics();
    const dzH = isMobile() ? this._dividerY : 350;
    this._dropZone.fillStyle(0xF5C518, 0.08);
    this._dropZone.fillRect(0, 0, SIZES.W, dzH);
    this._dropZone.lineStyle(1.5, 0xF5C518, 0.25);
    this._dropZone.lineBetween(0, dzH, SIZES.W, dzH);
    this._dropZone.setVisible(false).setDepth(1);

    // Start first turn
    this.combat.startPlayerTurn();
    this._refreshUI();
  }

  _pickSubjects(run) {
    const actKey = `subjects-act${run.act}`;
    const allSubjects = this.cache.json.get(actKey) || [];
    const nodeType = this.nodeData.type || 'INTERVIEW';

    let pool;
    if (nodeType === 'BOSS') {
      pool = allSubjects.filter(s => s.tier === 'boss');
    } else if (nodeType === 'ELITE') {
      pool = allSubjects.filter(s => s.tier === 'elite');
    } else {
      pool = allSubjects.filter(s => s.tier === 'normal');
    }

    if (pool.length === 0) {
      // Fallback: generate a basic subject
      return [{ name: 'Stadstjänstemannen', composure: 40 + run.act * 10, tier: 'normal',
        behavior: 'rotation', moves: [
          { type: 'ATTACK', value: 6, label: 'Deflect 6' },
          { type: 'GUARD', value: 8, label: 'Guard 8' },
        ]}];
    }

    // Pick one random subject (or multi-subject for boss with adds)
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // Some subjects bring adds
    if (chosen.adds) {
      const adds = chosen.adds.map(addId => allSubjects.find(s => s.id === addId)).filter(Boolean);
      return [chosen, ...adds];
    }

    return [chosen];
  }

  _drawBackground() {
    const M = isMobile();
    // Subtle grid lines (notebook paper feel)
    const g = this.add.graphics();
    g.lineStyle(1, 0x1A1208, 0.08);
    for (let y = 0; y < SIZES.H; y += 22) {
      g.moveTo(0, y); g.lineTo(SIZES.W, y);
    }
    g.strokePath();

    // Divider line between subject area and hand area
    const divY = M ? 320 : 380;
    g.lineStyle(1, 0xF5C518, 0.15);
    g.moveTo(30, divY);
    g.lineTo(SIZES.W - 30, divY);
    g.strokePath();
    this._dividerY = divY;
  }

  _createSubjectDisplays() {
    const M = isMobile();
    const subjects = this.combat.subjects;
    const spacing = M ? 200 : 300;
    const totalW = Math.min(subjects.length * spacing, SIZES.W - 80);
    const startX = (SIZES.W - totalW) / 2 + (M ? 100 : 150);

    subjects.forEach((s, i) => {
      const x = subjects.length === 1 ? SIZES.W / 2 : startX + i * spacing;
      const y = SIZES.SUBJECT_Y;
      const nameSz = M ? '18px' : '16px';
      const compSz = M ? '13px' : '12px';
      const intentSz = M ? '28px' : '24px';
      const intentLblSz = M ? '13px' : '12px';

      const display = {
        subject: s,
        x, y,
        nameText: this.add.text(x, y - 30, s.name, {
          fontFamily: 'Playfair Display', fontSize: nameSz, color: COLORS.PAPER, fontStyle: 'bold'
        }).setOrigin(0.5),

        // Composure bar background
        barBg: this.add.graphics(),
        barFill: this.add.graphics(),
        composureText: this.add.text(x, y + 2, '', {
          fontFamily: 'Share Tech Mono', fontSize: compSz, color: '#FFF'
        }).setOrigin(0.5),

        // Intent display
        intentIcon: this.add.text(x, y + 40, '', { fontSize: intentSz }).setOrigin(0.5),
        intentLabel: this.add.text(x, y + 62, '', {
          fontFamily: 'Share Tech Mono', fontSize: intentLblSz, color: '#FFF'
        }).setOrigin(0.5),

        // Next intent (Linsteleskop relic)
        nextIntentIcon: this.add.text(x + 50, y + 44, '', { fontSize: '14px' }).setOrigin(0.5).setAlpha(0.45),
        nextIntentLabel: this.add.text(x + 50, y + 58, '', {
          fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888'
        }).setOrigin(0.5).setAlpha(0.45),

        // Status icons row
        statusContainer: this.add.container(x - 60, y + 80),

        // Guarded shield
        guardedText: this.add.text(x + 80, y - 5, '', {
          fontFamily: 'Share Tech Mono', fontSize: '13px', color: '#88BBEE'
        }).setOrigin(0, 0.5),
      };

      // Draw bar background
      const barW = M ? 170 : 190, barH = M ? 20 : 18;
      display.barBg.fillStyle(0x1A1208, 0.8);
      display.barBg.fillRoundedRect(x - barW / 2, y - barH / 2, barW, barH, 3);
      display.barBg.lineStyle(1, 0x555555, 0.5);
      display.barBg.strokeRoundedRect(x - barW / 2, y - barH / 2, barW, barH, 3);
      display._barW = barW; display._barH = barH;

      // Target selection zone (click subject to target them)
      if (subjects.length > 1) {
        const zW = M ? 160 : 180, zH = M ? 120 : 100;
        const tZone = this.add.zone(x, y, zW, zH).setInteractive({ useHandCursor: true });
        tZone.on('pointerup', () => {
          this._selectedTarget = i;
          this._updateTargetIndicator();
        });
        display.targetZone = tZone;
      }

      this.subjectDisplays.push(display);
    });

    // Target indicator
    this._selectedTarget = 0;
    if (subjects.length > 1) {
      this.targetIndicator = this.add.text(0, 0, '▼ TARGET', {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: COLORS.YELLOW
      }).setOrigin(0.5).setDepth(10);
      this._updateTargetIndicator();
    }
  }

  _updateTargetIndicator() {
    if (!this.targetIndicator) return;
    const d = this.subjectDisplays[this._selectedTarget];
    if (d) {
      this.targetIndicator.setPosition(d.x, d.y - 48);
    }
  }

  _updateSubjectDisplays() {
    for (const d of this.subjectDisplays) {
      const s = d.subject;
      const barW = d._barW || 190, barH = d._barH || 18;
      const pct = Math.max(0, s.composure / s.maxComposure);

      // Update bar
      d.barFill.clear();
      const color = pct > 0.5 ? 0x44CC44 : pct > 0.25 ? 0xCC8822 : 0xCC2222;
      d.barFill.fillStyle(color, 0.9);
      d.barFill.fillRoundedRect(d.x - barW / 2 + 1, d.y - barH / 2 + 1, (barW - 2) * pct, barH - 2, 2);

      // Composure text
      d.composureText.setText(`${Math.ceil(s.composure)}/${s.maxComposure}`);

      // Intent
      const intent = s.currentIntent;
      if (intent && s.composure > 0) {
        d.intentIcon.setText(intent.icon);
        const intentColor = INTENT_COLORS[intent.type] || '#FFF';
        let label = intent.label || intent.type;
        if (intent.type === 'ATTACK') {
          if (intent.hits > 1) {
            label = `${intent.value} × ${intent.hits} hits`;
          } else {
            label = `${intent.value}`;
          }
        } else if (intent.type === 'GUARD') {
          label = `🛡️ ${intent.value}`;
        }
        d.intentLabel.setText(label).setColor(intentColor);
      } else {
        d.intentIcon.setText(s.composure > 0 ? '' : '💀');
        d.intentLabel.setText(s.composure > 0 ? '' : 'Cracked');
      }

      // Guarded
      const guarded = s.statuses.get('guarded');
      d.guardedText.setText(guarded > 0 ? `🛡️ ${guarded}` : '');

      // Statuses
      d.statusContainer.removeAll(true);
      const allStatuses = s.statuses.getAll();
      allStatuses.forEach((st, idx) => {
        const icon = this.add.text(idx * 34, 0, `${st.icon}${st.stacks}`, {
          fontSize: '14px', fontFamily: 'Share Tech Mono', color: '#DDD'
        }).setInteractive({ useHandCursor: true });
        icon.on('pointerover', (pointer) => {
          const desc = (st.desc || '').replace('{n}', st.stacks);
          this._showTooltip(pointer.worldX, pointer.worldY - 30, `${st.name}: ${desc}`);
        });
        icon.on('pointerout', () => this._hideTooltip());
        d.statusContainer.add(icon);
      });

      // Linsteleskop: show next intent preview
      const hasLins = RunState.get().relics.some(r => r.id === 'linsteleskop');
      if (hasLins && s.composure > 0) {
        const next = IntentAI.peekNextIntent(s, this.combat);
        d.nextIntentIcon.setText(`→${next.icon}`);
        d.nextIntentLabel.setText(next.type === 'ATTACK' ? `${next.value}` : next.label || next.type);
      } else {
        d.nextIntentIcon.setText('');
        d.nextIntentLabel.setText('');
      }
    }
  }

  _createReporterHUD() {
    const M = isMobile();
    const r = this.combat.reporter;

    if (M) {
      // Mobile: full-width HUD strip at top
      const hudBg = this.add.graphics();
      hudBg.fillStyle(0x0D0B08, 0.85);
      hudBg.fillRoundedRect(0, 0, SIZES.W, 52, 0);
      hudBg.setDepth(5);

      this.credText = this.add.text(15, 14, '', {
        fontFamily: 'Share Tech Mono', fontSize: '16px', color: COLORS.RED
      }).setOrigin(0, 0).setDepth(6);

      this.rapportText = this.add.text(15, 34, '', {
        fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#88BBEE'
      }).setOrigin(0, 0).setDepth(6);

      // Focus in center-right of HUD
      this.focusText = this.add.text(SIZES.W - 60, 10, '', {
        fontFamily: 'Playfair Display', fontSize: '26px', color: COLORS.YELLOW, fontStyle: 'bold'
      }).setOrigin(0.5, 0).setDepth(6);

      this.focusLabel = this.add.text(SIZES.W - 60, 36, 'FOCUS', {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888'
      }).setOrigin(0.5, 0).setDepth(6);

      // Reporter statuses
      this.reporterStatusContainer = this.add.container(SIZES.W / 2 - 50, 340);
    } else {
      // Desktop: HUD background strip (top right)
      const hudBg = this.add.graphics();
      hudBg.fillStyle(0x0D0B08, 0.7);
      hudBg.fillRoundedRect(SIZES.W - 175, 4, 170, 48, 6);
      hudBg.setDepth(5);

      this.credText = this.add.text(SIZES.W - 15, 10, '', {
        fontFamily: 'Share Tech Mono', fontSize: '16px', color: COLORS.RED
      }).setOrigin(1, 0).setDepth(6);

      this.rapportText = this.add.text(SIZES.W - 15, 30, '', {
        fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#88BBEE'
      }).setOrigin(1, 0).setDepth(6);

      // Focus orbs — right side, middle
      this.focusText = this.add.text(SIZES.W - 30, 420, '', {
        fontFamily: 'Playfair Display', fontSize: '28px', color: COLORS.YELLOW, fontStyle: 'bold'
      }).setOrigin(0.5);

      this.focusLabel = this.add.text(SIZES.W - 30, 448, 'FOCUS', {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888'
      }).setOrigin(0.5);

      // Reporter statuses
      this.reporterStatusContainer = this.add.container(SIZES.W - 200, 56);
    }
  }

  _updateReporterHUD() {
    const r = this.combat.reporter;
    this.credText.setText(`❤️ ${r.credibility}/${r.maxCredibility}`);
    this.rapportText.setText(r.rapport > 0 ? `🛡️ ${r.rapport}` : '');
    this.focusText.setText(`${r.focus}/${r.maxFocus}`);

    // Reporter statuses
    this.reporterStatusContainer.removeAll(true);
    r.statuses.getAll().forEach((st, idx) => {
      const icon = this.add.text(idx * 36, 0, `${st.icon}${st.stacks}`, {
        fontSize: '14px', fontFamily: 'Share Tech Mono', color: '#DDD'
      }).setInteractive({ useHandCursor: true });
      icon.on('pointerover', (pointer) => {
        const desc = (st.desc || '').replace('{n}', st.stacks);
        this._showTooltip(pointer.worldX, pointer.worldY - 30, `${st.name}: ${desc}`);
      });
      icon.on('pointerout', () => this._hideTooltip());
      this.reporterStatusContainer.add(icon);
    });
  }

  _createPileCounters() {
    const M = isMobile();
    const pileY = M ? SIZES.H - 50 : SIZES.H - 30;
    const discY = M ? SIZES.H - 28 : SIZES.H - 12;
    const exhX = M ? 140 : 120;
    const pileSz = M ? '13px' : '12px';

    // Draw pile — bottom left
    this.drawPileText = this.add.text(30, pileY, '', {
      fontFamily: 'Share Tech Mono', fontSize: pileSz, color: COLORS.PAPER
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.drawPileText.on('pointerup', () => {
      const sorted = [...this.combat.deckManager.drawPile].sort((a, b) => a.name.localeCompare(b.name));
      this._showPileViewer('DRAW PILE', sorted);
    });

    // Discard pile
    this.discardPileText = this.add.text(30, discY, '', {
      fontFamily: 'Share Tech Mono', fontSize: pileSz, color: '#888'
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.discardPileText.on('pointerup', () => {
      this._showPileViewer('DISCARD PILE', this.combat.deckManager.discardPile);
    });

    // Exhaust
    this.exhaustPileText = this.add.text(exhX, discY, '', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '11px' : '10px', color: '#555'
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    this.exhaustPileText.on('pointerup', () => {
      this._showPileViewer('EXHAUST PILE', this.combat.deckManager.exhaustPile);
    });
  }

  _updatePileCounters() {
    const dm = this.combat.deckManager;
    this.drawPileText.setText(`📇 Draw: ${dm.getDrawSize()}`);
    this.discardPileText.setText(`📤 Discard: ${dm.getDiscardSize()}`);
    this.exhaustPileText.setText(`🔥 Exhaust: ${dm.getExhaustSize()}`);
  }

  _createConsumableSlots() {
    const M = isMobile();
    this.consumableSlots = [];
    const slotY = M ? 345 : 415;
    const labelY = M ? 332 : 404;
    const slotSize = M ? '24px' : '20px';
    const slotGap = M ? 44 : 36;

    // Label
    this.add.text(30, labelY, 'ITEMS', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '10px' : '8px', color: '#666'
    });
    for (let i = 0; i < BALANCE.MAX_CONSUMABLES; i++) {
      const x = 30 + i * slotGap;
      const y = slotY;
      const slot = this.add.text(x, y, '◻️', { fontSize: slotSize })
        .setOrigin(0, 0).setInteractive({ useHandCursor: true });
      slot.on('pointerup', () => this._useConsumable(i));
      this.consumableSlots.push(slot);
    }
  }

  _updateConsumableSlots() {
    const run = RunState.get();
    this.consumableSlots.forEach((slot, i) => {
      const c = run.consumables[i];
      slot.setText(c ? (c.icon || '🧪') : '◻️');
      slot.setAlpha(c ? 1 : 0.3);
      // Update tooltip handlers
      slot.off('pointerover').off('pointerout');
      if (c) {
        slot.on('pointerover', (pointer) => {
          const desc = (c.effects || []).map(e => {
            if (e.type === 'gain-focus') return `+${e.value} Focus`;
            if (e.type === 'heal') return `Heal ${e.value}`;
            if (e.type === 'pressure-all') return `${e.value} Pressure ALL`;
            if (e.type === 'draw') return `Draw ${e.value}`;
            if (e.type === 'apply-status') return `Apply ${(e.status || '').replace(/-/g, ' ')}`;
            return '';
          }).filter(Boolean).join(', ');
          this._showTooltip(pointer.worldX, pointer.worldY - 20, `${c.name}: ${desc}`);
        });
        slot.on('pointerout', () => this._hideTooltip());
      }
    });
  }

  _useConsumable(idx) {
    if (!this.combat.isPlayerTurn) return;
    const run = RunState.get();
    const c = run.consumables[idx];
    if (!c) return;

    // Apply consumable effects
    for (const eff of (c.effects || [])) {
      switch (eff.type) {
        case 'gain-focus':
          this.combat.reporter.focus += eff.value;
          break;
        case 'heal':
          this.combat.reporter.credibility = Math.min(
            this.combat.reporter.maxCredibility,
            this.combat.reporter.credibility + eff.value
          );
          break;
        case 'pressure-all':
          for (const s of this.combat.subjects) {
            if (s.composure > 0) {
              s.composure = Math.max(0, s.composure - eff.value);
            }
          }
          break;
        case 'draw':
          this.combat.deckManager.draw(eff.value);
          break;
        case 'apply-status':
          if (eff.target === 'self') {
            this.combat.reporter.statuses.add(eff.status, eff.stacks || 1);
          } else {
            for (const s of this.combat.subjects) {
              if (s.composure > 0) s.statuses.add(eff.status, eff.stacks || 1);
            }
          }
          break;
      }
    }

    RunState.useConsumable(idx);
    this._refreshUI();
    this._popText(SIZES.W / 2, 300, c.name, '#44FF44');
  }

  _createEndTurnButton() {
    const M = isMobile();
    const bx = M ? SIZES.W / 2 : SIZES.W - 80;
    const by = M ? SIZES.H - 70 : SIZES.H - 60;
    const bw = M ? 180 : 110;
    const bh = M ? 48 : 36;
    const fSz = M ? '16px' : '13px';

    const bg = this.add.graphics();
    bg.fillStyle(0x1D3A1D, 0.9);
    bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
    bg.lineStyle(1.5, 0x4A8A6A, 0.8);
    bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);

    const txt = this.add.text(bx, by, 'END TURN', {
      fontFamily: 'Share Tech Mono', fontSize: fSz, color: COLORS.PAPER
    }).setOrigin(0.5);

    this.endTurnZone = this.add.zone(bx, by, bw, bh)
      .setInteractive({ useHandCursor: true });
    this.endTurnZone.on('pointerup', () => this._endTurn());
    this.endTurnZone.on('pointerover', () => txt.setAlpha(0.7));
    this.endTurnZone.on('pointerout', () => txt.setAlpha(1));

    // Pulse when 0 focus
    this.endTurnBg = bg;
    this.endTurnTxt = txt;
  }

  _renderHand() {
    // Clear existing hand cards
    for (const cardObj of this.handCards) {
      cardObj.container.destroy();
    }
    this.handCards = [];

    const hand = this.combat.deckManager.hand;
    if (hand.length === 0) return;

    const cardW = SIZES.HAND_CARD_W;
    const cardH = SIZES.HAND_CARD_H;
    const gap = SIZES.HAND_GAP;
    const maxHandW = SIZES.W - 40; // 20px margin each side
    const idealTotalW = hand.length * (cardW + gap) - gap;
    const step = idealTotalW <= maxHandW
      ? cardW + gap
      : (maxHandW - cardW) / (hand.length - 1);
    const totalW = (hand.length - 1) * step + cardW;
    const startX = (SIZES.W - totalW) / 2;
    const handY = SIZES.HAND_Y;

    hand.forEach((card, i) => {
      const x = startX + i * step + cardW / 2;
      const y = handY;
      const cardObj = this._createCardVisual(card, x, y, i);
      cardObj.container.setDepth(i); // Later cards render on top for overlap
      this.handCards.push(cardObj);
    });
  }

  _createCardVisual(card, x, y, handIndex) {
    const w = SIZES.HAND_CARD_W;
    const h = SIZES.HAND_CARD_H;
    const colors = CARD_TYPE_COLORS[card.type] || CARD_TYPE_COLORS.pressure;
    const isXCost = card.keywords?.includes('x-cost');
    const canPlay = card.focusCost <= this.combat.reporter.focus &&
                    card.type !== 'spin' && card.type !== 'lawsuit' &&
                    (!isXCost || this.combat.reporter.focus > 0);

    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.graphics();
    const isUpgraded = card.upgraded;
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, canPlay ? 0.95 : 0.4);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    const borderColor = isUpgraded ? 0x44CC66 : Phaser.Display.Color.HexStringToColor(colors.border).color;
    bg.lineStyle(isUpgraded ? 2 : 1.5, borderColor, canPlay ? 0.9 : 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    container.add(bg);

    // Upgraded star indicator
    if (isUpgraded) {
      const star = this.add.text(w / 2 - 14, -h / 2 + 6, '★', {
        fontSize: '12px', color: '#44CC66'
      }).setOrigin(0.5);
      container.add(star);
    }

    // Cost orb
    const costBg = this.add.graphics();
    costBg.fillStyle(isXCost ? 0xB8860B : 0x0D0B08, 0.9);
    costBg.fillCircle(-w / 2 + 14, -h / 2 + 14, 12);
    costBg.lineStyle(1, isXCost ? 0xF5C518 : Phaser.Display.Color.HexStringToColor(colors.border).color, 0.8);
    costBg.strokeCircle(-w / 2 + 14, -h / 2 + 14, 12);
    container.add(costBg);

    const costText = this.add.text(-w / 2 + 14, -h / 2 + 14,
      isXCost ? 'X' : `${card.focusCost}`,
      { fontFamily: 'Share Tech Mono', fontSize: '13px', color: '#FFF', fontStyle: 'bold' }
    ).setOrigin(0.5);
    container.add(costText);

    // Card name
    const nameText = this.add.text(0, -h / 2 + 32, card.name, {
      fontFamily: 'Playfair Display', fontSize: '13px', color: canPlay ? colors.text : '#666',
      fontStyle: 'bold', wordWrap: { width: w - 16 }, align: 'center'
    }).setOrigin(0.5, 0);
    container.add(nameText);

    // Type label
    const typeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
    const typeText = this.add.text(0, -h / 2 + 54, typeLabel, {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888'
    }).setOrigin(0.5, 0);
    container.add(typeText);

    // Effect text
    const effectStr = this._cardEffectString(card);
    const effectText = this.add.text(0, -h / 2 + 70, effectStr, {
      fontFamily: 'Lora', fontSize: '11px', color: canPlay ? '#D0C8B0' : '#555',
      wordWrap: { width: w - 14 }, align: 'center', lineSpacing: 2
    }).setOrigin(0.5, 0);
    container.add(effectText);

    // Keywords at bottom
    if (card.keywords?.length) {
      const kwStr = card.keywords.map(k => k.replace(/-/g, ' ')).join(' · ');
      const kwText = this.add.text(0, h / 2 - 16, kwStr, {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888', fontStyle: 'italic'
      }).setOrigin(0.5, 1);
      container.add(kwText);
    }

    // Interaction zone
    const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: canPlay, draggable: canPlay });
    container.add(zone);

    // Unplayable card indicator (Spin/Lawsuit)
    if (card.type === 'spin' || card.type === 'lawsuit') {
      const blockLabel = this.add.text(0, h / 2 - 34, card.type === 'spin' ? '🚫 UNPLAYABLE' : '⚖️ UNPLAYABLE', {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#FF6666'
      }).setOrigin(0.5);
      container.add(blockLabel);
      // Diagonal slash pattern
      const slash = this.add.graphics();
      slash.lineStyle(1.5, 0xCC2222, 0.15);
      slash.moveTo(-w / 2, h / 2); slash.lineTo(w / 2, -h / 2);
      slash.moveTo(-w / 2 + 20, h / 2); slash.lineTo(w / 2 + 20, -h / 2);
      slash.strokePath();
      container.add(slash);

      // Hover tooltip explaining why unplayable
      zone.setInteractive({ useHandCursor: false });
      const tipText = card.type === 'spin'
        ? 'Spin: Clogs your deck.\nExhausts at end of turn\nif unplayed.'
        : 'Lawsuit: A curse card.\nCannot be played.';
      zone.on('pointerover', () => {
        container.setScale(1.04);
        container.setDepth(50);
        this._showTooltip(x, y - h / 2 - 10, tipText);
      });
      zone.on('pointerout', () => {
        container.setScale(1);
        container.setDepth(0);
        this._hideTooltip();
      });
    }

    if (canPlay) {
      const origY = y;
      const M = isMobile();

      if (M) {
        // ─── MOBILE: tap to play ───
        zone.on('pointerup', () => {
          this._playCard(handIndex);
        });
        // Visual feedback on touch
        zone.on('pointerdown', () => {
          container.setScale(1.06);
          container.y = origY - 8;
          container.setDepth(50);
        });
      } else {
        // ─── DESKTOP: hover + drag to play ───
        // Hover: lift card slightly + show detail panel
        zone.on('pointerover', () => {
          container.setScale(1.08);
          container.y = origY - 15;
          container.setDepth(50);
          this._showCardDetail(card, x);
        });
        zone.on('pointerout', () => {
          container.setScale(1);
          container.y = origY;
          container.setDepth(0);
          this._hideCardDetail();
        });

        // Drag to play
        this.input.setDraggable(zone);
        zone.on('drag', (pointer) => {
          container.x = pointer.x;
          container.y = pointer.y;
          if (this._dropZone) this._dropZone.setVisible(true);
        });
        zone.on('dragend', (pointer) => {
          this._hideCardDetail();
          if (this._dropZone) this._dropZone.setVisible(false);
          // If dragged above threshold (into subject area), play card
          if (container.y < 350) {
            this._playCard(handIndex);
          } else {
            // Return to position with easing
            this.tweens.add({
              targets: container, x, y: origY,
              duration: 150, ease: 'Back.easeOut',
              onComplete: () => { container.setScale(1); container.setDepth(0); }
            });
            // Show feedback if dragged but not high enough
            if (origY - container.y > 30) {
              this._popText(container.x, 360, '↑ Drag higher! ↑', '#888');
            }
          }
        });

        // Click to play (fallback)
        zone.on('pointerup', (pointer) => {
          // Only if not dragged significantly
          if (Math.abs(pointer.downY - pointer.upY) < 20) {
            this._playCard(handIndex);
          }
        });
      }
    }

    return { card, container, handIndex };
  }

  _cardEffectString(card) {
    const isXCostCard = card.keywords?.includes('x-cost');
    const parts = [];
    for (const eff of (card.effects || [])) {
      switch (eff.type) {
        case 'pressure':
          if (isXCostCard) {
            parts.push(`${eff.value}×Focus Pressure`);
          } else {
            parts.push(`${eff.value}${eff.hits > 1 ? `×${eff.hits}` : ''} Pressure`);
          }
          break;
        case 'pressure-all':
          parts.push(`${eff.value} Pressure ALL`);
          break;
        case 'rapport':
          parts.push(`${eff.value} Rapport`);
          break;
        case 'draw':
          parts.push(`Draw ${eff.value}`);
          break;
        case 'apply-status': {
          const name = eff.status.replace(/-/g, ' ');
          parts.push(`${eff.stacks || 1} ${name}`);
          break;
        }
        case 'apply-status-all': {
          const name = eff.status.replace(/-/g, ' ');
          parts.push(`${eff.stacks || 1} ${name} ALL`);
          break;
        }
        case 'heal':
          parts.push(`Heal ${eff.value}`);
          break;
        case 'gain-focus':
          parts.push(`+${eff.value} Focus`);
          break;
      }
    }
    return parts.join('\n') || card.description || '';
  }

  _playCard(handIndex) {
    if (!this.combat.isPlayerTurn || this._playLocked) return;
    this._playLocked = true;

    const targetIdx = this._getTargetIdx();
    const result = this.combat.playCard(handIndex, targetIdx);
    if (!result) { this._playLocked = false; return; }

    // Animate effects
    for (const eff of result.effects) {
      if (eff.type === 'pressure') {
        const d = this.subjectDisplays[eff.targetIdx || 0];
        if (d) {
          this._popText(d.x, d.y + 20, `-${eff.value}`, COLORS.RED);
          this._screenShake(eff.value > 10 ? 4 : 2);
        }
      } else if (eff.type === 'rapport') {
        this._popText(SIZES.W - 70, 50, `+${eff.value} 🛡️`, '#88BBEE');
      } else if (eff.type === 'status') {
        this._popText(SIZES.W / 2, 300, `${eff.status}`, '#C8AA40');
      }
    }

    // Check win
    if (this.combat.checkWin()) {
      this.time.delayedCall(500, () => this._handleWin());
      this._playLocked = false;
      return;
    }

    this._refreshUI();
    this._playLocked = false;
  }

  _endTurn() {
    if (!this.combat.isPlayerTurn) return;

    // Disable input during subject turn
    this.combat.isPlayerTurn = false;
    this.endTurnZone.disableInteractive();

    // End player turn → execute subjects
    const subjectActions = this.combat.endPlayerTurn();

    // Animate subject actions sequentially
    let delay = 100;
    for (const action of subjectActions) {
      this.time.delayedCall(delay, () => {
        this._animateSubjectAction(action);
      });
      delay += 400;
    }

    // After all subject actions, check lose, then start new turn
    this.time.delayedCall(delay + 200, () => {
      if (this.combat.checkLose()) {
        this._handleLose();
        return;
      }

      // Sync credibility back to RunState
      const run = RunState.get();
      run.credibility = this.combat.reporter.credibility;
      RunState.save();

      // Start new player turn
      const oldRapport = this.combat.reporter.rapport;
      this.combat.startPlayerTurn();
      if (oldRapport > 0) {
        this._popText(SIZES.W - 140, 38, `🛡️ −${oldRapport} Rapport`, '#88BBEE');
      }
      this.endTurnZone.setInteractive({ useHandCursor: true });
      this._refreshUI();
    });
  }

  _animateSubjectAction(action) {
    const d = this.subjectDisplays.find(dd => dd.subject === action.subject);
    if (!d) return;

    switch (action.type) {
      case 'ATTACK':
        this._popText(SIZES.W - 70, 30, `-${action.damageToCredibility}`, '#FF4444');
        this._screenShake(action.damageToCredibility > 8 ? 5 : 3);
        break;
      case 'GUARD':
        this._popText(d.x, d.y + 20, `+${action.value} 🛡️`, '#88BBEE');
        break;
      case 'BUFF':
        this._popText(d.x, d.y + 20, `${action.status}`, '#C8AA40');
        break;
      case 'DEBUFF':
        this._popText(SIZES.W / 2, 300, `${action.status}`, '#9A4ACA');
        break;
      case 'SPIN':
        this._popText(SIZES.W / 2, 300, `+${action.value} Spin card(s)`, '#666');
        break;
      case 'NO_COMMENT':
        this._popText(d.x, d.y + 20, 'No Comment', '#555');
        break;
      case 'BLOCKED':
        this._popText(d.x, d.y + 20, action.label || 'Blocked!', '#44FF44');
        break;
      case 'BLOCKED_BY_SHIELD':
        this._popText(SIZES.W / 2, 300, '🔰 Shield!', '#44FF44');
        break;
    }
  }

  _handleWin() {
    const run = RunState.get();
    run.credibility = this.combat.reporter.credibility;

    // Complete the node
    if (this.nodeData.id != null) {
      RunState.completeNode(this.nodeData.id);
    }

    // Trigger onInterviewWin relic hooks (replaces hardcoded Branschrykte)
    RelicManager.trigger('onInterviewWin', this.combat);

    // Give press passes
    const nodeType = this.nodeData.type || 'INTERVIEW';
    let ppRange = BALANCE.NORMAL_REWARD_PP;
    if (nodeType === 'ELITE') ppRange = BALANCE.ELITE_REWARD_PP;
    if (nodeType === 'BOSS') ppRange = BALANCE.BOSS_REWARD_PP;
    const pp = ppRange[0] + Math.floor(Math.random() * (ppRange[1] - ppRange[0] + 1));
    RunState.addPressPasses(pp);

    // Consumable drop chance (~40% for normal, ~60% for elite)
    const dropChance = nodeType === 'ELITE' ? 0.6 : 0.4;
    if (Math.random() < dropChance && run.consumables.length < BALANCE.MAX_CONSUMABLES) {
      const allConsumables = this.cache.json.get('consumables') || [];
      if (allConsumables.length > 0) {
        const drop = allConsumables[Math.floor(Math.random() * allConsumables.length)];
        RunState.addConsumable(drop);
      }
    }

    // Show victory flash
    this._popText(SIZES.W / 2, 200, '📰 CRACKED!', COLORS.YELLOW);

    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        if (nodeType === 'BOSS') {
          this.scene.start('BossRewardScene');
        } else {
          this.scene.start('CardRewardScene', { nodeType, pp });
        }
      });
    });
  }

  _handleLose() {
    this._popText(SIZES.W / 2, 200, '💀 CREDIBILITY LOST', COLORS.RED);
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameOverScene');
      });
    });
  }

  _refreshUI() {
    this._updateSubjectDisplays();
    this._updateReporterHUD();
    this._updatePileCounters();
    this._updateConsumableSlots();
    this._renderHand();

    // Pulse End Turn button when player has 0 focus or no playable cards
    const noFocus = this.combat.reporter.focus === 0;
    const noPlayable = this.combat.deckManager.hand.every(
      c => c.focusCost > this.combat.reporter.focus || c.type === 'spin' || c.type === 'lawsuit'
    );
    if ((noFocus || noPlayable) && !this._endTurnPulsing) {
      this._endTurnPulsing = true;
      this._endTurnPulse = this.tweens.add({
        targets: this.endTurnBg, alpha: 0.4, duration: 500, yoyo: true, repeat: -1
      });
    } else if (!noFocus && !noPlayable && this._endTurnPulsing) {
      this._endTurnPulsing = false;
      if (this._endTurnPulse) { this._endTurnPulse.stop(); this._endTurnPulse = null; }
      this.endTurnBg.setAlpha(1);
    }
  }

  _popText(x, y, text, color) {
    // Offset stacking pops so they don't overlap
    if (!this._popOffset) this._popOffset = 0;
    const offsetY = y - this._popOffset;
    this._popOffset += 26;
    this.time.delayedCall(900, () => { this._popOffset = Math.max(0, this._popOffset - 26); });

    const t = this.add.text(x, offsetY, text, {
      fontFamily: 'Playfair Display', fontSize: '22px', color, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: t, y: offsetY - 40, alpha: 0, duration: 800,
      ease: 'Cubic.easeOut', onComplete: () => t.destroy()
    });
  }

  _screenShake(intensity = 3) {
    this.cameras.main.shake(150, intensity / 1000);
  }

  // ─── Tooltip system ───
  _showTooltip(x, y, text) {
    this._hideTooltip();
    const padX = 8, padY = 4;
    const txt = this.add.text(0, 0, text, {
      fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#F5F0E8',
      wordWrap: { width: 250 }, lineSpacing: 2
    });
    const w = txt.width + padX * 2;
    const h = txt.height + padY * 2;
    // Keep on screen (all edges)
    let tx = Math.min(x, SIZES.W - w - 5);
    tx = Math.max(5, tx);
    let ty = y - h;
    if (ty < 5) ty = y + 20; // flip below if clipping top
    ty = Math.min(ty, SIZES.H - h - 5);
    const bg = this.add.graphics();
    bg.fillStyle(0x0D0B08, 0.95);
    bg.fillRoundedRect(tx, ty, w, h, 4);
    bg.lineStyle(1, 0xF5C518, 0.5);
    bg.strokeRoundedRect(tx, ty, w, h, 4);
    txt.setPosition(tx + padX, ty + padY);
    this.tooltip = this.add.container(0, 0, [bg, txt]).setDepth(300);
  }

  _hideTooltip() {
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
  }

  // ─── Card detail panel (large hover preview) ───
  _showCardDetail(card, cardX) {
    this._hideCardDetail();
    const dw = SIZES.CARD_DETAIL_W;
    const dh = SIZES.CARD_DETAIL_H;
    const colors = CARD_TYPE_COLORS[card.type] || CARD_TYPE_COLORS.pressure;

    // Position to left or right of card, above the hand
    const panelX = cardX < SIZES.W / 2 ? cardX + 90 : cardX - dw - 90;
    const panelY = SIZES.HAND_Y - dh - 30;

    const items = [];
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, 0.97);
    bg.fillRoundedRect(panelX, panelY, dw, dh, 8);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.9);
    bg.strokeRoundedRect(panelX, panelY, dw, dh, 8);
    items.push(bg);

    // Cost orb
    const costBg = this.add.graphics();
    costBg.fillStyle(0x0D0B08, 0.95);
    costBg.fillCircle(panelX + 20, panelY + 20, 16);
    costBg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.9);
    costBg.strokeCircle(panelX + 20, panelY + 20, 16);
    items.push(costBg);

    items.push(this.add.text(panelX + 20, panelY + 20,
      card.keywords?.includes('x-cost') ? 'X' : `${card.focusCost}`,
      { fontFamily: 'Share Tech Mono', fontSize: '16px', color: '#FFF', fontStyle: 'bold' }
    ).setOrigin(0.5));

    // Card name
    items.push(this.add.text(panelX + dw / 2, panelY + 45, card.name, {
      fontFamily: 'Playfair Display', fontSize: '18px', color: colors.text,
      fontStyle: 'bold', wordWrap: { width: dw - 24 }, align: 'center'
    }).setOrigin(0.5, 0));

    // Type + rarity
    const typeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
    const rarity = card.rarity ? ` · ${card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}` : '';
    items.push(this.add.text(panelX + dw / 2, panelY + 72, `${typeLabel}${rarity}`, {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#888'
    }).setOrigin(0.5, 0));

    // Divider
    const divG = this.add.graphics();
    divG.lineStyle(1, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.3);
    divG.moveTo(panelX + 15, panelY + 90);
    divG.lineTo(panelX + dw - 15, panelY + 90);
    divG.strokePath();
    items.push(divG);

    // Effect description
    const effectStr = this._cardEffectString(card);
    items.push(this.add.text(panelX + dw / 2, panelY + 100, effectStr, {
      fontFamily: 'Lora', fontSize: '14px', color: '#E0D8C0',
      wordWrap: { width: dw - 30 }, align: 'center', lineSpacing: 4
    }).setOrigin(0.5, 0));

    // Keywords at bottom
    if (card.keywords?.length) {
      const kwStr = card.keywords.map(k => k.replace(/-/g, ' ')).join(' · ');
      items.push(this.add.text(panelX + dw / 2, panelY + dh - 30, kwStr, {
        fontFamily: 'Share Tech Mono', fontSize: '11px', color: COLORS.YELLOW, fontStyle: 'italic'
      }).setOrigin(0.5, 0.5));
    }

    // Upgraded indicator
    if (card.upgraded) {
      items.push(this.add.text(panelX + dw - 10, panelY + 10, '★', {
        fontSize: '14px', color: COLORS.YELLOW
      }).setOrigin(1, 0));
    }

    this.cardDetail = this.add.container(0, 0, items).setDepth(100);
  }

  _hideCardDetail() {
    if (this.cardDetail) { this.cardDetail.destroy(); this.cardDetail = null; }
  }

  // ─── Pile viewer (draw/discard/exhaust) ───
  _showPileViewer(title, cards) {
    if (this.pileViewer) this.pileViewer.destroy();
    const M = isMobile();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0D0B08, 0.94);
    overlay.fillRect(0, 0, SIZES.W, SIZES.H);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, SIZES.W, SIZES.H), Phaser.Geom.Rectangle.Contains);

    const items = [overlay];

    items.push(this.add.text(SIZES.W / 2, 25, title, {
      fontFamily: 'Playfair Display', fontSize: M ? '22px' : '20px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5));

    items.push(this.add.text(SIZES.W / 2, 50, `${cards.length} card${cards.length !== 1 ? 's' : ''}`, {
      fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#888'
    }).setOrigin(0.5));

    const cols = M ? 3 : 6, cardW = M ? 160 : 130, cardH = M ? 58 : 50, gap = 8;
    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = (SIZES.W - cols * (cardW + gap) + gap) / 2 + col * (cardW + gap);
      const cy = 75 + row * (cardH + gap);
      const colors = CARD_TYPE_COLORS[card.type] || CARD_TYPE_COLORS.pressure;

      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, 0.85);
      bg.fillRoundedRect(cx, cy, cardW, cardH, 4);
      bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.5);
      bg.strokeRoundedRect(cx, cy, cardW, cardH, 4);
      items.push(bg);

      items.push(this.add.text(cx + 5, cy + 5, `[${card.focusCost}] ${card.name}`, {
        fontFamily: 'Playfair Display', fontSize: M ? '11px' : '10px', color: colors.text,
        fontStyle: 'bold', wordWrap: { width: cardW - 10 }
      }));

      const effStr = this._cardEffectString(card);
      items.push(this.add.text(cx + 5, cy + 22, effStr, {
        fontFamily: 'Lora', fontSize: M ? '9px' : '8px', color: '#AAA',
        wordWrap: { width: cardW - 10 }
      }));
    });

    const closeBtn = this.add.text(SIZES.W / 2, SIZES.H - 25, 'CLOSE', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '16px' : '13px', color: COLORS.PAPER
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => { this.pileViewer.destroy(); this.pileViewer = null; });
    items.push(closeBtn);

    this.pileViewer = this.add.container(0, 0, items).setDepth(250);
  }

  // ─── Target selection for multi-subject ───
  _getTargetIdx() {
    const living = this.combat.subjects.map((s, i) => ({ s, i })).filter(x => x.s.composure > 0);
    if (living.length <= 1) return living[0]?.i ?? 0;
    // Auto-switch target if selected subject is dead
    if (this._selectedTarget != null && (!this.combat.subjects[this._selectedTarget] || this.combat.subjects[this._selectedTarget].composure <= 0)) {
      this._selectedTarget = living[0].i;
      this._updateTargetIndicator();
    }
    return this._selectedTarget ?? living[0].i;
  }
}
