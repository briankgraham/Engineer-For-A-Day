/** Hidden Board cases. */

const { Board, ShotResult } = require("./board");

const CRUISER = { name: "Cruiser", size: 3 };
const SUBMARINE = { name: "Submarine", size: 3 };
const DESTROYER = { name: "Destroyer", size: 2 };
const PATROL = { name: "Patrol", size: 1 };

test("level 1: a vertical ship is sunk by shots down its column", () => {
    const board = new Board(6);
    board.placeShip(CRUISER, 1, 4, false);

    eq(board.checkShot(1, 4), ShotResult.HIT);
    eq(board.checkShot(2, 4), ShotResult.HIT);
    eq(board.checkShot(3, 4), ShotResult.SUNK);
    eq(board.checkShot(1, 5), ShotResult.MISS);
});

test("level 1: a ship is sunk only when every cell is hit, in whatever order", () => {
    const board = new Board(6);
    board.placeShip(CRUISER, 0, 0, true);

    eq(board.checkShot(0, 1), ShotResult.HIT);
    eq(board.checkShot(0, 2), ShotResult.HIT);
    eq(board.remainingShips(), 1);
    eq(board.checkShot(0, 0), ShotResult.SUNK);
    eq(board.remainingShips(), 0);
});

test("level 1: hits on another ship do not sink this one", () => {
    const board = new Board(6);
    board.placeShip(DESTROYER, 0, 0, true);
    board.placeShip(CRUISER, 3, 0, true);

    eq(board.checkShot(3, 0), ShotResult.HIT);
    eq(board.checkShot(0, 0), ShotResult.HIT);
    eq(board.remainingShips(), 2);
    eq(board.checkShot(0, 1), ShotResult.SUNK);
    eq(board.remainingShips(), 1);
});

test("level 1: a repeated shot at a hit cell does not sink the ship", () => {
    const board = new Board(6);
    board.placeShip(DESTROYER, 2, 2, true);

    eq(board.checkShot(2, 2), ShotResult.HIT);
    eq(board.checkShot(2, 2), ShotResult.ALREADY_SHOT);
    eq(board.remainingShips(), 1);
    eq(board.totalShots(), 1);
    eq(board.checkShot(2, 3), ShotResult.SUNK);
});

test("level 1: allSunk is false with no ships, false with one afloat, true when all are sunk", () => {
    const board = new Board(6);
    eq(board.allSunk(), false);

    board.placeShip(DESTROYER, 0, 0, true);
    board.placeShip(PATROL, 4, 4, true);
    board.checkShot(0, 0);
    board.checkShot(0, 1);
    eq(board.allSunk(), false);

    board.checkShot(4, 4);
    eq(board.allSunk(), true);
});

test("level 1: a shot off the board throws RangeError and is not counted", () => {
    const board = new Board(6);
    board.placeShip(DESTROYER, 0, 0, true);

    throws(() => board.checkShot(6, 0), RangeError, "row 6 on a 6 x 6 board");
    throws(() => board.checkShot(0, 6), RangeError, "column 6 on a 6 x 6 board");
    throws(() => board.checkShot(-1, 0), RangeError, "negative row");
    throws(() => board.checkShot(0, -1), RangeError, "negative column");
    eq(board.totalShots(), 0);
});

test("level 1: placeShip rejects a ship that runs off the board, either way", () => {
    const board = new Board(6);

    throws(() => board.placeShip(CRUISER, 0, 4, true), RangeError, "runs off the right edge");
    throws(() => board.placeShip(CRUISER, 4, 0, false), RangeError, "runs off the bottom");
    board.placeShip(CRUISER, 0, 3, true);
    board.placeShip(SUBMARINE, 3, 5, false);
});

test("level 1: placeShip rejects an overlap, and a failed placement leaves nothing behind", () => {
    const board = new Board(6);
    board.placeShip(CRUISER, 1, 0, true);

    throws(() => board.placeShip(SUBMARINE, 0, 2, false), RangeError, "crosses the cruiser at (1, 2)");
    // Cells (0, 2) of the failed ship must be free, and the failed ship must not count as placed.
    board.placeShip(DESTROYER, 0, 2, true);
    eq(board.checkShot(0, 2), ShotResult.HIT);
    eq(board.remainingShips(), 2);
});

test("level 1: totalShots counts every distinct cell shot, hit or miss", () => {
    const board = new Board(6);
    board.placeShip(DESTROYER, 0, 0, true);

    board.checkShot(0, 0);
    board.checkShot(5, 5);
    board.checkShot(5, 4);
    board.checkShot(5, 5);

    eq(board.totalShots(), 3);
});
