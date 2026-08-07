import Phaser from 'phaser';
import { COLORS, SIZES } from '../constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Loading bar
    const bar = this.add.graphics();
    this.load.on('progress', v => {
      bar.clear();
      bar.fillStyle(0xF5C518, 1);
      bar.fillRect(SIZES.W * 0.2, SIZES.H / 2, SIZES.W * 0.6 * v, 6);
    });
    this.load.on('complete', () => bar.destroy());
    this.load.on('loaderror', (file) => {
      console.error('[BootScene] Failed to load:', file.key);
    });

    // JSON data
    this.load.json('cards-veteran',    'data/cards-veteran.json');
    this.load.json('subjects-act1',    'data/subjects-act1.json');
    this.load.json('subjects-act2',    'data/subjects-act2.json');
    this.load.json('subjects-act3',    'data/subjects-act3.json');
    this.load.json('relics',           'data/relics.json');
    this.load.json('consumables',      'data/consumables.json');
    this.load.json('events',           'data/events.json');
  }

  create() {
    // Skip platform picker if user already chose (stored in localStorage)
    let saved = null;
    try { saved = localStorage.getItem('scoop-platform'); } catch (e) { /* ok */ }
    if (saved === 'mobile' || saved === 'desktop') {
      this.scene.start('MenuScene');
    } else {
      this.scene.start('PlatformScene');
    }
  }
}
