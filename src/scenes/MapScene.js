import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, NODE_TYPES, BALANCE, isMobile } from '../constants.js';
import RunState from '../engine/RunState.js';
import MapGenerator from '../engine/MapGenerator.js';

export default class MapScene extends Phaser.Scene {
  constructor() { super('MapScene'); }

  create() {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    const run = RunState.get();
    const M = isMobile();

    // Generate map if needed
    if (!run.currentMap) {
      run.currentMap = MapGenerator.generate(run.act);
      RunState.save();
    }

    const map = run.currentMap;
    const totalH = (map.rows + 2) * SIZES.MAP_ROW_H;
    const offsetX = (SIZES.W - (SIZES.MAP_COLS - 1) * SIZES.MAP_COL_W) / 2;
    const headerH = M ? 58 : 50;

    // HUD background
    const hud = this.add.graphics();
    hud.fillStyle(0x0D0B08, 1);
    hud.fillRect(0, 0, SIZES.W, headerH);
    hud.setScrollFactor(0).setDepth(100);

    // Act label
    const actNames = ['', 'Lokalpressen', 'Regionalnytt', 'Riksmedia'];
    this.add.text(SIZES.W / 2, 12, `ACT ${run.act}: ${actNames[run.act]}`, {
      fontFamily: 'Playfair Display', fontSize: M ? '18px' : '16px', color: COLORS.YELLOW, fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Credibility
    this.add.text(10, 12, `❤️ ${run.credibility}/${run.maxCredibility}`, {
      fontFamily: 'Share Tech Mono', fontSize: M ? '14px' : '13px', color: COLORS.RED
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    // Press Passes
    this.add.text(10, M ? 32 : 30, `💰 ${run.pressPasses}`, {
      fontFamily: 'Share Tech Mono', fontSize: M ? '12px' : '11px', color: COLORS.MONEY
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    // Deck count + Floor
    this.add.text(SIZES.W - 10, 12, `📇 ${run.deck.length}`, {
      fontFamily: 'Share Tech Mono', fontSize: M ? '14px' : '13px', color: COLORS.PAPER
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.add.text(SIZES.W / 2, M ? 34 : 32, `Floor ${run.floor}/${map.rows}`, {
      fontFamily: 'Share Tech Mono', fontSize: M ? '11px' : '10px', color: '#666'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Relic icons with tooltips
    this.mapTooltip = null;
    const relicGap = M ? 28 : 22;
    const relicSz = M ? '18px' : '14px';
    run.relics.forEach((r, i) => {
      const relicText = this.add.text(SIZES.W - 10 - i * relicGap, M ? 34 : 30, r.icon || '📦', {
        fontSize: relicSz
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(101)
        .setInteractive({ useHandCursor: true });

      relicText.on('pointerover', () => {
        if (this.mapTooltip) this.mapTooltip.destroy();
        const desc = `${r.name}: ${r.description || ''}`;
        const txt = this.add.text(0, 0, desc, {
          fontFamily: 'Share Tech Mono', fontSize: M ? '12px' : '10px', color: '#F5F0E8',
          wordWrap: { width: M ? 250 : 220 }
        }).setScrollFactor(0).setDepth(201);
        const tw = txt.width + 12;
        const th = txt.height + 8;
        const tx = Math.max(5, SIZES.W - 10 - i * relicGap - tw);
        const tty = headerH + 2;
        const bg = this.add.graphics()
          .fillStyle(0x0D0B08, 0.95).fillRoundedRect(tx, tty, tw, th, 4)
          .lineStyle(1, 0xF5C518, 0.4).strokeRoundedRect(tx, tty, tw, th, 4)
          .setScrollFactor(0).setDepth(200);
        txt.setPosition(tx + 6, tty + 4);
        this.mapTooltip = this.add.container(0, 0, [bg, txt]).setScrollFactor(0).setDepth(200);
      });
      relicText.on('pointerout', () => {
        if (this.mapTooltip) { this.mapTooltip.destroy(); this.mapTooltip = null; }
      });
    });

    // Determine available nodes
    const available = this._getAvailableNodes(map, run);

    // Draw paths
    const pathG = this.add.graphics();
    pathG.lineStyle(2, 0x555555, 0.4);
    for (const node of map.nodes) {
      for (const childId of node.paths) {
        const child = map.nodes.find(n => n.id === childId);
        if (!child) continue;
        const x1 = offsetX + node.col * SIZES.MAP_COL_W;
        const y1 = headerH + (map.rows - node.row) * SIZES.MAP_ROW_H + SIZES.MAP_ROW_H;
        const x2 = offsetX + child.col * SIZES.MAP_COL_W;
        const y2 = headerH + (map.rows - child.row) * SIZES.MAP_ROW_H + SIZES.MAP_ROW_H;

        // Highlight paths from completed nodes
        const isAvailablePath = run.completedNodes.includes(node.id) && available.includes(childId);
        if (isAvailablePath) {
          pathG.lineStyle(2.5, 0xF5C518, 0.6);
        } else {
          pathG.lineStyle(2, 0x555555, 0.3);
        }
        pathG.moveTo(x1, y1);
        pathG.lineTo(x2, y2);
      }
    }
    pathG.strokePath();

    // Draw nodes
    for (const node of map.nodes) {
      const x = offsetX + node.col * SIZES.MAP_COL_W;
      const y = headerH + (map.rows - node.row) * SIZES.MAP_ROW_H + SIZES.MAP_ROW_H;
      const nt = NODE_TYPES[node.type] || NODE_TYPES.INTERVIEW;
      const isCompleted = run.completedNodes.includes(node.id);
      const isAvailable = available.includes(node.id);

      // Node circle
      const g = this.add.graphics();
      if (isCompleted) {
        g.fillStyle(0x333333, 0.5);
        g.fillCircle(x, y, SIZES.MAP_NODE_R);
      } else if (isAvailable) {
        g.fillStyle(Phaser.Display.Color.HexStringToColor(nt.color).color, 0.8);
        g.fillCircle(x, y, SIZES.MAP_NODE_R);
        g.lineStyle(2, 0xF5C518, 1);
        g.strokeCircle(x, y, SIZES.MAP_NODE_R + 2);

        // Pulsing glow
        this.tweens.add({
          targets: g, alpha: 0.5, duration: 600, yoyo: true, repeat: -1
        });
      } else {
        g.fillStyle(0x222222, 0.5);
        g.fillCircle(x, y, SIZES.MAP_NODE_R);
      }

      // Icon
      const alpha = isCompleted ? 0.4 : isAvailable ? 1 : 0.4;
      this.add.text(x, y, nt.icon, { fontSize: M ? '22px' : '18px' }).setOrigin(0.5).setAlpha(alpha);

      // Label below — show for available AND completed nodes
      if (isAvailable || isCompleted) {
        const labelColor = isCompleted ? '#666' : nt.color;
        const labelText = isCompleted ? `✓ ${nt.label}` : nt.label;
        this.add.text(x, y + SIZES.MAP_NODE_R + 8, labelText, {
          ...FONTS.MAP_LABEL, fontSize: M ? '12px' : '10px', color: labelColor
        }).setOrigin(0.5);
      }

      // Click handler
      if (isAvailable) {
        const hitR = M ? SIZES.MAP_NODE_R * 3 : SIZES.MAP_NODE_R * 2.5;
        const zone = this.add.zone(x, y, hitR, hitR)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => this._selectNode(node, run));

        // Hover tooltip describing node type
        const nodeDescs = {
          INTERVIEW: 'Standard card combat.\nDefeat the subject to progress.',
          ELITE: 'Tough encounter.\nHigher reward + a relic.',
          BOSS: 'Act boss fight.\nMust defeat to advance.',
          REST: 'Heal 30% HP or\nupgrade a card.',
          SHOP: 'Buy cards, relics,\nor remove a card.',
          TREASURE: 'Free relic from\nthe leaked documents.',
          UNKNOWN: 'Random event with\nmultiple-choice outcomes.',
        };
        const desc = nodeDescs[node.type] || nt.label;
        zone.on('pointerover', () => {
          if (this.mapTooltip) { this.mapTooltip.destroy(); this.mapTooltip = null; }
          const txt = this.add.text(0, 0, `${nt.label}\n${desc}`, {
            fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#F5F0E8',
            wordWrap: { width: 180 }, lineSpacing: 2
          }).setDepth(201);
          const tw = txt.width + 12;
          const th = txt.height + 8;
          const tx = Math.max(5, Math.min(x - tw / 2, SIZES.W - tw - 5));
          const ty = y - SIZES.MAP_NODE_R - th - 8;
          const bg = this.add.graphics()
            .fillStyle(0x0D0B08, 0.95).fillRoundedRect(tx, ty, tw, th, 4)
            .lineStyle(1, 0xF5C518, 0.4).strokeRoundedRect(tx, ty, tw, th, 4)
            .setDepth(200);
          txt.setPosition(tx + 6, ty + 4);
          this.mapTooltip = this.add.container(0, 0, [bg, txt]).setDepth(200);
        });
        zone.on('pointerout', () => {
          if (this.mapTooltip) { this.mapTooltip.destroy(); this.mapTooltip = null; }
        });
      }
    }

    // Camera setup — scroll to show bottom of map (floor 0)
    const camH = Math.max(totalH + headerH + 60, SIZES.H);
    this.cameras.main.setBounds(0, 0, SIZES.W, camH);

    // Scroll to current floor area
    const currentRow = run.floor;
    const targetY = headerH + (map.rows - currentRow) * SIZES.MAP_ROW_H - SIZES.H / 2 + SIZES.MAP_ROW_H;
    this.cameras.main.scrollY = Math.max(0, Math.min(targetY, camH - SIZES.H));

    // Mouse wheel scroll
    this.input.on('wheel', (pointer, objects, dx, dy) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + dy * 0.5,
        0, camH - SIZES.H
      );
    });

    // Scroll indicator arrows
    if (camH > SIZES.H) {
      const scrollHint = this.add.text(SIZES.W / 2, SIZES.H - 12, M ? '▼ swipe ▼' : '▼ scroll ▼', {
        fontFamily: 'Share Tech Mono', fontSize: M ? '12px' : '10px', color: '#555'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      this.tweens.add({ targets: scrollHint, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1 });
    }

    // Touch drag scroll
    let dragStartY = 0;
    this.input.on('pointerdown', (p) => { dragStartY = p.y; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      const dy = dragStartY - p.y;
      dragStartY = p.y;
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + dy,
        0, camH - SIZES.H
      );
    });
  }

  _getAvailableNodes(map, run) {
    // Floor 0 — if no completed nodes, row 0 nodes are available
    if (run.completedNodes.length === 0) {
      return map.nodes.filter(n => n.row === 0).map(n => n.id);
    }

    // Find the highest-row completed node(s) — only allow branching from current floor
    const completedNodeObjs = run.completedNodes
      .map(id => map.nodes.find(n => n.id === id))
      .filter(Boolean);
    const maxRow = Math.max(...completedNodeObjs.map(n => n.row));
    const frontierNodes = completedNodeObjs.filter(n => n.row === maxRow);

    // Nodes reachable from frontier nodes only
    const avail = new Set();
    for (const node of frontierNodes) {
      for (const childId of node.paths) {
        if (!run.completedNodes.includes(childId)) {
          avail.add(childId);
        }
      }
    }
    return Array.from(avail);
  }

  _selectNode(node, run) {
    run.currentNode = node;
    RunState.save();

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      switch (node.type) {
        case 'INTERVIEW':
        case 'ELITE':
        case 'BOSS':
          this.scene.start('InterviewScene', { node });
          break;
        case 'REST':
          this.scene.start('RestScene');
          break;
        case 'SHOP':
          this.scene.start('ShopScene');
          break;
        case 'TREASURE':
          this.scene.start('TreasureScene');
          break;
        case 'UNKNOWN':
          this.scene.start('EventScene');
          break;
        default:
          this.scene.start('InterviewScene', { node });
      }
    });
  }
}
