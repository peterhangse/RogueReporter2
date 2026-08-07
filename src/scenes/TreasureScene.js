/* TreasureScene — Leaked Doc: free relic */
import Phaser from 'phaser';
import { COLORS, SIZES, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class TreasureScene extends Phaser.Scene {
  constructor() { super('TreasureScene'); }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();

    this.add.graphics().fillStyle(0x0D0B08, 0.95).fillRect(0, 0, SIZES.W, SIZES.H);

    const M = isMobile();
    const yOff = M ? 80 : 0;

    this.add.text(SIZES.W / 2, 60 + yOff, '📁 LEAKED DOCUMENTS', {
      fontFamily: 'Playfair Display', fontSize: M ? '24px' : '28px', color: COLORS.BLUE, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, 100 + yOff, 'An anonymous source left something in your mailbox...', {
      fontFamily: 'Lora', fontSize: '14px', color: '#C0B898', fontStyle: 'italic',
      wordWrap: { width: SIZES.W - 60 }, align: 'center'
    }).setOrigin(0.5);

    // Pick a relic from pool
    const allRelics = this.cache.json.get('relics') || [];
    const available = allRelics.filter(r => !run.relics.find(rr => rr.id === r.id) && r.tier !== 'boss');
    const relic = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : { id: 'fallback', name: 'Press Badge', icon: '🎫', description: 'A basic press credential.' };

    // Chest animation
    const chest = this.add.text(SIZES.W / 2, 220 + yOff, '📦', { fontSize: '64px' }).setOrigin(0.5);

    this.tweens.add({
      targets: chest, scaleX: 1.2, scaleY: 1.2, duration: 300, yoyo: true, onComplete: () => {
        chest.setText(relic.icon || '📦');

        this.add.text(SIZES.W / 2, 300 + yOff, relic.name, {
          fontFamily: 'Playfair Display', fontSize: '22px', color: COLORS.YELLOW, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(SIZES.W / 2, 335 + yOff, relic.description || '', {
          fontFamily: 'Lora', fontSize: '13px', color: '#C0B898',
          wordWrap: { width: SIZES.W - 60 }, align: 'center'
        }).setOrigin(0.5);

        RunState.addRelic(relic);

        // Continue button
        this.time.delayedCall(500, () => {
          this._makeButton(SIZES.W / 2, 430 + yOff, 'CONTINUE', '#1A1208', COLORS.YELLOW, () => {
            if (run.currentNode?.id != null) RunState.completeNode(run.currentNode.id);
            this.cameras.main.fadeOut(200);
            this.time.delayedCall(200, () => this.scene.start('MapScene'));
          });
        });
      }
    });
  }

  _makeButton(x, y, label, fill, border, cb) {
    const M = isMobile();
    const w = M ? SIZES.W - 80 : 200, h = M ? 52 : 40;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 0.8);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(border).color, 0.6);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    this.add.text(x, y, label, { fontFamily: 'Share Tech Mono', fontSize: '13px', color: COLORS.PAPER }).setOrigin(0.5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerup', cb);
  }
}
