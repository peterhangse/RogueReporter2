/* DeckManager — draw/discard/exhaust pile management */
import RelicManager from './RelicManager.js';

export default class DeckManager {
  constructor() {
    this.drawPile = [];
    this.discardPile = [];
    this.exhaustPile = [];
    this.hand = [];
  }

  /** Initialize from the run deck (array of { id, cardId, upgraded }) and card definitions */
  init(deckEntries, cardDefs) {
    this.hand = [];
    this.discardPile = [];
    this.exhaustPile = [];

    // Build full card objects from entries + definitions
    this.drawPile = deckEntries.map(entry => {
      const def = cardDefs.find(c => c.id === entry.cardId);
      if (!def) {
        console.warn(`[DeckManager] Unknown card: ${entry.cardId}`);
        return null;
      }
      return {
        ...def,
        instanceId: entry.id,
        upgraded: entry.upgraded,
        // Apply upgrade overrides
        ...(entry.upgraded && def.upgrade ? def.upgrade : {}),
        name: entry.upgraded && def.upgrade?.name ? def.upgrade.name : def.name,
      };
    }).filter(Boolean);

    // Float Innate cards to top
    const innate = this.drawPile.filter(c => c.keywords?.includes('innate'));
    const rest = this.drawPile.filter(c => !c.keywords?.includes('innate'));
    this.drawPile = [...this._shuffle(rest), ...innate];
  }

  draw(count) {
    const MAX_HAND = 10;
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= MAX_HAND) break;
      if (this.drawPile.length === 0) {
        this._reshuffleDiscard();
        if (this.drawPile.length === 0) break;
      }
      const card = this.drawPile.pop();
      this.hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  discard(card) {
    this.hand = this.hand.filter(c => c.instanceId !== card.instanceId);
    this.discardPile.push(card);
  }

  exhaust(card) {
    this.hand = this.hand.filter(c => c.instanceId !== card.instanceId);
    this.exhaustPile.push(card);
    // Trigger onExhaust relic hook
    RelicManager.trigger('onExhaust', this._combat, { card });
  }

  discardHand() {
    const discarded = [];
    const retained = [];
    for (const card of this.hand) {
      if (card.keywords?.includes('retain')) {
        retained.push(card);
      } else {
        // Ethereal cards exhaust instead of discard
        if (card.keywords?.includes('ethereal')) {
          this.exhaustPile.push(card);
        } else {
          this.discardPile.push(card);
        }
        discarded.push(card);
      }
    }
    this.hand = retained;
    return discarded;
  }

  _reshuffleDiscard() {
    this.drawPile = this._shuffle([...this.discardPile]);
    this.discardPile = [];
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getHandSize() { return this.hand.length; }
  getDrawSize() { return this.drawPile.length; }
  getDiscardSize() { return this.discardPile.length; }
  getExhaustSize() { return this.exhaustPile.length; }
}
