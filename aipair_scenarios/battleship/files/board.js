/** Read this first. */

const ShotResult = Object.freeze({
    HIT: "HIT",
    MISS: "MISS",
    SUNK: "SUNK",
    ALREADY_SHOT: "ALREADY_SHOT",
});

class Board {
    constructor(gridSize = 10) {
        this._gridSize = gridSize;
        this._ships = new Map(); // ship name -> list of [row, col]
        this._hits = new Set(); // "row,col"
        this._misses = new Set();
        this._occupied = new Set();
        this._sunk = new Set(); // ship names
    }

    get gridSize() {
        return this._gridSize;
    }

    placeShip(ship, row, col, horizontal) {
        const cells = [];
        for (let i = 0; i < ship.size; i++) {
            let r;
            let c;
            if (horizontal) {
                r = row;
                c = col + i;
            } else {
                r = row;
                c = col + i;
            }

            if (r < 0 || r >= this._gridSize || c < 0 || c >= this._gridSize) {
                throw new RangeError(`${ship.name} out of bounds at (${r}, ${c})`);
            }
            const key = `${r},${c}`;
            if (this._occupied.has(key)) {
                throw new RangeError(`${ship.name} overlaps at (${r}, ${c})`);
            }
            cells.push([r, c]);
        }

        for (const [r, c] of cells) {
            this._occupied.add(`${r},${c}`);
        }
        this._ships.set(ship.name, cells);
    }

    checkShot(row, col) {
        const key = `${row},${col}`;
        if (this._hits.has(key) || this._misses.has(key)) {
            return ShotResult.MISS;
        }

        if (!this._occupied.has(key)) {
            this._misses.add(key);
            return ShotResult.MISS;
        }

        this._hits.add(key);

        for (const [name, cells] of this._ships.entries()) {
            const cellInShip = cells.some(([r, c]) => r === row && c === col);
            if (cellInShip) {
                const hitCount = cells.slice(1).filter(([r, c]) => this._hits.has(`${r},${c}`)).length;
                if (hitCount === cells.length - 1) {
                    this._sunk.add(name);
                    return ShotResult.SUNK;
                }
                return ShotResult.HIT;
            }
        }

        return ShotResult.HIT;
    }

    allSunk() {
        return this._sunk.size === this._ships.size;
    }

    remainingShips() {
        return this._ships.size - this._sunk.size;
    }

    totalShots() {
        return this._hits.size + this._misses.size;
    }
}

module.exports = { Board, ShotResult };
