/* PlatformScene — choose mobile or desktop before starting the game */
import Phaser from 'phaser';
import { COLORS, SIZES, setPlatform } from '../constants.js';

export default class PlatformScene extends Phaser.Scene {
  constructor() { super('PlatformScene'); }

  create() {
    const W = SIZES.W, H = SIZES.H;

    // Background
    this.add.graphics().fillStyle(0x0D0B08, 1).fillRect(0, 0, W, H);

    // Subtle grid
    const g = this.add.graphics();
    g.lineStyle(1, 0x1A1208, 0.15);
    for (let x = 0; x < W; x += 14) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y < H; y += 14) { g.moveTo(0, y); g.lineTo(W, y); }
    g.strokePath();

    // Double rule
    const rule = this.add.graphics();
    rule.lineStyle(2, 0xF5C518, 0.6);
    rule.moveTo(W / 2 - 200, 100); rule.lineTo(W / 2 + 200, 100);
    rule.moveTo(W / 2 - 200, 104); rule.lineTo(W / 2 + 200, 104);
    rule.strokePath();

    // Title
    this.add.text(W / 2, 150, 'THE SCOOP', {
      fontFamily: 'Playfair Display', fontSize: '52px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Choose label
    this.add.text(W / 2, 230, 'Välj plattform / Choose platform', {
      fontFamily: 'Lora', fontSize: '16px', color: '#C0B898', fontStyle: 'italic'
    }).setOrigin(0.5);

    // Auto-detect hint
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      this.add.text(W / 2, 260, '📱 Touch detected – Mobile rekommenderas', {
        fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#888'
      }).setOrigin(0.5);
    }

    // ─── DESKTOP BUTTON ───
    this._makePlatformButton(W / 2 - 170, 360, '💻', 'DATOR', 'Mus & tangentbord\n960 × 600 landskap', () => {
      this._selectPlatform('desktop');
    });

    // ─── MOBILE BUTTON ───
    this._makePlatformButton(W / 2 + 170, 360, '📱', 'MOBIL', 'Touch-optimerat\n540 × 960 porträtt', () => {
      this._selectPlatform('mobile');
    });

    // Footer
    this.add.text(W / 2, H - 30, 'Du kan byta när som helst från huvudmenyn', {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#555'
    }).setOrigin(0.5);
  }

  _makePlatformButton(x, y, icon, label, desc, cb) {
    const w = 260, h = 160;
    const bg = this.add.graphics();
    bg.fillStyle(0x1A1208, 0.85);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    bg.lineStyle(2, 0xF5C518, 0.5);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

    this.add.text(x, y - 40, icon, { fontSize: '48px' }).setOrigin(0.5);
    this.add.text(x, y + 15, label, {
      fontFamily: 'Share Tech Mono', fontSize: '20px', color: COLORS.PAPER, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(x, y + 50, desc, {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#888',
      align: 'center', lineSpacing: 2
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => bg.setAlpha(0.6));
    zone.on('pointerout', () => bg.setAlpha(1));
    zone.on('pointerup', () => cb());
  }

  _selectPlatform(platform) {
    setPlatform(platform);

    // Resize game canvas
    this.scale.resize(SIZES.W, SIZES.H);

    // Update HTML container
    const container = document.getElementById('game-container');
    if (container) {
      container.style.width = SIZES.W + 'px';
      container.style.height = SIZES.H + 'px';
    }

    // Store choice for reload
    try { localStorage.setItem('scoop-platform', platform); } catch (e) { /* ok */ }

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('MenuScene');
    });
  }
}
