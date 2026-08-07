/* VictoryScene — run won */
import Phaser from 'phaser';
import { COLORS, SIZES, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class VictoryScene extends Phaser.Scene {
  constructor() { super('VictoryScene'); }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const run = RunState.get();

    this.add.graphics().fillStyle(0x0D0B08, 1).fillRect(0, 0, SIZES.W, SIZES.H);

    const M = isMobile();
    const yOff = M ? 100 : 0;

    this.add.text(SIZES.W / 2, 80 + yOff, '📰 FRONT PAGE', {
      fontFamily: 'Playfair Display', fontSize: M ? '40px' : '48px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, 140 + yOff, 'EXCLUSIVE: Corruption Exposed — City in Shock', {
      fontFamily: 'Playfair Display', fontSize: M ? '16px' : '18px', color: COLORS.PAPER, fontStyle: 'bold',
      wordWrap: { width: SIZES.W - 40 }, align: 'center'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, 190 + yOff, '"A veteran reporter broke the biggest scandal this city has ever seen."', {
      fontFamily: 'Lora', fontSize: '13px', color: '#C0B898', fontStyle: 'italic',
      wordWrap: { width: SIZES.W - 60 }, align: 'center'
    }).setOrigin(0.5);

    // Stats
    const stats = [
      `❤️ Credibility: ${run.credibility}/${run.maxCredibility}`,
      `📇 Deck: ${run.deck.length} cards`,
      `🏆 Relics: ${run.relics.length}`,
      `💰 Press Passes: ${run.pressPasses}`,
    ];
    stats.forEach((s, i) => {
      this.add.text(SIZES.W / 2, 260 + yOff + i * 28, s, {
        fontFamily: 'Share Tech Mono', fontSize: M ? '14px' : '13px', color: '#AAA'
      }).setOrigin(0.5);
    });

    // Relic showcase
    if (run.relics.length > 0) {
      this.add.text(SIZES.W / 2, 385 + yOff, 'Your Press Kit:', {
        fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#888'
      }).setOrigin(0.5);
      const relicStartX = SIZES.W / 2 - (run.relics.length - 1) * 18;
      run.relics.forEach((r, i) => {
        this.add.text(relicStartX + i * 36, 410 + yOff, r.icon || '📦', {
          fontSize: '20px'
        }).setOrigin(0.5);
        this.add.text(relicStartX + i * 36, 430 + yOff, r.name || '', {
          fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#777',
          wordWrap: { width: 34 }, align: 'center'
        }).setOrigin(0.5, 0);
      });
    }

    // Buttons
    this.time.delayedCall(1500, () => {
      this._makeButton(SIZES.W / 2, SIZES.H - 80, 'NEW INVESTIGATION', COLORS.DARK_GREEN, COLORS.GREEN, () => {
        RunState.clearSave();
        RunState.fresh();
        this.scene.start('MenuScene');
      });
    });
  }

  _makeButton(x, y, label, fill, border, cb) {
    const M = isMobile();
    const w = M ? SIZES.W - 80 : 260, h = M ? 52 : 40;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 0.85);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(border).color, 0.7);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    this.add.text(x, y, label, { fontFamily: 'Share Tech Mono', fontSize: '13px', color: COLORS.PAPER }).setOrigin(0.5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerup', cb);
  }
}
