/* ShopScene — The Fixer: buy cards, relics, consumables, remove cards */
import Phaser from 'phaser';
import { COLORS, SIZES, BALANCE, CARD_TYPE_COLORS, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';

export default class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();

    // Persist shop inventory so scene restart doesn't re-randomize
    if (!run._shopInventory) {
      const allCards = this.cache.json.get('cards-veteran') || [];
      const buyableCards = allCards.filter(c => c.rarity && c.rarity !== 'starter' && c.type !== 'spin' && c.type !== 'lawsuit');
      const shopCards = Phaser.Utils.Array.Shuffle([...buyableCards]).slice(0, 5);
      const discountIdx = Math.floor(Math.random() * shopCards.length);

      const allRelics = this.cache.json.get('relics') || [];
      const buyableRelics = allRelics.filter(r => !run.relics.find(rr => rr.id === r.id) && r.tier !== 'starter' && r.tier !== 'boss');
      const shopRelics = Phaser.Utils.Array.Shuffle([...buyableRelics]).slice(0, 2);

      const allConsumables = this.cache.json.get('consumables') || [];
      const shopConsumables = Phaser.Utils.Array.Shuffle([...allConsumables]).slice(0, 2);

      run._shopInventory = {
        cards: shopCards.map((c, i) => ({ card: c, price: Math.floor(this._cardPrice(c) * (i === discountIdx ? 0.5 : 1)), isDiscount: i === discountIdx, sold: false })),
        relics: shopRelics.map(r => ({ relic: r, price: r.shopPrice || 150, sold: false })),
        consumables: shopConsumables.map(c => ({ consumable: c, price: c.price || 50, sold: false })),
      };
    }

    const shop = run._shopInventory;

    const M = isMobile();

    // Background
    this.add.graphics().fillStyle(0x0D0B08, 0.95).fillRect(0, 0, SIZES.W, SIZES.H);

    // Title
    this.add.text(SIZES.W / 2, 30, '🕵️ THE FIXER', {
      fontFamily: 'Playfair Display', fontSize: M ? '28px' : '26px', color: COLORS.MONEY, fontStyle: 'bold'
    }).setOrigin(0.5);

    // Press Passes
    this.ppText = this.add.text(SIZES.W / 2, 60, `💰 ${run.pressPasses}`, {
      fontFamily: 'Share Tech Mono', fontSize: M ? '15px' : '14px', color: COLORS.MONEY
    }).setOrigin(0.5);

    // ─── Cards for sale ───
    const cardCols = M ? 2 : 5;
    const cardGapX = M ? 10 : 160;
    const cardStartX = M ? 20 : 80;
    const cardW = M ? (SIZES.W - 60) / 2 : 140;
    this.add.text(cardStartX, 95, 'QUESTIONS', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '12px' : '11px', color: '#888'
    });

    shop.cards.forEach((item, i) => {
      if (item.sold) return;
      const col = M ? i % cardCols : i;
      const row = M ? Math.floor(i / cardCols) : 0;
      const x = M ? cardStartX + col * (cardW + 10) : 80 + i * 160;
      const y = M ? 155 + row * 130 : 160;
      this._renderShopCard(item.card, x, y, item.price, run, item.isDiscount, item, cardW);
    });

    // ─── Relics for sale ───
    const relicStartY = M ? 420 : 280;
    this.add.text(M ? 20 : 80, relicStartY, 'RELICS', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '12px' : '11px', color: '#888'
    });

    shop.relics.forEach((item, i) => {
      if (item.sold) return;
      const rx = M ? 20 + i * (SIZES.W / 2 - 10) : 80 + i * 200;
      const ry = relicStartY + 50;
      this._renderShopRelic(item.relic, rx, ry, item.price, run, item);
    });

    // ─── Consumables ───
    const consStartY = M ? 560 : 280;
    this.add.text(M ? 20 : 500, consStartY, 'CONSUMABLES', {
      fontFamily: 'Share Tech Mono', fontSize: M ? '12px' : '11px', color: '#888'
    });

    shop.consumables.forEach((item, i) => {
      if (item.sold) return;
      const cx = M ? 20 + i * (SIZES.W / 2 - 10) : 500 + i * 180;
      const cy = consStartY + 50;
      this._renderShopConsumable(item.consumable, cx, cy, item.price, run, item);
    });

    // ─── Remove a card ───
    const removeCost = BALANCE.CARD_REMOVE_COST + (run.cardRemoveCount || 0) * BALANCE.CARD_REMOVE_COST_INCREMENT;
    const removeY = M ? 700 : 440;
    this._makeButton(SIZES.W / 2, removeY, `REMOVE A CARD (-${removeCost} 💰)`, '#2D0A2D', '#9A4ACA', () => {
      if (run.pressPasses < removeCost) return;
      this._showCardRemovalPicker(removeCost);
    });

    // Leave button
    this._makeButton(SIZES.W / 2, SIZES.H - (M ? 60 : 40), 'LEAVE', '#1A1A1A', '#555', () => {
      if (run.currentNode?.id != null) RunState.completeNode(run.currentNode.id);
      delete run._shopInventory; // Clean up temp data
      RunState.save();
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('MapScene'));
    });
  }

  _cardPrice(card) {
    const prices = { common: 50, uncommon: 75, rare: 150 };
    return prices[card.rarity] || 50;
  }

  _renderShopCard(card, x, y, price, run, isDiscount, shopItem, overrideW) {
    const colors = CARD_TYPE_COLORS[card.type] || CARD_TYPE_COLORS.pressure;
    const M = isMobile();
    const w = overrideW || (M ? 230 : 140), h = M ? 115 : 120;

    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, 0.85);
    bg.fillRoundedRect(x, y - h / 2, w, h, 6);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.7);
    bg.strokeRoundedRect(x, y - h / 2, w, h, 6);

    // Name
    this.add.text(x + w / 2, y - h / 2 + 15, card.name, {
      fontFamily: 'Playfair Display', fontSize: '11px', color: colors.text, fontStyle: 'bold',
      wordWrap: { width: w - 10 }, align: 'center'
    }).setOrigin(0.5, 0);

    // Cost & effects
    const effStr = (card.effects || []).map(e => {
      if (e.type === 'pressure') return `${e.value} P`;
      if (e.type === 'rapport') return `${e.value} R`;
      if (e.type === 'draw') return `Draw ${e.value}`;
      return '';
    }).filter(Boolean).join(', ');

    this.add.text(x + w / 2, y + 5, `[${card.focusCost}] ${effStr}`, {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#AAA'
    }).setOrigin(0.5);

    // Price
    const priceColor = isDiscount ? '#44FF44' : COLORS.MONEY;
    this.add.text(x + w / 2, y + h / 2 - 15, `${price} 💰${isDiscount ? ' SALE!' : ''}`, {
      fontFamily: 'Share Tech Mono', fontSize: '11px', color: priceColor
    }).setOrigin(0.5);

    // Buy zone
    const zone = this.add.zone(x + w / 2, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (run.pressPasses < price) return;
      RunState.spendPressPasses(price);
      RunState.addCard({ id: `${card.id}-${Date.now()}`, cardId: card.id, upgraded: false });
      shopItem.sold = true;
      zone.disableInteractive();
      bg.setAlpha(0.3);
      this.ppText.setText(`💰 ${RunState.get().pressPasses}`);
    });
  }

  _renderShopRelic(relic, x, y, price, run, shopItem) {
    const w = 180, h = 80;
    const bg = this.add.graphics();
    bg.fillStyle(0x1A1208, 0.85);
    bg.fillRoundedRect(x, y - h / 2, w, h, 6);
    bg.lineStyle(1, 0xC8AA40, 0.5);
    bg.strokeRoundedRect(x, y - h / 2, w, h, 6);

    this.add.text(x + 10, y - 15, `${relic.icon || '📦'} ${relic.name}`, {
      fontFamily: 'Playfair Display', fontSize: '12px', color: COLORS.PAPER, fontStyle: 'bold'
    }).setOrigin(0);

    // Show relic description
    this.add.text(x + 10, y + 3, relic.description || '', {
      fontFamily: 'Lora', fontSize: '9px', color: '#999',
      wordWrap: { width: w - 20 }
    }).setOrigin(0);

    this.add.text(x + 10, y + h / 2 - 12, `${price} 💰`, {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: COLORS.MONEY
    }).setOrigin(0);

    const zone = this.add.zone(x + w / 2, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (run.pressPasses < price) return;
      RunState.spendPressPasses(price);
      RunState.addRelic(relic);
      shopItem.sold = true;
      zone.disableInteractive();
      bg.setAlpha(0.3);
      this.ppText.setText(`💰 ${RunState.get().pressPasses}`);
    });
  }

  _renderShopConsumable(c, x, y, price, run, shopItem) {
    const w = 160, h = 60;
    const bg = this.add.graphics();
    bg.fillStyle(0x1A1208, 0.85);
    bg.fillRoundedRect(x, y - h / 2, w, h, 6);
    bg.lineStyle(1, 0x4A8ACA, 0.5);
    bg.strokeRoundedRect(x, y - h / 2, w, h, 6);

    this.add.text(x + 10, y - 8, `${c.icon || '🧪'} ${c.name}`, {
      fontFamily: 'Playfair Display', fontSize: '12px', color: COLORS.PAPER
    }).setOrigin(0);

    this.add.text(x + 10, y + 10, `${price} 💰`, {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: COLORS.MONEY
    }).setOrigin(0);

    const zone = this.add.zone(x + w / 2, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (run.pressPasses < price || run.consumables.length >= BALANCE.MAX_CONSUMABLES) return;
      RunState.spendPressPasses(price);
      RunState.addConsumable(c);
      shopItem.sold = true;
      zone.disableInteractive();
      bg.setAlpha(0.3);
      this.ppText.setText(`💰 ${RunState.get().pressPasses}`);
    });
  }

  _showCardRemovalPicker(cost) {
    const allCards = this.cache.json.get('cards-veteran') || [];
    const run = RunState.get();
    // Allow removing any card except Spin (lawsuits/curses CAN be removed)
    const removable = run.deck.filter(entry => {
      const def = allCards.find(c => c.id === entry.cardId);
      return def && def.type !== 'spin';
    });

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0D0B08, 0.92);
    overlay.fillRect(0, 0, SIZES.W, SIZES.H);
    overlay.setDepth(100).setInteractive(new Phaser.Geom.Rectangle(0, 0, SIZES.W, SIZES.H), Phaser.Geom.Rectangle.Contains);

    const title = this.add.text(SIZES.W / 2, 30, 'CHOOSE A CARD TO REMOVE', {
      fontFamily: 'Share Tech Mono', fontSize: '14px', color: '#9A4ACA'
    }).setOrigin(0.5).setDepth(101);

    const items = [];
    const M = isMobile();
    const cols = M ? 3 : 5;
    const cardW = M ? (SIZES.W - 40) / 3 - 8 : 145, cardH = M ? 48 : 42;
    removable.forEach((entry, i) => {
      const def = allCards.find(c => c.id === entry.cardId);
      if (!def) return;
      const colors = CARD_TYPE_COLORS[def.type] || CARD_TYPE_COLORS.pressure;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = M ? 20 + col * (cardW + 8) : 90 + col * (cardW + 10);
      const cy = (M ? 80 : 75) + row * (cardH + 8);

      const cardBg = this.add.graphics().setDepth(101);
      cardBg.fillStyle(Phaser.Display.Color.HexStringToColor(colors.fill).color, 0.85);
      cardBg.fillRoundedRect(cx, cy, cardW, cardH, 4);
      cardBg.lineStyle(1, Phaser.Display.Color.HexStringToColor(colors.border).color, 0.7);
      cardBg.strokeRoundedRect(cx, cy, cardW, cardH, 4);

      const costLabel = this.add.text(cx + 4, cy + 4, `[${def.focusCost}]`, {
        fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#FFF'
      }).setDepth(102);
      const nameLabel = this.add.text(cx + 28, cy + 4, `${entry.upgraded ? '★ ' : ''}${def.name}`, {
        fontFamily: 'Playfair Display', fontSize: '11px', color: colors.text
      }).setDepth(102);
      const typeLabel = this.add.text(cx + 28, cy + 22, def.type, {
        fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#888'
      }).setDepth(102);

      const zone = this.add.zone(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true }).setDepth(103);
      zone.on('pointerover', () => cardBg.setAlpha(0.6));
      zone.on('pointerout', () => cardBg.setAlpha(1));
      zone.on('pointerup', () => {
        RunState.spendPressPasses(cost);
        RunState.removeCard(entry.id);
        run.cardRemoveCount = (run.cardRemoveCount || 0) + 1;
        RunState.save();
        this.scene.restart();
      });
      items.push(cardBg, costLabel, nameLabel, typeLabel, zone);
    });

    const cancel = this.add.text(SIZES.W / 2, SIZES.H - 40, 'CANCEL', {
      fontFamily: 'Share Tech Mono', fontSize: '13px', color: '#888'
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    cancel.on('pointerup', () => {
      overlay.destroy();
      title.destroy();
      cancel.destroy();
      items.forEach(t => t.destroy());
    });
  }

  _makeButton(x, y, label, fill, border, cb) {
    const M = isMobile();
    const w = M ? SIZES.W - 80 : 260, h = M ? 48 : 36;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 0.8);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(border).color, 0.6);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    this.add.text(x, y, label, {
      fontFamily: 'Share Tech Mono', fontSize: M ? '14px' : '12px', color: '#CCC'
    }).setOrigin(0.5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerup', cb);
  }
}
