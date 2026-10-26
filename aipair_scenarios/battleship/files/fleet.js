/**
 * Provides ship definitions and standard fleet configurations.
 * getTestFleet() is useful when developing your Solver.
 */

function getStandardFleet() {
    return [
        { name: "Carrier", size: 5 },
        { name: "Battleship", size: 4 },
        { name: "Cruiser", size: 3 },
        { name: "Submarine", size: 3 },
        { name: "Destroyer", size: 2 },
    ];
}

function getTestFleet() {
    return [
        { name: "Cruiser", size: 3 },
        { name: "Submarine", size: 3 },
    ];
}

module.exports = { getStandardFleet, getTestFleet };
