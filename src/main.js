import Phaser from 'phaser';
import { COLORS, SIZES, setPlatform } from './constants.js';

import BootScene    from './scenes/BootScene.js';
import PlatformScene from './scenes/PlatformScene.js';
import MenuScene    from './scenes/MenuScene.js';
import MapScene     from './scenes/MapScene.js';
import InterviewScene   from './scenes/InterviewScene.js';
import CardRewardScene  from './scenes/CardRewardScene.js';
import RestScene    from './scenes/RestScene.js';
import ShopScene    from './scenes/ShopScene.js';
import EventScene   from './scenes/EventScene.js';
import TreasureScene    from './scenes/TreasureScene.js';
import BossRewardScene  from './scenes/BossRewardScene.js';
import VictoryScene from './scenes/VictoryScene.js';
import GameOverScene    from './scenes/GameOverScene.js';

// Restore saved platform preference
try {
  const saved = localStorage.getItem('scoop-platform');
  if (saved === 'mobile' || saved === 'desktop') {
    setPlatform(saved);
  }
} catch (e) { /* ok */ }

const config = {
  type: Phaser.AUTO,
  width: SIZES.W,
  height: SIZES.H,
  backgroundColor: COLORS.BG,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene, PlatformScene, MenuScene, MapScene, InterviewScene,
    CardRewardScene, RestScene, ShopScene, EventScene,
    TreasureScene, BossRewardScene, VictoryScene, GameOverScene,
  ],
};

document.fonts.ready.then(() => {
  const game = new Phaser.Game(config);
  window.__GAME__ = game; // debug access
});
