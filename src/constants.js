/* ─── Design Tokens ─── */

/* ─── Platform system ─── */
let _mobile = false;
export function isMobile() { return _mobile; }
export function setPlatform(platform) {
  _mobile = platform === 'mobile';
  const src = _mobile ? _MOBILE : _DESKTOP;
  for (const key of Object.keys(src)) SIZES[key] = src[key];
}

export const COLORS = {
  BG:       '#0D0B08',
  PAPER:    '#F5F0E8',
  PANEL:    '#1A1208',
  YELLOW:   '#F5C518',
  RED:      '#CC2222',
  GREEN:    '#4A8A6A',
  BLUE:     '#4A8ACA',
  PURPLE:   '#9A4ACA',
  GREY:     '#666666',
  MONEY:    '#C8AA40',
  DARK_RED: '#3D1515',
  DARK_GREEN:'#1D3A1D',
  DARK_BLUE:'#152030',
};

export const CARD_TYPE_COLORS = {
  pressure:  { fill: '#3D1515', border: '#CC2222', text: '#FF6666' },
  rapport:   { fill: '#152030', border: '#4A8ACA', text: '#88BBEE' },
  angle:     { fill: '#2D2810', border: '#C8AA40', text: '#F5C518' },
  spin:      { fill: '#1A1A1A', border: '#666666', text: '#999999' },
  lawsuit:   { fill: '#2D0A2D', border: '#9A4ACA', text: '#CC88EE' },
};

export const INTENT_COLORS = {
  ATTACK:     '#CC2222',
  GUARD:      '#4A8ACA',
  BUFF:       '#C8AA40',
  DEBUFF:     '#9A4ACA',
  SPIN:       '#666666',
  NO_COMMENT: '#555555',
  SUMMON:     '#CC2222',
};

const _DESKTOP = {
  W: 960, H: 600,
  SUBJECT_Y: 80, PLAY_AREA_Y: 200, HAND_Y: 505,
  HAND_CARD_W: 130, HAND_CARD_H: 175, HAND_GAP: 4,
  CARD_DETAIL_W: 220, CARD_DETAIL_H: 310,
  MAP_COLS: 7, MAP_ROWS: 15, MAP_NODE_R: 18,
  MAP_COL_W: 120, MAP_ROW_H: 100, HUD_H: 40,
};

const _MOBILE = {
  W: 540, H: 960,
  SUBJECT_Y: 100, PLAY_AREA_Y: 260, HAND_Y: 700,
  HAND_CARD_W: 130, HAND_CARD_H: 176, HAND_GAP: 4,
  CARD_DETAIL_W: 260, CARD_DETAIL_H: 340,
  MAP_COLS: 7, MAP_ROWS: 15, MAP_NODE_R: 24,
  MAP_COL_W: 72, MAP_ROW_H: 110, HUD_H: 52,
};

export const SIZES = { ..._DESKTOP };

export const FONTS = {
  HEADLINE:  { fontFamily: 'Playfair Display', fontSize: '20px', color: COLORS.PAPER, fontStyle: 'bold' },
  BODY:      { fontFamily: 'Lora',             fontSize: '14px', color: '#E0D8C0' },
  STAMP:     { fontFamily: 'Share Tech Mono',  fontSize: '11px', color: COLORS.YELLOW },
  METER:     { fontFamily: 'Share Tech Mono',  fontSize: '12px', color: COLORS.PAPER },
  BUTTON:    { fontFamily: 'Share Tech Mono',  fontSize: '14px', color: COLORS.PAPER },
  SCORE:     { fontFamily: 'Playfair Display', fontSize: '40px', color: COLORS.YELLOW, fontStyle: 'bold' },
  TITLE:     { fontFamily: 'Playfair Display', fontSize: '52px', color: COLORS.YELLOW, fontStyle: 'bold' },
  CARD_NAME: { fontFamily: 'Playfair Display', fontSize: '13px', color: COLORS.PAPER, fontStyle: 'bold' },
  CARD_BODY: { fontFamily: 'Lora',             fontSize: '11px', color: '#E0D8C0' },
  CARD_COST: { fontFamily: 'Share Tech Mono',  fontSize: '14px', color: '#FFF' },
  SMALL:     { fontFamily: 'Share Tech Mono',  fontSize: '10px', color: '#AAA' },
  INTENT:    { fontFamily: 'Share Tech Mono',  fontSize: '13px', color: '#FFF' },
  DAMAGE_POP:{ fontFamily: 'Playfair Display', fontSize: '28px', color: '#FF4444', fontStyle: 'bold' },
  HEAL_POP:  { fontFamily: 'Playfair Display', fontSize: '28px', color: '#44FF44', fontStyle: 'bold' },
  MAP_LABEL: { fontFamily: 'Share Tech Mono',  fontSize: '10px', color: '#CCC' },
};

// Balance constants
export const BALANCE = {
  STARTING_CREDIBILITY: 80,
  MAX_CREDIBILITY: 80,
  FOCUS_PER_TURN: 3,
  CARDS_PER_DRAW: 5,
  MAX_CONSUMABLES: 3,
  REST_HEAL_PERCENT: 0.30,
  CARD_REMOVE_COST: 75,
  CARD_REMOVE_COST_INCREMENT: 25,
  FLUSTERED_MULTIPLIER: 1.5,
  RATTLED_MULTIPLIER: 0.75,
  CORNERED_MULTIPLIER: 0.75,
  // Press Passes rewards
  NORMAL_REWARD_PP: [15, 20],
  ELITE_REWARD_PP: [30, 40],
  BOSS_REWARD_PP: [100, 120],
};

export const NODE_TYPES = {
  INTERVIEW:  { icon: '🎙️', label: 'Interview',     color: COLORS.GREEN },
  ELITE:      { icon: '😠', label: 'Hostile',        color: COLORS.RED },
  BOSS:       { icon: '🏛️', label: 'The Big Subject', color: COLORS.YELLOW },
  REST:       { icon: '🏢', label: 'Newsroom',       color: COLORS.GREEN },
  SHOP:       { icon: '🕵️', label: 'The Fixer',      color: COLORS.MONEY },
  TREASURE:   { icon: '📁', label: 'Leaked Doc',     color: COLORS.BLUE },
  UNKNOWN:    { icon: '📞', label: 'Anonymous Tip',   color: COLORS.PURPLE },
};
