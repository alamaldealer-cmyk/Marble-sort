/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BALLS_PER_BLOCK, BRICK_HOLES, GRID_COLS, GRID_ROWS } from './constants';
import { validateLevelSolvability } from './rules';
import { GridCell, LevelData, MarbleColor } from './types';

// Simple deterministic PRNG (Mulberry32) for repeatable, consistent level generation
function createPRNG(seed: number) {
  let s = (seed + 0x6D2B79F5) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Level 1: Beginner Tutorial
 * - 2 colors: Purple and Lime
 * - 4 blocks total: 2 in exit row (exposed), 2 in row 4 (locked)
 * - 12 buckets total (exactly 3 buckets per block, 3 per column)
 * - Top columns start with Lime and Purple for immediate satisfying matching!
 */
export function getLevel1(): LevelData {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Row 4: Locked with cyber lids
  grid[4][2] = { kind: 'locked', color: 'purple' };
  grid[4][3] = { kind: 'locked', color: 'lime' };

  // Row 5 (Exit Row): Open and exposed
  grid[5][2] = { kind: 'block', color: 'lime' };
  grid[5][3] = { kind: 'block', color: 'purple' };

  // Exactly 2 Purple blocks (6 buckets) + 2 Lime blocks (6 buckets) = 12 buckets
  // Grouped in runs of 3 so a 9-ball burst completely fills and clears a column!
  const columns: MarbleColor[][] = [
    ['lime', 'lime', 'lime'],       // Catches 1st Lime block (9 balls) -> Column completes!
    ['purple', 'purple', 'purple'], // Catches 1st Purple block (9 balls) -> Column completes!
    ['lime', 'lime', 'lime'],       // Catches 2nd Lime block
    ['purple', 'purple', 'purple'], // Catches 2nd Purple block
  ];

  return {
    levelNumber: 1,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };
}

/**
 * Level 2: Gentle Expansion
 * - 3 colors: Purple, Lime, Yellow
 * - 6 blocks total (2 of each color): 3 in exit row (exposed), 3 in row 4 (locked)
 * - 18 buckets total (exactly 6 of each color)
 */
export function getLevel2(): LevelData {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Row 4: Locked
  grid[4][1] = { kind: 'locked', color: 'yellow' };
  grid[4][2] = { kind: 'locked', color: 'purple' };
  grid[4][3] = { kind: 'locked', color: 'lime' };

  // Row 5: Exposed
  grid[5][1] = { kind: 'block', color: 'lime' };
  grid[5][2] = { kind: 'block', color: 'yellow' };
  grid[5][3] = { kind: 'block', color: 'purple' };

  // 2 blocks each = 6 buckets of Lime, 6 of Purple, 6 of Yellow (18 buckets total)
  // Tops of columns are Lime, Yellow, Purple, Lime so every exposed block can score immediately
  const columns: MarbleColor[][] = [
    ['lime', 'lime', 'lime', 'purple', 'purple'],
    ['yellow', 'yellow', 'yellow', 'lime', 'lime'],
    ['purple', 'purple', 'purple', 'yellow'],
    ['lime', 'purple', 'yellow', 'yellow'],
  ];

  return {
    levelNumber: 2,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };
}

/**
 * Level 3: Introducing Mystery Crates (?)
 * - 3 colors: Purple, Lime, Yellow
 * - 8 blocks total (3 Purple, 3 Lime, 2 Yellow)
 * - Introduces 1 Mystery Question Mark crate on row 3!
 * - 24 buckets total (9 Purple, 9 Lime, 6 Yellow = 24 buckets, exactly 6 per column)
 */
export function getLevel3(): LevelData {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Row 3: Mystery block
  grid[3][2] = { kind: 'locked', color: 'purple', isMystery: true };
  grid[3][3] = { kind: 'locked', color: 'lime' };

  // Row 4: Locked
  grid[4][2] = { kind: 'locked', color: 'yellow' };
  grid[4][3] = { kind: 'locked', color: 'purple' };

  // Row 5: Exposed
  grid[5][1] = { kind: 'block', color: 'lime' };
  grid[5][2] = { kind: 'block', color: 'purple' };
  grid[5][3] = { kind: 'block', color: 'yellow' };
  grid[5][4] = { kind: 'block', color: 'lime' };

  // 3 Purple blocks (9 buckets), 3 Lime blocks (9 buckets), 2 Yellow blocks (6 buckets) = 24 buckets
  const columns: MarbleColor[][] = [
    ['lime', 'lime', 'lime', 'purple', 'purple', 'purple'],
    ['purple', 'purple', 'purple', 'lime', 'lime', 'lime'],
    ['yellow', 'yellow', 'yellow', 'purple', 'purple', 'lime'],
    ['lime', 'yellow', 'yellow', 'yellow', 'purple', 'lime'],
  ];

  return {
    levelNumber: 3,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };
}

/**
 * Level 4: 4 Colors & 2 Mystery Crates
 * - 4 colors: Purple, Lime, Yellow, Pink
 * - 10 blocks total: 3 Purple, 3 Lime, 2 Yellow, 2 Pink
 * - 30 buckets total (9 Purple, 9 Lime, 6 Yellow, 6 Pink)
 */
export function getLevel4(): LevelData {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Row 3: 2 Mystery blocks
  grid[3][2] = { kind: 'locked', color: 'pink', isMystery: true };
  grid[3][3] = { kind: 'locked', color: 'purple', isMystery: true };

  // Row 4: Locked
  grid[4][1] = { kind: 'locked', color: 'lime' };
  grid[4][2] = { kind: 'locked', color: 'yellow' };
  grid[4][3] = { kind: 'locked', color: 'pink' };
  grid[4][4] = { kind: 'locked', color: 'purple' };

  // Row 5: Exposed
  grid[5][1] = { kind: 'block', color: 'purple' };
  grid[5][2] = { kind: 'block', color: 'lime' };
  grid[5][3] = { kind: 'block', color: 'yellow' };
  grid[5][4] = { kind: 'block', color: 'lime' };

  // 10 blocks = 30 buckets (8, 8, 7, 7)
  const columns: MarbleColor[][] = [
    ['purple', 'purple', 'purple', 'pink', 'pink', 'pink', 'lime', 'lime'],
    ['lime', 'lime', 'lime', 'yellow', 'yellow', 'yellow', 'purple', 'purple'],
    ['yellow', 'yellow', 'yellow', 'lime', 'lime', 'purple', 'purple'],
    ['pink', 'pink', 'pink', 'purple', 'purple', 'lime', 'lime'],
  ];

  return {
    levelNumber: 4,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };
}

/**
 * Level 5: Pyramid Chamber
 * - 4 colors: Purple, Lime, Yellow, Pink
 * - 12 blocks total (3 of each color)
 * - 36 buckets total (9 of each color, exactly 9 per column)
 */
export function getLevel5(): LevelData {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Row 2: Peak
  grid[2][2] = { kind: 'locked', color: 'yellow', isMystery: true };
  grid[2][3] = { kind: 'locked', color: 'pink', isMystery: true };

  // Row 3:
  grid[3][1] = { kind: 'locked', color: 'purple' };
  grid[3][2] = { kind: 'locked', color: 'lime' };
  grid[3][3] = { kind: 'locked', color: 'purple' };
  grid[3][4] = { kind: 'locked', color: 'yellow' };

  // Row 4:
  grid[4][1] = { kind: 'locked', color: 'lime' };
  grid[4][2] = { kind: 'locked', color: 'pink' };
  grid[4][3] = { kind: 'locked', color: 'lime' };
  grid[4][4] = { kind: 'locked', color: 'purple' };

  // Row 5: Exposed exit row
  grid[5][2] = { kind: 'block', color: 'yellow' };
  grid[5][3] = { kind: 'block', color: 'pink' };

  // 12 blocks = 36 buckets (exactly 9 per column, 9 of each color)
  const columns: MarbleColor[][] = [
    ['yellow', 'yellow', 'yellow', 'purple', 'purple', 'purple', 'pink', 'pink', 'pink'],
    ['pink', 'pink', 'pink', 'lime', 'lime', 'lime', 'yellow', 'yellow', 'yellow'],
    ['lime', 'lime', 'lime', 'yellow', 'yellow', 'yellow', 'purple', 'purple', 'purple'],
    ['purple', 'purple', 'purple', 'pink', 'pink', 'pink', 'lime', 'lime', 'lime'],
  ];

  return {
    levelNumber: 5,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };
}

/**
 * Creates the exact Level 35 benchmark layout from PDF Section 5 & 14:
 *
 * r0: . . ? ? . .
 * r1: . ? R P ? .
 * r2: ? Y C P W ?
 * r3: D3 ? P L ? L
 * r4: P O Y D3 K Y
 * r5: . L W K P . (exit row)
 */
export function getLevel35(): LevelData {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  const setCell = (r: number, c: number, cell: Partial<GridCell>) => {
    grid[r][c] = {
      kind: 'block',
      ...cell,
    } as GridCell;
  };

  // r0: . . ? ? . .
  setCell(0, 2, { kind: 'locked', color: 'cyan', isMystery: true });
  setCell(0, 3, { kind: 'locked', color: 'orange', isMystery: true });

  // r1: . ? R P ? .
  setCell(1, 1, { kind: 'locked', color: 'lime', isMystery: true });
  setCell(1, 2, { kind: 'locked', color: 'red' });
  setCell(1, 3, { kind: 'locked', color: 'purple' });
  setCell(1, 4, { kind: 'locked', color: 'pink', isMystery: true });

  // r2: ? Y C P W ?
  setCell(2, 0, { kind: 'locked', color: 'yellow', isMystery: true });
  setCell(2, 1, { kind: 'locked', color: 'yellow' });
  setCell(2, 2, { kind: 'locked', color: 'cyan' });
  setCell(2, 3, { kind: 'locked', color: 'purple' });
  setCell(2, 4, { kind: 'locked', color: 'ice' });
  setCell(2, 5, { kind: 'locked', color: 'red', isMystery: true });

  // r3: D3 ? P L ? L
  // Dispenser 1 at (3, 0)
  setCell(3, 0, {
    kind: 'dispenser',
    counter: 3,
    queue: ['purple', 'ice', 'cyan'],
  });
  setCell(3, 1, { kind: 'locked', color: 'purple', isMystery: true });
  setCell(3, 2, { kind: 'locked', color: 'purple' });
  setCell(3, 3, { kind: 'locked', color: 'lime' });
  setCell(3, 4, { kind: 'locked', color: 'yellow', isMystery: true });
  setCell(3, 5, { kind: 'locked', color: 'lime' });

  // r4: P O Y D3 K Y
  setCell(4, 0, { kind: 'locked', color: 'purple' });
  setCell(4, 1, { kind: 'locked', color: 'orange' });
  setCell(4, 2, { kind: 'locked', color: 'yellow' });
  // Dispenser 2 at (4, 3)
  setCell(4, 3, {
    kind: 'dispenser',
    counter: 3,
    queue: ['pink', 'lime', 'purple'],
  });
  setCell(4, 4, { kind: 'locked', color: 'pink' });
  setCell(4, 5, { kind: 'locked', color: 'yellow' });

  // r5: . L W K P .  (exit row - open and exposed to funnel)
  setCell(5, 1, { kind: 'block', color: 'lime' });
  setCell(5, 2, { kind: 'block', color: 'ice' });
  setCell(5, 3, { kind: 'block', color: 'pink' });
  setCell(5, 4, { kind: 'block', color: 'purple' });

  // Total blocks per color:
  // Purple (P): 8 blocks  => 8 * 3 = 24 bricks
  // Lime   (L): 5 blocks  => 5 * 3 = 15 bricks
  // Yellow (Y): 5 blocks  => 5 * 3 = 15 bricks
  // Pink   (K): 4 blocks  => 4 * 3 = 12 bricks
  // Cyan   (C): 3 blocks  => 3 * 3 =  9 bricks
  // Ice    (W): 3 blocks  => 3 * 3 =  9 bricks
  // Orange (O): 2 blocks  => 2 * 3 =  6 bricks
  // Red    (R): 2 blocks  => 2 * 3 =  6 bricks
  // Total blocks = 32 blocks. Total bricks = 96 bricks (24 in each of 4 columns).

  const columns: MarbleColor[][] = [
    // col 0: starts with 3 purple buckets to cleanly receive 9-ball purple burst
    [
      'purple', 'purple', 'purple', 'yellow', 'cyan', 'yellow', 'purple', 'orange',
      'yellow', 'purple', 'red', 'cyan', 'purple', 'yellow', 'lime', 'purple',
      'purple', 'lime', 'yellow', 'purple', 'cyan', 'purple', 'orange', 'purple',
    ],
    // col 1: starts with 3 ice buckets to cleanly receive 9-ball ice burst
    [
      'ice', 'ice', 'ice', 'lime', 'yellow', 'pink', 'red', 'cyan',
      'purple', 'lime', 'yellow', 'pink', 'ice', 'purple', 'orange', 'yellow',
      'pink', 'lime', 'lime', 'purple', 'cyan', 'yellow', 'pink', 'ice',
    ],
    // col 2: starts with 3 lime buckets to cleanly receive 9-ball lime burst
    [
      'lime', 'lime', 'lime', 'red', 'purple', 'lime', 'yellow', 'orange',
      'purple', 'purple', 'cyan', 'lime', 'yellow', 'ice', 'pink', 'purple',
      'red', 'cyan', 'yellow', 'purple', 'lime', 'pink', 'yellow', 'purple',
    ],
    // col 3: starts with 3 pink buckets to cleanly receive 9-ball pink burst
    [
      'pink', 'pink', 'pink', 'ice', 'lime', 'orange', 'purple', 'cyan',
      'pink', 'red', 'yellow', 'lime', 'purple', 'ice', 'pink', 'purple',
      'cyan', 'yellow', 'lime', 'orange', 'pink', 'purple', 'red', 'ice',
    ],
  ];

  return {
    levelNumber: 35,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };
}

/**
 * Standard Chamber Pyramid Layout Mask (6x6)
 * 1 means a cell can host a block, 0 means border wall
 */
const CHAMBER_MASK: readonly (readonly number[])[] = [
  [0, 0, 1, 1, 0, 0], // Row 0: 2 top crown cells
  [0, 1, 1, 1, 1, 0], // Row 1: 4 upper cells
  [1, 1, 1, 1, 1, 1], // Row 2: 6 mid cells
  [1, 1, 1, 1, 1, 1], // Row 3: 6 lower-mid cells
  [1, 1, 1, 1, 1, 1], // Row 4: 6 lower cells
  [0, 1, 1, 1, 1, 0], // Row 5: 4 exit-row cells (open to funnel)
];

/**
 * Procedural Solvable Level Generator
 * Guarantees 100% Mathematical Invariant Solvability for ANY level number:
 * - Deterministic PRNG seeded by levelNum (consistent across devices & reloads)
 * - Difficulty smoothly scales in palette, block count, dispensers & mystery blocks
 * - Every single block of color C generates EXACTLY 3 buckets of color C
 * - Total balls == Total bucket capacity with ZERO mismatch
 * - Top of columns contain matching buckets for the initially exposed blocks
 */
export function generateSolvableLevel(levelNum: number): LevelData {
  if (levelNum === 1) return getLevel1();
  if (levelNum === 2) return getLevel2();
  if (levelNum === 3) return getLevel3();
  if (levelNum === 4) return getLevel4();
  if (levelNum === 5) return getLevel5();
  if (levelNum === 35) return getLevel35();

  const rand = createPRNG(levelNum * 9973 + 101);

  // 1. Determine Color Palette based on level progression
  let activeColors: MarbleColor[];
  if (levelNum <= 3) {
    activeColors = ['purple', 'lime', 'yellow'];
  } else if (levelNum <= 6) {
    activeColors = ['purple', 'lime', 'yellow', 'pink'];
  } else if (levelNum <= 12) {
    activeColors = ['purple', 'lime', 'yellow', 'pink', 'ice'];
  } else if (levelNum <= 20) {
    activeColors = ['purple', 'lime', 'yellow', 'pink', 'ice', 'cyan'];
  } else if (levelNum <= 30) {
    activeColors = ['purple', 'lime', 'yellow', 'pink', 'ice', 'cyan', 'orange'];
  } else {
    activeColors = ['purple', 'lime', 'yellow', 'pink', 'ice', 'cyan', 'orange', 'red'];
  }

  // 2. Determine target block count (scales from 12 up to 32)
  const targetBlocks = Math.min(
    32,
    Math.max(6, Math.floor(10 + Math.min(30, levelNum) * 0.72))
  );

  // 3. Determine dispensers & mystery crates counts
  const useDispenser = levelNum >= 8;
  const useTwoDispensers = levelNum >= 20;
  const numMystery = Math.min(
    8,
    levelNum < 3 ? 0 : Math.floor(1 + (levelNum - 3) * 0.25)
  );

  // Initialize 6x6 grid with walls
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Collect candidate mask cells from bottom to top (Row 5 first, then 4, 3, 2, 1, 0)
  const availableSlots: { r: number; c: number }[] = [];
  for (let r = GRID_ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (CHAMBER_MASK[r][c] === 1) {
        availableSlots.push({ r, c });
      }
    }
  }

  // Ensure row 5 (exit row) is always filled first (2 to 4 exposed blocks)
  const exitSlots = availableSlots.filter((s) => s.r === 5);
  const otherSlots = availableSlots.filter((s) => s.r < 5);

  // Pick slots up to targetBlocks
  const selectedSlots: { r: number; c: number }[] = [...exitSlots];
  const remainingCount = Math.max(0, targetBlocks - exitSlots.length);

  // Take remaining slots from lower rows upward
  for (let i = 0; i < remainingCount && i < otherSlots.length; i++) {
    selectedSlots.push(otherSlots[i]);
  }

  // Determine dispenser positions if enabled
  const dispenserCoords = new Set<string>();
  if (useDispenser) {
    // Put dispenser at row 3 or 2
    const dispenserCandidates = selectedSlots.filter((s) => s.r === 3 || s.r === 2);
    if (dispenserCandidates.length > 0) {
      const idx = Math.floor(rand() * dispenserCandidates.length);
      const chosen = dispenserCandidates[idx];
      dispenserCoords.add(`${chosen.r},${chosen.c}`);

      if (useTwoDispensers && dispenserCandidates.length > 2) {
        const remainingCandidates = dispenserCandidates.filter(
          (s) => `${s.r},${s.c}` !== `${chosen.r},${chosen.c}`
        );
        const second = remainingCandidates[Math.floor(rand() * remainingCandidates.length)];
        dispenserCoords.add(`${second.r},${second.c}`);
      }
    }
  }

  // Select which locked slots become mystery crates (?)
  const lockedNonDispenser = selectedSlots.filter(
    (s) => s.r < 5 && !dispenserCoords.has(`${s.r},${s.c}`)
  );
  // Shuffle lockedNonDispenser
  for (let i = lockedNonDispenser.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [lockedNonDispenser[i], lockedNonDispenser[j]] = [lockedNonDispenser[j], lockedNonDispenser[i]];
  }
  const mysterySet = new Set<string>();
  for (let i = 0; i < numMystery && i < lockedNonDispenser.length; i++) {
    const s = lockedNonDispenser[i];
    mysterySet.add(`${s.r},${s.c}`);
  }

  // 4. Assign balanced colors to each block & dispenser queue
  const blockCounts: Record<string, number> = {};
  for (const c of activeColors) blockCounts[c] = 0;

  // Track colors of initially exposed blocks (in Row 5)
  const exposedColors: MarbleColor[] = [];

  // Fill cells
  for (const slot of selectedSlots) {
    const { r, c } = slot;
    const isExit = r === 5;
    const key = `${r},${c}`;

    if (dispenserCoords.has(key)) {
      // Dispenser
      const count = 3;
      const queueColors: MarbleColor[] = [];
      for (let q = 0; q < count; q++) {
        const qColor = activeColors[Math.floor(rand() * activeColors.length)];
        queueColors.push(qColor);
        blockCounts[qColor] = (blockCounts[qColor] || 0) + 1;
      }
      grid[r][c] = {
        kind: 'dispenser',
        counter: count,
        queue: queueColors,
      };
    } else {
      // Normal or Locked Block
      const color = activeColors[Math.floor(rand() * activeColors.length)];
      blockCounts[color] = (blockCounts[color] || 0) + 1;

      if (isExit) {
        grid[r][c] = {
          kind: 'block',
          color,
        };
        exposedColors.push(color);
      } else {
        grid[r][c] = {
          kind: 'locked',
          color,
          isMystery: mysterySet.has(key),
        };
      }
    }
  }

  // 5. EXACT MATHEMATICAL INVARIANT BUCKET GENERATION:
  // For every single color: Total Buckets = Total Blocks of that color * 3
  const allBricks: MarbleColor[] = [];
  for (const color of activeColors) {
    const numBlocks = blockCounts[color] || 0;
    const numBricks = numBlocks * (BALLS_PER_BLOCK / BRICK_HOLES); // exactly 3 bricks per block
    for (let i = 0; i < numBricks; i++) {
      allBricks.push(color);
    }
  }

  // 6. SOLVABILITY OPTIMIZATION:
  // Ensure the top of the columns starts with matching colors for the exposed blocks!
  const topBuckets: MarbleColor[] = [];
  const remainingBricks = [...allBricks];

  // Pick 4 top buckets matching exposedColors where possible
  for (let colIdx = 0; colIdx < 4; colIdx++) {
    const desiredColor = exposedColors[colIdx % exposedColors.length] || activeColors[0];
    const matchIdx = remainingBricks.indexOf(desiredColor);
    if (matchIdx !== -1) {
      topBuckets.push(remainingBricks.splice(matchIdx, 1)[0]);
    } else if (remainingBricks.length > 0) {
      topBuckets.push(remainingBricks.shift()!);
    }
  }

  // Group remaining bricks into cohesive 3-brick packets so bursts are smoothly absorbed
  const brickGroups: MarbleColor[][] = [];
  const groupedByColor: Partial<Record<MarbleColor, number>> = {};
  for (const b of remainingBricks) {
    groupedByColor[b] = (groupedByColor[b] || 0) + 1;
  }

  const brickListReordered: MarbleColor[] = [];
  // Sort colors to interleave them nicely
  const availableColorList = Object.keys(groupedByColor) as MarbleColor[];
  while (availableColorList.some((c) => (groupedByColor[c] || 0) > 0)) {
    for (const c of availableColorList) {
      const take = Math.min(3, groupedByColor[c] || 0);
      if (take > 0) {
        for (let i = 0; i < take; i++) {
          brickListReordered.push(c);
        }
        groupedByColor[c] = (groupedByColor[c] || 0) - take;
      }
    }
  }

  // Combine top buckets + reordered bricks
  const finalBrickPool: MarbleColor[] = [...topBuckets, ...brickListReordered];

  // Distribute evenly into 4 columns
  const columns: MarbleColor[][] = [[], [], [], []];
  // Put top buckets in row 0 of each column
  for (let c = 0; c < 4 && c < topBuckets.length; c++) {
    columns[c].push(topBuckets[c]);
  }
  // Distribute the rest across the columns round-robin
  for (let i = 0; i < brickListReordered.length; i++) {
    columns[i % 4].push(brickListReordered[i]);
  }

  const levelData: LevelData = {
    levelNumber: levelNum,
    grid,
    columns,
    ballsPerBlock: BALLS_PER_BLOCK,
  };

  // 7. Verify Solvability Invariant at build time
  const validation = validateLevelSolvability(levelData);
  if (!validation.isSolvable) {
    throw new Error(
      `Generated Level ${levelNum} has solvability error: ${validation.mismatches.join(', ')}`
    );
  }

  return levelData;
}
