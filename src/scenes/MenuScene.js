import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, isMobile, setPlatform } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const cx = SIZES.W / 2;
    const M = isMobile();

    // Newspaper background grid
    const g = this.add.graphics();
    g.lineStyle(1, 0x1A1208, 0.15);
    for (let x = 0; x < SIZES.W; x += 14) { g.moveTo(x, 0); g.lineTo(x, SIZES.H); }
    for (let y = 0; y < SIZES.H; y += 14) { g.moveTo(0, y); g.lineTo(SIZES.W, y); }
    g.strokePath();

    // Masthead
    const mastY = M ? 100 : 50;
    this.add.text(cx, mastY, 'THE DAILY EXPOSÉ', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '15px' : '14px', color: '#888'
    }).setOrigin(0.5);

    // Double rule
    const ruleW = M ? 180 : 200;
    const ruleY = M ? 120 : 70;
    const rule = this.add.graphics();
    rule.lineStyle(2, 0xF5C518, 0.6);
    rule.moveTo(cx - ruleW, ruleY); rule.lineTo(cx + ruleW, ruleY);
    rule.moveTo(cx - ruleW, ruleY + 4); rule.lineTo(cx + ruleW, ruleY + 4);
    rule.strokePath();

    // Title
    const titleSz = M ? '48px' : '64px';
    const titleY = M ? 190 : 140;
    this.add.text(cx, titleY, 'THE SCOOP', {
      fontFamily: 'Playfair Display', fontSize: titleSz, color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    const subY = M ? 240 : 195;
    this.add.text(cx, subY, 'A journalism roguelike', {
      fontFamily: 'Lora', fontSize: M ? '17px' : '16px', color: '#C0B898', fontStyle: 'italic'
    }).setOrigin(0.5);

    // Teaser
    const teaseY = M ? 290 : 250;
    this.add.text(cx, teaseY, '"City Hall rattled as anonymous source leaks documents to press"', {
      fontFamily: 'Special Elite', fontSize: M ? '14px' : '13px', color: '#888',
      wordWrap: { width: M ? SIZES.W - 60 : 500 }, align: 'center'
    }).setOrigin(0.5);

    // Buttons
    const btnGap = M ? 70 : 60;
    const btnStartY = M ? 400 : 340;
    const btnW = M ? SIZES.W - 80 : 260;
    const btnH = M ? 56 : 42;

    this._makeButton(cx, btnStartY, 'NY UTREDNING', COLORS.DARK_GREEN, COLORS.GREEN, () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        RunState.fresh();
        this.scene.start('MapScene');
      });
    }, 1, btnW, btnH);

    this._makeButton(cx, btnStartY + btnGap, 'FORTSÄTT', '#1A1A1A', '#555', () => {
      if (!RunState.hasSave()) return;
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        RunState.load();
        this.scene.start('MapScene');
      });
    }, RunState.hasSave() ? 1 : 0.35, btnW, btnH);

    // How to play
    this._makeButton(cx, btnStartY + btnGap * 2, 'HUR MAN SPELAR', '#1A1A1A', '#888', () => {
      this._showHowToPlay();
    }, 1, btnW, btnH);

    // Switch platform button
    const switchLabel = M ? '💻 Byt till dator' : '📱 Byt till mobil';
    this._makeButton(cx, btnStartY + btnGap * 3, switchLabel, '#1A1A1A', '#555', () => {
      const newPlatform = M ? 'desktop' : 'mobile';
      setPlatform(newPlatform);
      try { localStorage.setItem('scoop-platform', newPlatform); } catch (e) { /* ok */ }
      this.scale.resize(SIZES.W, SIZES.H);
      const container = document.getElementById('game-container');
      if (container) { container.style.width = SIZES.W + 'px'; container.style.height = SIZES.H + 'px'; }
      this.scene.restart();
    }, 0.6, btnW, btnH);

    // Footer
    this.add.text(cx, SIZES.H - 30, 'Slay the Spire meets investigative journalism', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '11px' : '10px', color: '#555'
    }).setOrigin(0.5);
  }

  _makeButton(x, y, label, fillColor, borderColor, cb, alpha = 1, w = 260, h = 42) {
    const r = 6;
    const fSz = isMobile() ? '16px' : '14px';
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fillColor).color, 0.9);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(borderColor).color, 0.8);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    bg.setAlpha(alpha);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Share Tech Mono', fontSize: fSz, color: COLORS.PAPER
    }).setOrigin(0.5).setAlpha(alpha);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.setAlpha(alpha);
    zone.on('pointerover', () => { if (alpha >= 1) { bg.setAlpha(0.8); txt.setAlpha(0.8); }});
    zone.on('pointerout',  () => { bg.setAlpha(alpha); txt.setAlpha(alpha); });
    zone.on('pointerup',   () => { if (alpha >= 1) cb(); });
  }

  _showHowToPlay() {
    const M = isMobile();
    const items = [];
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0D0B08, 0.96);
    overlay.fillRect(0, 0, SIZES.W, SIZES.H);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, SIZES.W, SIZES.H), Phaser.Geom.Rectangle.Contains);
    items.push(overlay);

    items.push(this.add.text(SIZES.W / 2, 30, 'HOW TO PLAY', {
      fontFamily: 'Playfair Display', fontSize: M ? '26px' : '24px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5));

    const sections = [
      ['🎙️ THE GOAL', 'You are an investigative journalist. Interview subjects, break through their composure, and crack the story across 3 acts.'],
      ['🃏 CARDS', M
        ? 'Each turn: draw 5 cards, get 3 Focus.\n• Pressure (red) — damage\n• Rapport (blue) — block (resets each turn!)\n• Angle (gold) — exhausts after use\n• Spin/Lawsuit — unplayable!\nTap cards to play them.'
        : 'Each turn you draw 5 cards and get 3 Focus.\n• Pressure (red) — deal damage to break composure\n• Rapport (blue) — block incoming damage (resets each turn!)\n• Angle (gold) — powerful persistent effects, exhaust after use\n• Spin (grey) — clutter added by subjects, unplayable!\n• Lawsuit (purple) — legal trouble, unplayable!\nDrag cards UP into the subject area to play them.'],
      ['⚡ FOCUS', 'Cards cost Focus (shown on orb). Focus refills each turn. Some cards cost 0, some cost X (all remaining focus). Plan your plays wisely!'],
      ['❤️ CREDIBILITY & 🛡️ RAPPORT', 'Credibility is your HP — reach 0 and your career is over. Subjects attack each turn.\nRapport absorbs damage before Credibility. ⚠️ Rapport resets to 0 each turn!'],
      ['🗺️ THE MAP', '🎙️ Interview · 😠 Hostile elite · 🏛️ Boss\n🏢 Newsroom (rest/upgrade) · 🕵️ Fixer (shop)\n📁 Leaked Docs (treasure) · 📞 Anonymous Tips (events)'],
      ['📝 KEYWORDS', 'Exhaust — removed this fight · Ethereal — exhausts if not played\nRetain — stays in hand · Innate — drawn turn 1\nGuarded — absorbs pressure · Flustered — takes 50% more pressure'],
    ];

    const sectionGap = M ? 90 : 75;
    const titleSz = M ? '14px' : '13px';
    const bodySz = M ? '12px' : '11px';
    const wrapW = SIZES.W - (M ? 60 : 100);

    sections.forEach(([title, body], i) => {
      const y = (M ? 80 : 70) + i * sectionGap;
      items.push(this.add.text(M ? 30 : 50, y, title, {
        fontFamily: 'Share Tech Mono', fontSize: titleSz, color: COLORS.YELLOW
      }));
      items.push(this.add.text(M ? 30 : 50, y + 18, body, {
        fontFamily: 'Lora', fontSize: bodySz, color: '#C0B898',
        wordWrap: { width: wrapW }, lineSpacing: 2
      }));
    });

    const closeBtn = this.add.text(SIZES.W / 2, SIZES.H - 30, 'CLOSE', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '16px' : '14px', color: COLORS.PAPER
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => { items.forEach(i => i.destroy()); closeBtn.destroy(); });
    items.push(closeBtn);
  }
}
