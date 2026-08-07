/* EventScene — Anonymous Tip: multi-choice narrative events */
import Phaser from 'phaser';
import { COLORS, SIZES, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class EventScene extends Phaser.Scene {
  constructor() { super('EventScene'); }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();
    const events = this.cache.json.get('events') || [];

    // Pick random event
    const event = events.length > 0
      ? events[Math.floor(Math.random() * events.length)]
      : { name: 'Wrong Number', text: 'You answer a mysterious phone call, but it\'s just a wrong number.', choices: [{ label: 'Hang up', effects: [] }] };

    // Background
    this.add.graphics().fillStyle(0x0D0B08, 0.95).fillRect(0, 0, SIZES.W, SIZES.H);

    const M = isMobile();
    const yOff = M ? 60 : 0;

    // Title
    this.add.text(SIZES.W / 2, 40 + yOff, `📞 ${event.name}`, {
      fontFamily: 'Playfair Display', fontSize: M ? '22px' : '24px', color: COLORS.PURPLE, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Narrative text
    this.add.text(SIZES.W / 2, 120 + yOff, event.text, {
      fontFamily: 'Lora', fontSize: '14px', color: '#C0B898', fontStyle: 'italic',
      wordWrap: { width: SIZES.W - 60 }, align: 'center', lineSpacing: 4
    }).setOrigin(0.5);

    // Choice buttons
    const choices = event.choices || [];
    choices.forEach((choice, i) => {
      const y = (M ? 320 : 250) + i * (M ? 70 : 60);
      this._makeChoice(choice, y, run);
    });
  }

  _makeChoice(choice, y, run) {
    const M = isMobile();
    const w = M ? SIZES.W - 40 : 500, h = M ? 52 : 44;
    const x = SIZES.W / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1A1208, 0.85);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1, 0x9A4ACA, 0.5);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);

    // Label + hint
    let hint = '';
    for (const eff of (choice.effects || [])) {
      if (eff.type === 'heal') hint += ` +${eff.value} ❤️`;
      if (eff.type === 'damage') hint += ` -${eff.value} ❤️`;
      if (eff.type === 'gold') hint += ` +${eff.value} 💰`;
      if (eff.type === 'lose-gold') hint += ` -${eff.value} 💰`;
      if (eff.type === 'add-card') hint += ` +Card`;
      if (eff.type === 'add-relic') hint += ` +Relic`;
      if (eff.type === 'add-curse') hint += ` +Curse`;
      if (eff.type === 'upgrade-random') hint += ` ⬆ Card`;
      if (eff.type === 'remove-card') hint += ` -Card`;
      if (eff.type === 'max-credibility') hint += ` +${eff.value} Max❤️`;
    }

    this.add.text(x, y, `${choice.label}${hint}`, {
      fontFamily: 'Special Elite', fontSize: M ? '15px' : '14px', color: COLORS.PAPER,
      wordWrap: { width: w - 20 }, align: 'center'
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => bg.setAlpha(0.6));
    zone.on('pointerout', () => bg.setAlpha(1));
    zone.on('pointerup', () => {
      this._applyEffects(choice.effects || [], run);
      if (run.currentNode?.id != null) RunState.completeNode(run.currentNode.id);
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('MapScene'));
    });
  }

  _applyEffects(effects, run) {
    for (const eff of effects) {
      switch (eff.type) {
        case 'heal': RunState.heal(eff.value); break;
        case 'damage': RunState.takeDamage(eff.value); break;
        case 'gold': RunState.addPressPasses(eff.value); break;
        case 'lose-gold': RunState.spendPressPasses(eff.value); break;
        case 'max-credibility':
          run.maxCredibility += eff.value;
          RunState.heal(eff.value);
          break;
        case 'add-card': {
          const allCards = this.cache.json.get('cards-veteran') || [];
          const card = allCards.find(c => c.id === eff.cardId);
          if (card) RunState.addCard({ id: `evt-${Date.now()}`, cardId: card.id, upgraded: false });
          break;
        }
        case 'add-curse': {
          const allCards = this.cache.json.get('cards-veteran') || [];
          const curse = allCards.find(c => c.type === 'lawsuit');
          if (curse) RunState.addCard({ id: `curse-${Date.now()}`, cardId: curse.id, upgraded: false });
          break;
        }
        case 'add-relic': {
          const allRelics = this.cache.json.get('relics') || [];
          const relic = allRelics.find(r => r.id === eff.relicId);
          if (relic) RunState.addRelic(relic);
          break;
        }
        case 'upgrade-random': {
          const upgradeable = run.deck.filter(e => !e.upgraded);
          if (upgradeable.length > 0) {
            const target = upgradeable[Math.floor(Math.random() * upgradeable.length)];
            RunState.upgradeCard(target.id);
          }
          break;
        }
        case 'remove-card': {
          // Remove a random non-starter card
          const removable = run.deck.filter(e => !e.cardId.startsWith('routine') && !e.cardId.startsWith('active') && !e.cardId.startsWith('confidence'));
          if (removable.length > 0) {
            const target = removable[Math.floor(Math.random() * removable.length)];
            RunState.removeCard(target.id);
          }
          break;
        }
      }
    }
  }
}
