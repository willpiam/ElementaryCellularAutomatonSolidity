// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

function setBitIn(
    uint8[] memory array,
    uint256 _index,
    bool _value
) pure returns (uint8[] memory) {
    uint256 wordIndex = _index / 8;
    uint8 bitIndex = uint8(_index % 8);

    // console.log("[SOLIDITY: setBitIn] _index is %s", _index);
    // console.log("[SOLIDITY: setBitIn] wordIndex is %s \t!", wordIndex);
    // console.log("[SOLIDITY: setBitIn] bitIndex is %s", bitIndex);
    // console.log("[SOLIDITY: setBitIn] array.length is %s \t!", array.length);

    require(array.length > wordIndex, "setBitIn:Index out of bounds");

    if (_value) {
        array[wordIndex] |= (uint8(1) << bitIndex);
    } else {
        array[wordIndex] &= ~(uint8(1) << bitIndex);
    }

    return array;
}

function readBitFrom(uint8[] memory array, uint256 _index) pure returns (bool) {
    uint256 wordIndex = _index / 8;
    uint8 bitIndex = uint8(_index % 8);

    require(array.length > wordIndex, "readBitFrom:Index out of bounds");

    return (array[wordIndex] & (uint8(1) << bitIndex)) != 0;
}

function calculateNextGenerationCell(
    uint8[] memory parentCells, // we only read the first 3 bits from this
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
    uint8[][] memory history,
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
        for (uint8 j = 0; j < initialPadding - i; j++) {
            pad = string(abi.encodePacked(pad, empty));
        }
        generation = string(abi.encodePacked(pad, generation, pad, "\n"));
        output = string(abi.encodePacked(output, generation));
    }

    return output;
}

contract ElementaryCellularAutomaton {
    uint256 public initialGenerationSize;
    uint256 public generationSize;
    uint8[][] public history;
    uint8[] public bitmap;

    constructor(uint8[] memory initialState, uint8 _initialGenerationSize) {
        initialGenerationSize = _initialGenerationSize;
        generationSize = initialGenerationSize;
        for (uint8 i = 0; i < generationSize; i++) {
            if (i % 8 == 0) {
                bitmap.push(0);
            }
            setBit(i, readBitFrom(initialState, i));
        }
        bitmap.push(0);
    }

    function setBit(uint256 _index, bool _value) internal {
        uint256 wordIndex = _index / 8;

        while (bitmap.length <= wordIndex) {
            bitmap.push(0);
        }

        bitmap = setBitIn(bitmap, _index, _value);
    }

    function getBitFromHistory(
        uint256 historyIndex,
        uint8 bitIndex
    ) internal view returns (bool) {
        return readBitFrom(history[historyIndex], bitIndex);
    }

    function applyRule(
        uint8 _rule,
        uint8[] memory previousState
    ) internal view returns (uint8[] memory) {
        uint8[] memory nextGeneration = new uint8[](generationSize);
        uint8[] memory currentGeneration = new uint8[](generationSize);

        for (uint8 i = 0; i < previousState.length; i++) {
            currentGeneration = setBitIn(
                currentGeneration,
                i + 2,
                readBitFrom(previousState, i)
            );
        }

        uint8[] memory parentCells = new uint8[](1); // 1 word is more than enough to store 3 bits

        for (uint8 i = 0; i < previousState.length + 2; i++) {
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
        uint8[] memory currentGeneration = new uint8[](generationSize);

        for (uint8 i = 0; i < generationSize; i++) {
            currentGeneration = setBitIn(
                currentGeneration,
                i,
                readBitFrom(bitmap, i)
            );
        }
        console.log("[SOLIDITY: _next] about to apply rule");
        uint8[] memory nextGeneration = applyRule(_rule, currentGeneration);

        for (uint8 i = 0; i < generationSize + 2; i++) {
            setBit(i, readBitFrom(nextGeneration, i));
        }

        generationSize += 2;
    }

    function next(uint8 _rule, uint8 applications) public {
        for (uint8 k = 0; k < applications; k++) {
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
