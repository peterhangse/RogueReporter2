/* GameOverScene — run lost */
import Phaser from 'phaser';
import { COLORS, SIZES, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const run = RunState.get();

    this.add.graphics().fillStyle(0x0D0B08, 1).fillRect(0, 0, SIZES.W, SIZES.H);

    const M = isMobile();
    const yOff = M ? 120 : 0;

    this.add.text(SIZES.W / 2, 100 + yOff, '💀 DISCREDITED', {
      fontFamily: 'Playfair Display', fontSize: M ? '36px' : '42px', color: COLORS.RED, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, 160 + yOff, '"Sources dried up. The editor killed the story."', {
      fontFamily: 'Lora', fontSize: '14px', color: '#C0B898', fontStyle: 'italic',
      wordWrap: { width: SIZES.W - 60 }, align: 'center'
    }).setOrigin(0.5);

    // Stats
    const stats = [
      `Reached: Act ${run.act}, Floor ${run.floor}`,
      `Deck: ${run.deck.length} cards`,
      `Relics: ${run.relics.length}`,
    ];
    stats.forEach((s, i) => {
      this.add.text(SIZES.W / 2, 230 + yOff + i * 28, s, {
        fontFamily: 'Share Tech Mono', fontSize: M ? '14px' : '13px', color: '#666'
      }).setOrigin(0.5);
    });

    this.time.delayedCall(1000, () => {
      this._makeButton(SIZES.W / 2, SIZES.H - 100, 'TRY AGAIN', COLORS.DARK_RED, COLORS.RED, () => {
        RunState.clearSave();
        RunState.fresh();
        this.scene.start('MenuScene');
      });

      this._makeButton(SIZES.W / 2, SIZES.H - 50, 'MAIN MENU', '#1A1A1A', '#555', () => {
        RunState.clearSave();
        this.scene.start('MenuScene');
      });
    });
  }

  _makeButton(x, y, label, fill, border, cb) {
    const M = isMobile();
    const w = M ? SIZES.W - 80 : 220, h = M ? 48 : 36;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 0.85);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(border).color, 0.7);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    this.add.text(x, y, label, { fontFamily: 'Share Tech Mono', fontSize: '13px', color: COLORS.PAPER }).setOrigin(0.5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerup', cb);
  }
}
