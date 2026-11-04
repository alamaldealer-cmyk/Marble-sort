/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FEED_POINT_S,
  TOTAL_PATH_LEN,
  circularDistance,
  getBeltCoordinates,
  isSOnBottomLane,
} from './beltPath';
import { BRICK_COLUMNS_X, GRID_COLS, GRID_ROWS } from './constants';
import {
  getLevel1,
  getLevel2,
  getLevel3,
  getLevel4,
  getLevel5,
  getLevel35,
  generateSolvableLevel,
} from './levels';
import {
  isExposed,
  isLevelWon,
  shouldBlockBlockTap,
  performShufflePowerup,
  tapCell,
  tryMatchBeltBall,
  updateGridAfterChange,
  validateLevelSolvability,
} from './rules';
import { BrickColumn, GridCell } from './types';

test('Backlog limit rule: blocks tap at >= 45 balls, stays locked until < 40 balls', () => {
  // Not locked yet, under 45
  assert.equal(shouldBlockBlockTap(0, false), false);
  assert.equal(shouldBlockBlockTap(44, false), false);

  // Hits 45: must lock!
  assert.equal(shouldBlockBlockTap(45, false), true);

  // Once locked, remains locked at 44, 42, 40
  assert.equal(shouldBlockBlockTap(44, true), true);
  assert.equal(shouldBlockBlockTap(42, true), true);
  assert.equal(shouldBlockBlockTap(40, true), true);

  // Drops below 40 (e.g. 39): unlocks!
  assert.equal(shouldBlockBlockTap(39, true), false);
  assert.equal(shouldBlockBlockTap(20, false), false);
});

test('Handcrafted Levels 1 to 5 satisfy exact solvability (blocks * 9 == bricks * 3)', () => {
  const levels = [getLevel1(), getLevel2(), getLevel3(), getLevel4(), getLevel5()];
  levels.forEach((lvl, idx) => {
    const validation = validateLevelSolvability(lvl);
    assert.equal(
      validation.isSolvable,
      true,
      `Level ${idx + 1} has solvability error: ${validation.mismatches.join(', ')}`
    );
    assert.equal(validation.mismatches.length, 0);
  });
});

test('Level 35 benchmark satisfies exact solvability rule (blocks * 9 == bricks * 3)', () => {
  const level35 = getLevel35();
  const validation = validateLevelSolvability(level35);
  assert.equal(
    validation.isSolvable,
    true,
    `Level 35 has solvability mismatches: ${validation.mismatches.join(', ')}`
  );
  assert.equal(validation.mismatches.length, 0);
});

test('Procedural levels across all difficulty tiers satisfy exact solvability without missing or extra balls/buckets', () => {
  const testLevelNumbers = [6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 36, 42, 50, 100];
  for (const num of testLevelNumbers) {
    const levelData = generateSolvableLevel(num);
    const validation = validateLevelSolvability(levelData);
    assert.equal(
      validation.isSolvable,
      true,
      `Procedural Level ${num} failed solvability: ${validation.mismatches.join(', ')}`
    );
    assert.equal(validation.mismatches.length, 0);

    // Verify each column has bricks and columns count is 4
    assert.equal(levelData.columns.length, 4);
    assert.ok(levelData.columns.every((c) => c.length > 0));

    // Verify total balls strictly equals total holes
    let totalBlocks = 0;
    for (const row of levelData.grid) {
      for (const cell of row) {
        if (cell.kind === 'block' && cell.color) totalBlocks++;
        else if (cell.kind === 'locked' && cell.color) totalBlocks++;
        else if (cell.kind === 'dispenser' && cell.queue) totalBlocks += cell.queue.length;
      }
    }
    let totalBuckets = 0;
    for (const col of levelData.columns) {
      totalBuckets += col.length;
    }
    assert.equal(
      totalBlocks * 9,
      totalBuckets * 3,
      `Level ${num} total balls (${totalBlocks * 9}) != total bucket holes (${totalBuckets * 3})`
    );
  }
});

test('Exposed rule: row 5 exit row is always exposed, surrounded cells are not, walls do not expose', () => {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Place a block at (4, 0) surrounded by walls/blocks
  grid[4][0] = { kind: 'block', color: 'purple' };
  grid[4][1] = { kind: 'block', color: 'orange' };
  grid[3][0] = { kind: 'block', color: 'purple' };
  // (5, 0) is wall, (4, -1) out of bounds

  // At this moment, (4,0) has no empty neighbor (only blocks and walls)
  assert.equal(isExposed(grid, 4, 0), false);

  // Row 5 cell is in exit row, always exposed
  grid[5][2] = { kind: 'block', color: 'pink' };
  assert.equal(isExposed(grid, 5, 2), true);

  // Now create an empty neighbor at (4, 1)
  grid[4][1] = { kind: 'empty' };
  assert.equal(isExposed(grid, 4, 0), true);
});

test('Tap block removes it, reveals locked neighbors, and activates dispenser below', () => {
  const grid: GridCell[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: 'wall' as const }))
  );

  // Put dispenser at (2, 2) with counter 2 and queue ['pink', 'lime']
  grid[2][2] = {
    kind: 'dispenser',
    counter: 2,
    queue: ['pink', 'lime'],
  };

  // Put a block at (3, 2)
  grid[3][2] = { kind: 'block', color: 'purple' };

  // Put a locked tile at (3, 3)
  grid[3][3] = { kind: 'locked', color: 'yellow' };

  // Put an exit row block at (5, 2)
  grid[5][2] = { kind: 'block', color: 'ice' };

  // Initially (3, 2) is surrounded by dispenser (2,2), locked (3,3), wall (3,1), wall (4,2)
  assert.equal(isExposed(grid, 3, 2), false);

  // Now empty (4, 2)
  grid[4][2] = { kind: 'empty' };
  assert.equal(isExposed(grid, 3, 2), true);

  // Tap (3, 2)
  const tapRes = tapCell(grid, 3, 2);
  assert.equal(tapRes.tapped, true);
  assert.equal(tapRes.color, 'purple');
  assert.equal(grid[3][2].kind, 'empty');

  // Run updateGridAfterChange
  const changes = updateGridAfterChange(grid);

  // 1. Locked at (3,3) should be revealed to yellow block
  assert.equal(grid[3][3].kind, 'block');
  assert.equal(grid[3][3].color, 'yellow');
  assert.equal(changes.revealedCells.length, 1);
  assert.equal(changes.revealedCells[0].color, 'yellow');

  // 2. Dispenser at (2,2) had empty below at (3,2), so it dropped 'pink' block and counter became 1
  assert.equal(grid[3][2].kind, 'block');
  assert.equal(grid[3][2].color, 'pink');
  assert.equal(grid[2][2].counter, 1);
  assert.equal(changes.dispensedCells.length, 1);
});

test('Belt stadium coordinates and feed point mapping', () => {
  // Feed point s = 96 should have x=147, y=508
  const feedCoords = getBeltCoordinates(FEED_POINT_S);
  assert.equal(Math.round(feedCoords.x), 147);
  assert.equal(Math.round(feedCoords.y), 508);
  assert.equal(feedCoords.isBottomLane, false);

  // Test bottom lane detection
  assert.equal(isSOnBottomLane(100), false);
  // Bottom lane starts after seg1 (~223.7) to seg2 (~409.7)
  assert.equal(isSOnBottomLane(250), true);
  const bottomCoords = getBeltCoordinates(250);
  assert.equal(bottomCoords.y, 532);
  assert.equal(bottomCoords.isBottomLane, true);

  // Circular distance test
  assert.equal(circularDistance(10, 20), 10);
  assert.ok(circularDistance(5, TOTAL_PATH_LEN - 5) <= 10.01);
});

test('Brick matching logic matches column in-range and limits to 3 holes', () => {
  const columns: BrickColumn[] = [
    {
      x: BRICK_COLUMNS_X[0], // 65
      bricks: [{ color: 'purple', filled: 1, inFlight: 1 }],
      lastDropTime: 0,
      shiftOffsetY: 0,
    },
    {
      x: BRICK_COLUMNS_X[1], // 120
      bricks: [{ color: 'pink', filled: 0, inFlight: 0 }],
      lastDropTime: 0,
      shiftOffsetY: 0,
    },
  ];

  // Ball at x=66 (close to 65), color purple
  const match1 = tryMatchBeltBall(66, 'purple', columns, 1000);
  assert.ok(match1);
  assert.equal(match1.matchedColIndex, 0);
  assert.equal(match1.targetHoleIndex, 2); // 1 filled + 1 inFlight = 2
  // Now capacity is 3 (1 filled + 2 inFlight)
  assert.equal(columns[0].bricks[0].inFlight, 2);

  // Second ball of purple tries to match immediately: already full!
  const match2 = tryMatchBeltBall(67, 'purple', columns, 1000);
  assert.equal(match2, null);

  // Ball of pink at x=118 matches column 1
  const match3 = tryMatchBeltBall(118, 'pink', columns, 1000);
  assert.ok(match3);
  assert.equal(match3.matchedColIndex, 1);
  assert.equal(match3.targetHoleIndex, 0);
});

test('Win condition triggers when all columns have zero bricks left', () => {
  const columns: BrickColumn[] = [
    { x: 65, bricks: [], lastDropTime: 0, shiftOffsetY: 0 },
    { x: 120, bricks: [], lastDropTime: 0, shiftOffsetY: 0 },
  ];
  assert.equal(isLevelWon(columns), true);

  columns[0].bricks.push({ color: 'purple', filled: 2, inFlight: 0 });
  assert.equal(isLevelWon(columns), false);
});

test('FunnelPhysics simulates gravity, wall containment, and gate release', async () => {
  const { FunnelPhysics } = await import('./physics');
  const physics = new FunnelPhysics();

  // Spawn 1 burst of 9 balls near center
  physics.spawnBurst(147, 300, 'purple', 9);
  assert.equal(physics.balls.length, 9);

  // Step physics with closed gate
  for (let i = 0; i < 60; i++) {
    physics.update(0.016, false);
  }

  // Marbles should have fallen down and be contained within funnel walls
  for (const b of physics.balls) {
    assert.ok(b.y > 300, `Ball y ${b.y} should have fallen`);
    assert.ok(b.y <= 500, `Ball y ${b.y} should be stopped by gate`);
    assert.ok(b.x >= 14 && b.x <= 282, `Ball x ${b.x} within horizontal bounds`);
  }

  // Now step with open gate until a ball exits through neck
  let fedBall = null;
  for (let i = 0; i < 80; i++) {
    const ball = physics.update(0.016, true);
    if (ball) {
      fedBall = ball;
      break;
    }
  }
  assert.ok(fedBall, 'A ball should have been fed through the open neck gate');
  assert.equal(fedBall.color, 'purple');
  assert.equal(physics.balls.length, 8);
});

test('Shuffle power-up brings forward queued buckets matching balls on the conveyor belt', () => {
  // Columns setup: 4 columns with queued buckets
  const columns: BrickColumn[] = [
    {
      x: 58,
      lastDropTime: 0,
      shiftOffsetY: 0,
      bricks: [
        { color: 'ice', filled: 0, inFlight: 0 },
        { color: 'purple', filled: 0, inFlight: 0 },
      ],
    },
    {
      x: 118,
      lastDropTime: 0,
      shiftOffsetY: 0,
      bricks: [
        { color: 'lime', filled: 0, inFlight: 0 },
        { color: 'cyan', filled: 0, inFlight: 0 },
      ],
    },
    {
      x: 178,
      lastDropTime: 0,
      shiftOffsetY: 0,
      bricks: [
        { color: 'pink', filled: 1, inFlight: 0 }, // partially filled: should NOT be swapped!
        { color: 'red', filled: 0, inFlight: 0 },
      ],
    },
    {
      x: 238,
      lastDropTime: 0,
      shiftOffsetY: 0,
      bricks: [
        { color: 'yellow', filled: 0, inFlight: 0 },
        { color: 'red', filled: 0, inFlight: 0 },
      ],
    },
  ];

  // Belt currently has purple balls and red balls circulating
  const beltBalls = [
    { color: 'purple' as const },
    { color: 'purple' as const },
    { color: 'red' as const },
  ];

  const result = performShufflePowerup(columns, beltBalls);
  assert.equal(result.shuffled, true);

  // Col 0 should have brought purple to the front!
  assert.equal(columns[0].bricks[0].color, 'purple');

  // Col 2 (partially filled pink) must NOT have been touched!
  assert.equal(columns[2].bricks[0].color, 'pink');
  assert.equal(columns[2].bricks[0].filled, 1);

  // Col 3 should have brought red to the front!
  assert.equal(columns[3].bricks[0].color, 'red');
});


