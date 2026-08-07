/* BossRewardScene — pick 1 of 3 boss relics after defeating act boss */
import Phaser from 'phaser';
import { COLORS, SIZES, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class BossRewardScene extends Phaser.Scene {
  constructor() { super('BossRewardScene'); }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();

    this.add.graphics().fillStyle(0x0D0B08, 0.95).fillRect(0, 0, SIZES.W, SIZES.H);

    const actNames = ['', 'Lokalpressen', 'Regionalnytt', 'Riksmedia'];
    this.add.text(SIZES.W / 2, 40, `🏛️ ACT ${run.act} COMPLETE`, {
      fontFamily: 'Playfair Display', fontSize: '28px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, M ? 110 : 80, `"${actNames[run.act]}" boss defeated!`, {
      fontFamily: 'Lora', fontSize: '14px', color: '#C0B898', fontStyle: 'italic'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, M ? 150 : 120, 'Choose a powerful relic:', {
      fontFamily: 'Lora', fontSize: '14px', color: COLORS.PAPER
    }).setOrigin(0.5);

    // Pick 3 boss relics
    const allRelics = this.cache.json.get('relics') || [];
    const bossRelics = allRelics.filter(r => r.tier === 'boss' && !run.relics.find(rr => rr.id === r.id));
    const choices = Phaser.Utils.Array.Shuffle([...bossRelics]).slice(0, 3);

    // If not enough boss relics, fill with rare
    while (choices.length < 3) {
      const rare = allRelics.filter(r => r.tier === 'rare' && !run.relics.find(rr => rr.id === r.id)
        && !choices.find(c => c.id === r.id));
      if (rare.length > 0) choices.push(rare[Math.floor(Math.random() * rare.length)]);
      else break;
    }

    const M = isMobile();
    const cardW = M ? 160 : 240, gap = M ? 10 : 30;
    const totalW = choices.length * (cardW + gap) - gap;
    const startX = (SIZES.W - totalW) / 2;

    choices.forEach((relic, i) => {
      const x = startX + i * (cardW + gap) + cardW / 2;
      const y = M ? 360 : 280;
      this._renderRelic(relic, x, y, cardW, run);
    });

    // SKIP button
    this._makeButton(SIZES.W / 2, SIZES.H - 50, 'SKIP', '#333', '#666', () => {
      this._advance(run);
    });
  }

  _renderRelic(relic, x, y, w, run) {
    const h = 180;
    const bg = this.add.graphics();
    bg.fillStyle(0x1A1208, 0.9);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(2, 0xF5C518, 0.6);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    this.add.text(x, y - 50, relic.icon || '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(x, y - 15, relic.name, {
      fontFamily: 'Playfair Display', fontSize: '16px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(x, y + 20, relic.description || '', {
      fontFamily: 'Lora', fontSize: '11px', color: '#C0B898',
      wordWrap: { width: w - 20 }, align: 'center', lineSpacing: 2
    }).setOrigin(0.5, 0);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => bg.setAlpha(0.7));
    zone.on('pointerout', () => bg.setAlpha(1));
    zone.on('pointerup', () => {
      RunState.addRelic(relic);
      this._advance(run);
    });
  }

  _advance(run) {
    if (run.currentNode?.id != null) RunState.completeNode(run.currentNode.id);

    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => {
      if (run.act >= 3) {
        // Game won!
        this.scene.start('VictoryScene');
      } else {
        RunState.advanceAct();
        this.scene.start('MapScene');
      }
    });
  }

  _makeButton(x, y, label, fill, border, cb) {
    const M = isMobile();
    const w = M ? SIZES.W - 80 : 160, h = M ? 48 : 36;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 0.8);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(border).color, 0.6);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    this.add.text(x, y, label, { fontFamily: 'Share Tech Mono', fontSize: '13px', color: '#CCC' }).setOrigin(0.5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerup', cb);
  }
}
