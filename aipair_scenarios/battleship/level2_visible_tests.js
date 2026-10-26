/** Tests for Solver. */

const { Board, ShotResult } = require("./board");
const { getTestFleet } = require("./fleet");
const { Solver } = require("./solver");

/** The solver may only play through the board's public methods. */
function guarded(board) {
    return new Proxy(board, {
        get(target, name) {
            if (typeof name === "string" && name.startsWith("_")) {
                throw new Error(`the Solver may not look inside the board (${name})`);
            }
            const value = Reflect.get(target, name);
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
}

function isNextTo([row, col], [otherRow, otherCol]) {
    return Math.abs(row - otherRow) + Math.abs(col - otherCol) === 1;
}

test("level 2: solve sinks every ship of the test fleet in fewer shots than the board has cells", () => {
    const board = new Board(6);
    const fleet = getTestFleet();
    board.placeShip(fleet[0], 0, 0, true);
    board.placeShip(fleet[1], 3, 0, true);

    const solver = new Solver(guarded(board));
    solver.solve();

    eq(board.allSunk(), true);
    eq(solver.getShots().length, board.totalShots());
    assert(board.totalShots() < 36, `took ${board.totalShots()} shots on a 36 cell board`);
});

test("level 2: getShots lists every shot in order, on the board and never twice at a cell", () => {
    const board = new Board(8);
    board.placeShip({ name: "Cruiser", size: 3 }, 2, 3, false);
    board.placeShip({ name: "Destroyer", size: 2 }, 6, 5, true);

    const solver = new Solver(guarded(board));
    solver.solve();

    const shots = solver.getShots();
    const distinct = new Set(shots.map(([row, col]) => `${row},${col}`));
    eq(distinct.size, shots.length);
    for (const [row, col] of shots) {
        assert(row >= 0 && row < 8 && col >= 0 && col < 8, `(${row}, ${col}) is off the board`);
    }
    eq(board.allSunk(), true);
});

test("level 2: after a hit that does not sink the ship, the next shot is next to it", () => {
    const board = new Board(8);
    board.placeShip({ name: "Carrier", size: 5 }, 3, 1, true);

    const solver = new Solver(guarded(board));
    solver.solve();

    const shots = solver.getShots();
    const firstHit = shots.findIndex(([row, col]) => row === 3 && col >= 1 && col <= 5);
    assert(firstHit >= 0 && firstHit < shots.length - 1, "the carrier was never found");
    assert(isNextTo(shots[firstHit], shots[firstHit + 1]), "the shot after the first hit is not next to it");
});
