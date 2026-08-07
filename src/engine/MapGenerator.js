/* MapGenerator — procedural 7×15 StS-style map */
import { SIZES } from '../constants.js';

const COLS = SIZES.MAP_COLS;  // 7
const ROWS = SIZES.MAP_ROWS;  // 15
const NUM_PATHS = 6;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MapGenerator = {
  generate(act) {
    // 1. Create node grid — only nodes that paths pass through will be used
    const grid = [];
    for (let r = 0; r < ROWS + 1; r++) {  // +1 for boss row
      grid[r] = {};
    }

    // 2. Generate paths from row 0 to ROWS-1, then all connect to boss
    const paths = [];
    for (let p = 0; p < NUM_PATHS; p++) {
      const path = [];
      let col = rand(1, COLS - 2); // start in middle-ish columns
      path.push({ row: 0, col });
      grid[0][col] = true;

      for (let r = 1; r < ROWS; r++) {
        // Move: stay, left, or right (avoid crossing other paths at same step)
        const options = [col];
        if (col > 0) options.push(col - 1);
        if (col < COLS - 1) options.push(col + 1);

        // Prefer columns that don't already have a node at this row from another path
        // (reduces overlap, increases map variety)
        const preferred = options.filter(c => !grid[r][c]);
        col = preferred.length > 0 ? pick(preferred) : pick(options);
        path.push({ row: r, col });
        grid[r][col] = true;
      }
      paths.push(path);
    }

    // 3. Create node objects — deduplicate by (row, col)
    const nodeMap = {};
    let nodeId = 0;
    for (const path of paths) {
      for (const { row, col } of path) {
        const key = `${row}-${col}`;
        if (!nodeMap[key]) {
          nodeMap[key] = {
            id: nodeId++,
            row, col,
            type: null,
            paths: [],
          };
        }
      }
    }

    // Boss node at row ROWS (above row ROWS-1)
    const bossCol = Math.floor(COLS / 2);
    const bossKey = `${ROWS}-${bossCol}`;
    nodeMap[bossKey] = {
      id: nodeId++,
      row: ROWS, col: bossCol,
      type: 'BOSS',
      paths: [],
    };

    // 4. Build edges from paths
    for (const path of paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const fromKey = `${path[i].row}-${path[i].col}`;
        const toKey = `${path[i + 1].row}-${path[i + 1].col}`;
        const fromNode = nodeMap[fromKey];
        const toNode = nodeMap[toKey];
        if (fromNode && toNode && !fromNode.paths.includes(toNode.id)) {
          fromNode.paths.push(toNode.id);
        }
      }
      // Connect last row to boss
      const lastStep = path[path.length - 1];
      const lastKey = `${lastStep.row}-${lastStep.col}`;
      const lastNode = nodeMap[lastKey];
      const bossNode = nodeMap[bossKey];
      if (lastNode && bossNode && !lastNode.paths.includes(bossNode.id)) {
        lastNode.paths.push(bossNode.id);
      }
    }

    // 5. Assign node types
    const nodes = Object.values(nodeMap);
    this._assignTypes(nodes, act);

    return { nodes, rows: ROWS, cols: COLS, act };
  },

  _assignTypes(nodes, act) {
    for (const node of nodes) {
      if (node.type) continue; // boss already set

      if (node.row === 0) {
        node.type = 'INTERVIEW';
      } else if (node.row === 8) {
        node.type = 'TREASURE';
      } else if (node.row === 14) {
        node.type = 'REST';
      } else {
        node.type = this._pickType(node, nodes, act);
      }
    }
  },

  _pickType(node, allNodes, act) {
    // Rules:
    // - No ELITE or REST in rows 0-5
    // - No consecutive same-type from parent nodes
    // - ELITE appears starting row 6, with ~15% chance
    // - REST appears starting row 6, with ~12% chance
    // - SHOP ~12% chance starting row 4
    // - UNKNOWN (event) ~15% chance
    // - INTERVIEW is the default

    const parentTypes = this._getParentTypes(node, allNodes);

    const pool = [];

    // Interview is always possible
    pool.push('INTERVIEW', 'INTERVIEW', 'INTERVIEW', 'INTERVIEW');

    // Unknown/event
    if (!parentTypes.includes('UNKNOWN')) {
      pool.push('UNKNOWN', 'UNKNOWN');
    }

    // Shop
    if (node.row >= 4 && !parentTypes.includes('SHOP')) {
      pool.push('SHOP');
    }

    // Elite
    if (node.row >= 6 && !parentTypes.includes('ELITE')) {
      pool.push('ELITE', 'ELITE');
    }

    // Rest
    if (node.row >= 6 && !parentTypes.includes('REST')) {
      pool.push('REST');
    }

    return pick(pool);
  },

  _getParentTypes(node, allNodes) {
    // Find nodes that have this node as a child
    const parents = allNodes.filter(n => n.paths.includes(node.id));
    return parents.map(p => p.type).filter(Boolean);
  },
};

export default MapGenerator;
