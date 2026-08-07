/* RestScene — Newsroom: Recover (heal 30%) OR Refine (upgrade a card) */
import Phaser from 'phaser';
import { COLORS, SIZES, BALANCE, CARD_TYPE_COLORS, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class RestScene extends Phaser.Scene {
  constructor() { super('RestScene'); }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();
    this.upgradeMode = false;

    // Background
    const g = this.add.graphics();
    g.fillStyle(0x0D0B08, 0.95);
    g.fillRect(0, 0, SIZES.W, SIZES.H);

    // Title
    this.add.text(SIZES.W / 2, 40, '🏢 NEWSROOM', {
      fontFamily: 'Playfair Display', fontSize: '28px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(SIZES.W / 2, 80, 'Take a moment to regroup at the office.', {
      fontFamily: 'Lora', fontSize: '14px', color: '#C0B898', fontStyle: 'italic'
    }).setOrigin(0.5);

    // Current credibility
    this.add.text(SIZES.W / 2, 110, `Credibility: ${run.credibility}/${run.maxCredibility}`, {
      fontFamily: 'Share Tech Mono', fontSize: '13px', color: COLORS.RED
    }).setOrigin(0.5);

    const healAmount = Math.floor(run.maxCredibility * BALANCE.REST_HEAL_PERCENT);

    const M = isMobile();
    // RECOVER button
    const recX = M ? SIZES.W / 2 : SIZES.W / 2 - 140;
    const recY = M ? 200 : 200;
    this._makeButton(recX, recY, `RECOVER\n+${healAmount} Credibility`, COLORS.DARK_GREEN, COLORS.GREEN, () => {
      RunState.heal(healAmount);
      this._completeAndLeave();
    });

    // REFINE button
    const refX = M ? SIZES.W / 2 : SIZES.W / 2 + 140;
    const refY = M ? 290 : 200;
    this._makeButton(refX, refY, 'REFINE\nUpgrade a card', COLORS.DARK_BLUE, COLORS.BLUE, () => {
      this._showUpgradeUI(run);
    });

    // Container for upgrade UI (created on demand)
    this.upgradeContainer = this.add.container(0, 0);
  }

  _showUpgradeUI(run) {
    this.upgradeContainer.removeAll(true);
    const cardDefs = this.cache.json.get('cards-veteran') || [];

    // Show all cards in deck that aren't upgraded
    const upgradeable = run.deck.filter(entry => {
      if (entry.upgraded) return false;
      const def = cardDefs.find(c => c.id === entry.cardId);
      return def && def.upgrade;
    });

    if (upgradeable.length === 0) {
      const t = this.add.text(SIZES.W / 2, 350, 'No upgradeable cards in deck.', {
        fontFamily: 'Lora', fontSize: '14px', color: '#888'
      }).setOrigin(0.5);
      this.upgradeContainer.add(t);
      return;
    }

    const label = this.add.text(SIZES.W / 2, 300, 'Choose a card to upgrade:', {
      fontFamily: 'Lora', fontSize: '14px', color: '#C0B898'
    }).setOrigin(0.5);
    this.upgradeContainer.add(label);

    const M = isMobile();
    const cardW = M ? 110 : 100, cardH = 60, gap = 10;
    const perRow = M ? Math.min(upgradeable.length, 4) : Math.min(upgradeable.length, 7);
    const totalW = perRow * (cardW + gap) - gap;
    const startX = (SIZES.W - totalW) / 2;
    const gridStartY = M ? 430 : 350;

    upgradeable.forEach((entry, i) => {
      const def = cardDefs.find(c => c.id === entry.cardId);
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * (cardW + gap) + cardW / 2;
      const y = gridStartY + row * (cardH + gap + 10);

      const colors = CARD_TYPE_COLORS[def.type] || CARD_TYPE_COLORS.pressure;
      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, 0.9);
      bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 4);
      bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.7);
      bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 4);
      this.upgradeContainer.add(bg);

      const nameT = this.add.text(x, y - 8, def.name, {
        fontFamily: 'Playfair Display', fontSize: '10px', color: colors.text, fontStyle: 'bold',
        wordWrap: { width: cardW - 8 }, align: 'center'
      }).setOrigin(0.5);
      this.upgradeContainer.add(nameT);

      const upgradeHint = def.upgrade?.name ? `→ ${def.upgrade.name}` : '→ Upgraded';
      const hintT = this.add.text(x, y + 12, upgradeHint, {
        fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#F5C518'
      }).setOrigin(0.5);
      this.upgradeContainer.add(hintT);

      const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true });
      this.upgradeContainer.add(zone);
      zone.on('pointerup', () => {
        RunState.upgradeCard(entry.id);
        this._completeAndLeave();
      });
    });
  }

  _completeAndLeave() {
    const run = RunState.get();
    if (run.currentNode?.id != null) {
      RunState.completeNode(run.currentNode.id);
    }
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => this.scene.start('MapScene'));
  }

  _makeButton(x, y, label, fillColor, borderColor, cb) {
    const M = isMobile();
    const w = M ? SIZES.W - 80 : 200, h = M ? 80 : 70;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fillColor).color, 0.85);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(borderColor).color, 0.8);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    this.add.text(x, y, label, {
      fontFamily: 'Share Tech Mono', fontSize: '13px', color: COLORS.PAPER,
      align: 'center', lineSpacing: 4
    }).setOrigin(0.5);

    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerup', cb);
  }
}
