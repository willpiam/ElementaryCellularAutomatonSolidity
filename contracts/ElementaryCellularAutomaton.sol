// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

// contract ElementaryCellularAutomaton {
//     uint256 public generationSize;
//     uint256[][] public history;

//     uint256[] public bitmap;

//     constructor() {
//         generationSize = 1;
//         setBit(0, true);
//     }

//     function setBit(uint256 _index, bool _value) internal {
//         uint256 wordIndex = _index / 256;
//         uint256 bitIndex = _index % 256;

//         while (bitmap.length <= wordIndex) {
//             bitmap.push(0);
//         }

//         if (_value) {
//             bitmap[wordIndex] |= (1 << bitIndex);
//         } else {
//             bitmap[wordIndex] &= ~(1 << bitIndex);
//         }
//     }

//     function getBit(uint256 _index) internal view returns (bool) {
//         uint256 wordIndex = _index / 256;
//         uint256 bitIndex = _index % 256;

//         if (wordIndex >= bitmap.length) return false;

//         return (bitmap[wordIndex] & (1 << bitIndex)) != 0;
//     }

//     function getBitFromHistory(
//         uint256 historyIndex,
//         uint256 bitIndex
//     ) internal view returns (bool) {
//         uint256 wordIndex = bitIndex / 256;
//         uint256 localBitIndex = bitIndex % 256;

//         if (wordIndex >= history[historyIndex].length) return false;

//         return (history[historyIndex][wordIndex] & (1 << localBitIndex)) != 0;
//     }

//     function _next(uint8 _rule) internal {
//         history.push(bitmap); // Update history with the current bitmap

//         bool[] memory currentGenerationWithoutPadding = new bool[](
//             generationSize
//         );
//         for (uint256 i = 0; i < generationSize; i++) {
//             currentGenerationWithoutPadding[i] = getBit(i);
//         }

//         bool[] memory nextGeneration = applyRule(
//             _rule,
//             currentGenerationWithoutPadding
//         );

//         for (uint256 i = 0; i < generationSize + 2; i++) {
//             setBit(i, nextGeneration[i]);
//         }

//         generationSize += 2;
//     }

//     function next(uint8 _rule, uint256 applications) public {
//         for (uint256 k = 0; k < applications; k++) {
//             _next(_rule);
//         }
//     }

//     function print() public view returns (string memory) {
//         string memory output = "";

//         for (uint256 i = 0; i < history.length; i++) {
//             string memory generation = "";
//             for (uint256 k = 0; k < (i + 1) * 2 - 1; k++) {
//                 if (getBitFromHistory(i, k)) {
//                     generation = string(abi.encodePacked(generation, "\u2B1B"));
//                 } else {
//                     generation = string(abi.encodePacked(generation, "\u2B1C"));
//                 }
//             }
//             string memory pad = "";
//             for (uint256 j = 0; j < (generationSize / 2) - i; j++) {
//                 pad = string(abi.encodePacked(pad, ".."));
//             }
//             generation = string(abi.encodePacked(pad, generation, "\n"));
//             output = string(abi.encodePacked(output, generation));
//         }

//         return output;
//     }

//     function calculateNextGenerationCell(
//         bool[3] memory parentCells,
//         uint8 rule
//     ) internal pure returns (bool) {
//         uint8 index = 0;

//         if (parentCells[0]) {
//             index += 4;
//         }
//         if (parentCells[1]) {
//             index += 2;
//         }
//         if (parentCells[2]) {
//             index += 1;
//         }

//         return ((rule >> index) & 1) == 1;
//     }

//     function applyRule(
//         uint8 _rule,
//         bool[] memory previousState
//     ) internal pure returns (bool[] memory) {
//         bool[] memory nextGeneration = new bool[](previousState.length + 2);
//         bool[] memory currentGeneration = new bool[](previousState.length + 4);

//         for (uint256 i = 0; i < previousState.length; i++) {
//             currentGeneration[i + 2] = previousState[i];
//         }

//         bool[3] memory parentCells;

//         for (uint256 i = 0; i < previousState.length + 2; i++) {
//             parentCells[0] = currentGeneration[i];
//             parentCells[1] = currentGeneration[i + 1];
//             parentCells[2] = currentGeneration[i + 2];

//             nextGeneration[i] = calculateNextGenerationCell(parentCells, _rule);
//         }

//         return nextGeneration;
//     }
// }
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
    // bool[3] memory parentCells,
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

function applyRule(
    uint8 _rule,
    bool[] memory previousState
) pure returns (bool[] memory) {
    bool[] memory nextGeneration = new bool[](previousState.length + 2);
    bool[] memory currentGeneration = new bool[](previousState.length + 4);

    for (uint256 i = 0; i < previousState.length; i++) {
        currentGeneration[i + 2] = previousState[i];
    }

    // bool[3] memory parentCells;
    uint256[] memory parentCells = new uint256[](1); // 1 word is more than enough to store 3 bits

    for (uint256 i = 0; i < previousState.length + 2; i++) {
        // parentCells[0] = currentGeneration[i];
        // set bit at 0 in parentCells to the value of the bit at i in currentGeneration
        parentCells = setBitIn(parentCells, 0, currentGeneration[i]);
        parentCells = setBitIn(parentCells, 1, currentGeneration[i + 1]);
        parentCells = setBitIn(parentCells, 2, currentGeneration[i + 2]);
        // parentCells[1] = currentGeneration[i + 1];

        // parentCells[2] = currentGeneration[i + 2];

        nextGeneration[i] = calculateNextGenerationCell(parentCells, _rule);
    }

    return nextGeneration;
}

contract ElementaryCellularAutomaton {
    uint256 public generationSize;
    uint256[][] public history;

    uint256[] public bitmap;

    constructor() {
        generationSize = 1;
        setBit(0, true);
    }

    function setBit(uint256 _index, bool _value) internal {
        uint256 wordIndex = _index / 256;

        while (bitmap.length <= wordIndex) {
            bitmap.push(0);
        }

        bitmap = setBitIn(bitmap, _index, _value);
    }

    function getBit(uint256 _index) internal view returns (bool) {
        return readBitFrom(bitmap, _index);
    }

    function getBitFromHistory(
        uint256 historyIndex,
        uint256 bitIndex
    ) internal view returns (bool) {
        uint256 wordIndex = bitIndex / 256;
        uint256 localBitIndex = bitIndex % 256;

        if (wordIndex >= history[historyIndex].length) return false;

        return (history[historyIndex][wordIndex] & (1 << localBitIndex)) != 0;
    }

    function _next(uint8 _rule) internal {
        history.push(bitmap); // Update history with the current bitmap

        bool[] memory currentGenerationWithoutPadding = new bool[](
            generationSize
        );
        for (uint256 i = 0; i < generationSize; i++) {
            currentGenerationWithoutPadding[i] = getBit(i);
        }

        bool[] memory nextGeneration = applyRule(
            _rule,
            currentGenerationWithoutPadding
        );

        for (uint256 i = 0; i < generationSize + 2; i++) {
            setBit(i, nextGeneration[i]);
        }

        generationSize += 2;
    }

    function next(uint8 _rule, uint256 applications) public {
        for (uint256 k = 0; k < applications; k++) {
            _next(_rule);
        }
    }

    function print() public view returns (string memory) {
        string memory output = "";

        for (uint256 i = 0; i < history.length; i++) {
            string memory generation = "";
            for (uint256 k = 0; k < (i + 1) * 2 - 1; k++) {
                if (getBitFromHistory(i, k)) {
                    generation = string(abi.encodePacked(generation, "\u2B1B"));
                } else {
                    generation = string(abi.encodePacked(generation, "\u2B1C"));
                }
            }
            string memory pad = "";
            for (uint256 j = 0; j < (generationSize / 2) - i; j++) {
                pad = string(abi.encodePacked(pad, ".."));
            }
            generation = string(abi.encodePacked(pad, generation, "\n"));
            output = string(abi.encodePacked(output, generation));
        }

        return output;
    }
}
