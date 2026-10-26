/** Hunts for ships on a checkerboard pattern, then follows up every hit. */

const { ShotResult } = require("./board");

const NEIGHBORS = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
];

class Solver {
    constructor(board) {
        this.board = board;
        this.shots = [];
        this._tried = new Set(); // "row,col"
        this._targets = []; // cells next to a hit, the newest last
    }

    solve() {
        while (!this.board.allSunk()) {
            const cell = this._nextCell();
            if (!cell) {
                return; // every cell has been shot
            }
            this._shoot(cell);
        }
    }

    getShots() {
        return this.shots;
    }

    _nextCell() {
        while (this._targets.length > 0) {
            const [row, col] = this._targets.pop();
            if (!this._tried.has(`${row},${col}`)) {
                return [row, col];
            }
        }
        return this._nextHuntCell();
    }

    /** Cells where row + col is even first: every ship is at least two long, so it covers one of them. */
    _nextHuntCell() {
        const size = this.board.gridSize;

        for (const parity of [0, 1]) {
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if ((row + col) % 2 !== parity) {
                        continue;
                    }
                    if (!this._tried.has(`${row},${col}`)) {
                        return [row, col];
                    }
                }
            }
        }
        return null;
    }

    _shoot([row, col]) {
        this._tried.add(`${row},${col}`);
        this.shots.push([row, col]);

        const result = this.board.checkShot(row, col);
        if (result === ShotResult.HIT) {
            this._addNeighbors(row, col);
        } else if (result === ShotResult.SUNK) {
            this._targets = [];
        }
    }

    _addNeighbors(row, col) {
        const size = this.board.gridSize;

        for (const [dRow, dCol] of NEIGHBORS) {
            const r = row + dRow;
            const c = col + dCol;
            if (r < 0 || r >= size || c < 0 || c >= size) {
                continue;
            }
            this._targets.push([r, c]);
        }
    }
}

module.exports = { Solver };
