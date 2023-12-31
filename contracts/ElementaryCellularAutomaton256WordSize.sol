// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/utils/Strings.sol";
// import "hardhat/console.sol";

function setBitIn(
    uint256[] memory array,
    uint256 _index,
    bool _value
) pure returns (uint256[] memory) {
    uint256 wordIndex = _index / 256;
    uint256 bitIndex = _index % 256;

    require(array.length > wordIndex, "setBitIn:Index out of bounds");

    if (_value) {
        array[wordIndex] |= (1 << bitIndex);
    } else {
        array[wordIndex] &= ~(1 << bitIndex);
    }

    return array;
}

function readBitFrom(
    uint256[] memory array,
    uint256 _index
) pure returns (bool) {
    uint256 wordIndex = _index / 256;
    uint256 bitIndex = _index % 256;

    require(array.length > wordIndex, "readBitFrom:Index out of bounds");

    return (array[wordIndex] & (1 << bitIndex)) != 0;
}

function calculateNextGenerationCell(
    uint256[] memory parentCells, // we only read the first 3 bits from this
    uint8 rule
) pure returns (bool) {
    uint8 index = 0;

    if (readBitFrom(parentCells, 0)) {
        index += 4;
    }
    if (readBitFrom(parentCells, 1)) {
        index += 2;
    }
    if (readBitFrom(parentCells, 2)) {
        index += 1;
    }

    return ((rule >> index) & 1) == 1;
}

function _print(
    uint256 initialGenerationSize,
    uint256 generationSize,
    uint256[][] memory history,
    string memory empty,
    string memory alive,
    string memory dead
) pure returns (string memory) {
    string memory output = string(
        abi.encodePacked(
            "P1\n",
            Strings.toString(generationSize),
            " ",
            Strings.toString(history.length),
            "\n"
        )
    );

    uint256 initialPadding = (generationSize - initialGenerationSize) / 2;

    for (uint256 i = 0; i < history.length; i++) {
        string memory generation = "";
        for (uint256 k = 1; k <= initialGenerationSize + 2 * i; k++) {
            if (readBitFrom(history[i], (initialGenerationSize + 2 * i) - k)) {
                generation = string(abi.encodePacked(generation, alive));
            } else {
                generation = string(abi.encodePacked(generation, dead));
            }
        }

        string memory pad = "";
        for (uint256 j = 0; j < initialPadding - i; j++) {
            pad = string(abi.encodePacked(pad, empty));
        }
        generation = string(abi.encodePacked(pad, generation, pad, "\n"));
        output = string(abi.encodePacked(output, generation));
    }

    return output;
}

contract ElementaryCellularAutomaton256WordSize {
    uint256 public initialGenerationSize;
    uint256 public generationSize;
    uint256[][] public history;
    uint256[] public bitmap;

    constructor(uint256[] memory initialState, uint256 _initialGenerationSize) {
        initialGenerationSize = _initialGenerationSize;
        generationSize = initialGenerationSize;
        for (uint256 i = 0; i < generationSize; i++) {
            setBit(i, readBitFrom(initialState, i));
        }
        bitmap.push(0);
    }

    function setBit(uint256 _index, bool _value) internal {
        uint256 wordIndex = _index / 256;

        while (bitmap.length <= wordIndex) {
            bitmap.push(0);
        }

        bitmap = setBitIn(bitmap, _index, _value);
    }

    function getBitFromHistory(
        uint256 historyIndex,
        uint256 bitIndex
    ) internal view returns (bool) {
        return readBitFrom(history[historyIndex], bitIndex);
    }

    function applyRule(
        uint8 _rule,
        uint256[] memory previousState
    ) internal view returns (uint256[] memory) {
        uint256[] memory nextGeneration = new uint256[](generationSize);
        uint256[] memory currentGeneration = new uint256[](generationSize);

        for (uint256 i = 0; i < previousState.length; i++) {
            currentGeneration = setBitIn(
                currentGeneration,
                i + 2,
                readBitFrom(previousState, i)
            );
        }

        uint256[] memory parentCells = new uint256[](1); // 1 word is more than enough to store 3 bits

        for (uint256 i = 0; i < previousState.length + 2; i++) {
            parentCells = setBitIn(
                parentCells,
                2,
                readBitFrom(currentGeneration, i)
            );
            parentCells = setBitIn(
                parentCells,
                1,
                readBitFrom(currentGeneration, i + 1)
            );
            parentCells = setBitIn(
                parentCells,
                0,
                readBitFrom(currentGeneration, i + 2)
            );

            nextGeneration = setBitIn(
                nextGeneration,
                i,
                calculateNextGenerationCell(parentCells, _rule)
            );
        }

        return nextGeneration;
    }

    function _next(uint8 _rule) internal {
        history.push(bitmap); // Update history with the current bitmap
        uint256[] memory currentGeneration = new uint256[](generationSize);

        for (uint256 i = 0; i < generationSize; i++) {
            currentGeneration = setBitIn(
                currentGeneration,
                i,
                readBitFrom(bitmap, i)
            );
        }

        uint256[] memory nextGeneration = applyRule(_rule, currentGeneration);

        for (uint256 i = 0; i < generationSize + 2; i++) {
            setBit(i, readBitFrom(nextGeneration, i));
        }

        generationSize += 2;
    }

    function next(uint8 _rule, uint256 applications) public {
        for (uint256 k = 0; k < applications; k++) {
            _next(_rule);
        }
    }

    function print() public view returns (string memory) {
        return
            _print(
                initialGenerationSize,
                generationSize,
                history,
                "..",
                "\u2B1B",
                "\u2B1C"
            );
    }

    function printPBM() public view returns (string memory) {
        return
            _print(
                initialGenerationSize,
                generationSize,
                history,
                "0 ",
                "1 ",
                "0 "
            );
    }
}
