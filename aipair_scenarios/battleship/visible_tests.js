/** Tests for Board: the bugs people have reported. */

const { Board, ShotResult } = require("./board");

test("level 1: a horizontal ship is hit, then sunk", () => {
    const board = new Board(6);
    board.placeShip({ name: "Destroyer", size: 2 }, 0, 0, true);

    const first = board.checkShot(0, 0);
    const second = board.checkShot(0, 1);

    eq(first, ShotResult.HIT);
    eq(second, ShotResult.SUNK);
});

test("level 1: a shot at open water is a miss", () => {
    const board = new Board(6);
    board.placeShip({ name: "Destroyer", size: 2 }, 0, 0, true);

    eq(board.checkShot(3, 3), ShotResult.MISS);
});

test("level 1: remainingShips drops when a ship is sunk", () => {
    const board = new Board(6);
    board.placeShip({ name: "Destroyer", size: 2 }, 0, 0, true);
    board.placeShip({ name: "Cruiser", size: 3 }, 2, 0, true);
    eq(board.remainingShips(), 2);

    board.checkShot(0, 0);
    board.checkShot(0, 1);

    eq(board.remainingShips(), 1);
});

test("level 1: a vertical ship runs down the rows", () => {
    const board = new Board(6);
    board.placeShip({ name: "Cruiser", size: 3 }, 0, 0, false);

    eq(board.checkShot(1, 0), ShotResult.HIT);
    eq(board.checkShot(0, 1), ShotResult.MISS);
});

test("level 1: shooting the same cell again says ALREADY_SHOT and does not count", () => {
    const board = new Board(6);
    board.placeShip({ name: "Destroyer", size: 2 }, 0, 0, true);

    board.checkShot(0, 0);
    board.checkShot(3, 3);
    eq(board.checkShot(0, 0), ShotResult.ALREADY_SHOT);
    eq(board.checkShot(3, 3), ShotResult.ALREADY_SHOT);

    eq(board.totalShots(), 2);
});
