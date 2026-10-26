/** Hidden Solver cases. */

const { Board } = require("./board");
const { getStandardFleet, getTestFleet } = require("./fleet");
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

class Random {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed;
    }

    randInt(min, max) {
        return min + (this.next() % (max - min + 1));
    }

    choice(items) {
        return items[this.next() % items.length];
    }
}

function placeFleetRandomly(board, fleet, rng) {
    for (const ship of fleet) {
        while (true) {
            const horizontal = rng.choice([true, false]);
            let row;
            let col;
            if (horizontal) {
                row = rng.randInt(0, board.gridSize - 1);
                col = rng.randInt(0, board.gridSize - ship.size);
            } else {
                row = rng.randInt(0, board.gridSize - ship.size);
                col = rng.randInt(0, board.gridSize - 1);
            }

            try {
                board.placeShip(ship, row, col, horizontal);
                break;
            } catch (error) {
                continue;
            }
        }
    }
}

function averageShots(fleet, trials, seed) {
    const rng = new Random(seed);
    let total = 0;

    for (let i = 0; i < trials; i++) {
        const board = new Board(10);
        placeFleetRandomly(board, fleet, rng);

        const solver = new Solver(guarded(board));
        solver.solve();

        assert(board.allSunk(), "a ship was left afloat");
        eq(new Set(solver.getShots().map(([row, col]) => `${row},${col}`)).size, solver.getShots().length);
        total += board.totalShots();
    }
    return total / trials;
}

test("level 2: it is efficient: the test fleet on a 10 x 10 board needs fewer than 60 shots on average", () => {
    const average = averageShots(getTestFleet(), 20, 42);
    assert(average < 60, `average ${average} shots`);
});

test("level 2: it is efficient with the standard fleet too", () => {
    const average = averageShots(getStandardFleet(), 20, 7);
    assert(average < 70, `average ${average} shots`);
});

test("level 2: a ship in the corner does not make it shoot off the board", () => {
    const board = new Board(5);
    board.placeShip({ name: "Cruiser", size: 3 }, 0, 0, false);
    board.placeShip({ name: "Destroyer", size: 2 }, 4, 3, true);

    const solver = new Solver(guarded(board));
    solver.solve();

    eq(board.allSunk(), true);
});

test("level 2: on a board with no ships it shoots every cell once and stops", () => {
    const board = new Board(4);

    const solver = new Solver(guarded(board));
    solver.solve();

    eq(solver.getShots().length, 16);
    eq(board.totalShots(), 16);
});

test("level 2: it never looks inside the board", () => {
    const board = new Board(6);
    board.placeShip({ name: "Cruiser", size: 3 }, 1, 1, true);

    const solver = new Solver(guarded(board));
    solver.solve();

    eq(board.allSunk(), true);
});
