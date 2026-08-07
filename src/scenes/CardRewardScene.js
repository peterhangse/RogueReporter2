/* CardRewardScene — pick 1 of 3 cards after combat */
import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, CARD_TYPE_COLORS, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class CardRewardScene extends Phaser.Scene {
  constructor() { super('CardRewardScene'); }

  init(data) {
    this.nodeType = data?.nodeType || 'INTERVIEW';
    this.ppGained = data?.pp || 0;
  }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();
    const allCards = this.cache.json.get('cards-veteran') || [];

    // Filter obtainable cards (not starters) with act-based rarity weighting
    const pool = allCards.filter(c => c.rarity && c.rarity !== 'starter' && c.type !== 'spin' && c.type !== 'lawsuit');

    // Act-based weighting: common heavy in Act 1, rares more likely in Act 3
    const weighted = [];
    for (const card of pool) {
      let copies = 1;
      if (run.act === 1) {
        if (card.rarity === 'common') copies = 4;
        else if (card.rarity === 'uncommon') copies = 2;
        else copies = 1;
      } else if (run.act === 2) {
        if (card.rarity === 'common') copies = 3;
        else if (card.rarity === 'uncommon') copies = 3;
        else copies = 1;
      } else {
        if (card.rarity === 'common') copies = 2;
        else if (card.rarity === 'uncommon') copies = 3;
        else copies = 2;
      }
      for (let i = 0; i < copies; i++) weighted.push(card);
    }

    // Pick 3 random cards (no duplicates)
    const shuffled = Phaser.Utils.Array.Shuffle([...weighted]);
    const seen = new Set();
    const choices = [];
    for (const c of shuffled) {
      if (!seen.has(c.id) && choices.length < 3) {
        seen.add(c.id);
        choices.push(c);
      }
    }

    // Background
    const g = this.add.graphics();
    g.fillStyle(0x0D0B08, 0.95);
    g.fillRect(0, 0, SIZES.W, SIZES.H);

    // Title
    this.add.text(SIZES.W / 2, 40, '📰 INTERVIEW COMPLETE', {
      fontFamily: 'Playfair Display', fontSize: '24px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);

    // PP gained
    this.add.text(SIZES.W / 2, 75, `+${this.ppGained} Press Passes`, {
      fontFamily: 'Share Tech Mono', fontSize: '13px', color: COLORS.MONEY
    }).setOrigin(0.5);

    // "Choose a card" label
    const deckFull = run.deck.length >= 40;
    this.add.text(SIZES.W / 2, 110, deckFull
      ? `Deck full (${run.deck.length}/40) — skip or remove cards at rest sites`
      : `Choose a card to add to your deck (${run.deck.length}/40):`, {
      fontFamily: 'Lora', fontSize: '14px', color: deckFull ? '#CC8822' : '#C0B898'
    }).setOrigin(0.5);

    // Render 3 cards
    const M = isMobile();
    const cardW = M ? 160 : 180, cardH = M ? 240 : 260, gap = M ? 10 : 30;
    const totalW = choices.length * (cardW + gap) - gap;
    const startX = (SIZES.W - totalW) / 2;

    choices.forEach((card, i) => {
      const x = startX + i * (cardW + gap) + cardW / 2;
      const y = M ? 380 : (this.nodeType === 'ELITE' ? 250 : 280);
      this._renderCard(card, x, y, cardW, cardH, run);
    });

    // Elite relic reward
    if (this.nodeType === 'ELITE') {
      const allRelics = this.cache.json.get('relics') || [];
      const available = allRelics.filter(r => !run.relics.find(rr => rr.id === r.id) && r.tier !== 'boss' && r.tier !== 'starter');
      if (available.length > 0) {
        const relic = available[Math.floor(Math.random() * available.length)];
        this.add.text(SIZES.W / 2, SIZES.H - 110, 'Elite Reward:', {
          fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#888'
        }).setOrigin(0.5);

        const relicBtn = this.add.text(SIZES.W / 2, SIZES.H - 88,
          `${relic.icon} ${relic.name} — ${relic.description}`, {
          fontFamily: 'Lora', fontSize: '12px', color: COLORS.YELLOW,
          wordWrap: { width: 500 }, align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        relicBtn.on('pointerup', () => {
          RunState.addRelic(relic);
          relicBtn.setText('✅ ' + relic.name + ' obtained!').disableInteractive();
        });
      }
    }

    // Skip button
    this._makeButton(SIZES.W / 2, SIZES.H - (M ? 70 : 50), 'SKIP', '#333', '#666', () => {
      this._goToMap();
    });
  }

  _renderCard(card, x, y, w, h, run) {
    const colors = CARD_TYPE_COLORS[card.type] || CARD_TYPE_COLORS.pressure;

    // Card bg
    const rarityBorderColors = { common: colors.border, uncommon: '#4A8ACA', rare: '#F5C518' };
    const rarityBorder = rarityBorderColors[card.rarity] || colors.border;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, 0.95);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(card.rarity === 'rare' ? 3 : card.rarity === 'uncommon' ? 2.5 : 2,
      Phaser.Display.Color.HexStringToColor(rarityBorder).color, 0.9);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    // Cost
    this.add.text(x - w / 2 + 18, y - h / 2 + 18,
      card.keywords?.includes('x-cost') ? 'X' : `${card.focusCost}`,
      { fontFamily: 'Share Tech Mono', fontSize: '16px', color: '#FFF', fontStyle: 'bold' }
    ).setOrigin(0.5);

    // Name
    this.add.text(x, y - h / 2 + 45, card.name, {
      fontFamily: 'Playfair Display', fontSize: '14px', color: colors.text, fontStyle: 'bold',
      wordWrap: { width: w - 20 }, align: 'center'
    }).setOrigin(0.5, 0);

    // Type
    const typeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
    this.add.text(x, y - h / 2 + 70, typeLabel, {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#888'
    }).setOrigin(0.5, 0);

    // Effects
    const effectStr = this._cardEffectString(card);
    this.add.text(x, y - h / 2 + 95, effectStr, {
      fontFamily: 'Lora', fontSize: '12px', color: '#D0C8B0',
      wordWrap: { width: w - 20 }, align: 'center', lineSpacing: 3
    }).setOrigin(0.5, 0);

    // Keywords
    if (card.keywords?.length) {
      const kwStr = card.keywords.map(k => k.replace(/-/g, ' ')).join(' · ');
      this.add.text(x, y + h / 2 - 20, kwStr, {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888', fontStyle: 'italic'
      }).setOrigin(0.5, 1);
    }

    // Rarity
    const rarityColors = { common: '#888', uncommon: '#4A8ACA', rare: '#F5C518' };
    this.add.text(x, y + h / 2 - 8, card.rarity || '', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: rarityColors[card.rarity] || '#888'
    }).setOrigin(0.5, 1);

    // Click zone
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => bg.setAlpha(0.7));
    zone.on('pointerout', () => bg.setAlpha(1));
    zone.on('pointerup', () => {
      // Add card to deck
      RunState.addCard({
        id: `${card.id}-${Date.now()}`,
        cardId: card.id,
        upgraded: false,
      });
      this._goToMap();
    });
  }

  _cardEffectString(card) {
    const parts = [];
    for (const eff of (card.effects || [])) {
      switch (eff.type) {
        case 'pressure': parts.push(`${eff.value}${eff.hits > 1 ? `×${eff.hits}` : ''} Pressure`); break;
        case 'pressure-all': parts.push(`${eff.value} Pressure ALL`); break;
        case 'rapport': parts.push(`${eff.value} Rapport`); break;
        case 'draw': parts.push(`Draw ${eff.value}`); break;
        case 'apply-status': parts.push(`${eff.stacks || 1} ${eff.status.replace(/-/g, ' ')}`); break;
        case 'apply-status-all': parts.push(`${eff.stacks || 1} ${eff.status.replace(/-/g, ' ')} ALL`); break;
        case 'heal': parts.push(`Heal ${eff.value}`); break;
        case 'gain-focus': parts.push(`+${eff.value} Focus`); break;
      }
    }
    return parts.join('\n') || card.description || '';
  }

  _goToMap() {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('MapScene'));
  }

  _makeButton(x, y, label, fillColor, borderColor, cb) {
    const w = 160, h = 36;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fillColor).color, 0.8);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(borderColor).color, 0.6);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);

    this.add.text(x, y, label, {
      fontFamily: 'Share Tech Mono', fontSize: '13px', color: '#CCC'
    }).setOrigin(0.5);

    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerup', cb);
  }
}
