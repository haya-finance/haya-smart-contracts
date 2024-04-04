// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

/**
 * @title Uint256ArrayUtils
 * @author Set Protocol
 *
 * Utility functions to handle Uint256 Arrays
 */
library Uint256ArrayUtils {
    /**
     * Returns the combination of the two arrays
     * @param A The first array
     * @param B The second array
     * @return Returns A extended by B
     */
    function extend(
        uint256[] memory A,
        uint256[] memory B
    ) internal pure returns (uint256[] memory) {
        uint256 aLength = A.length;
        uint256 bLength = B.length;
        uint256[] memory newUints = new uint256[](aLength + bLength);
        for (uint256 i = 0; i < aLength; i++) {
            newUints[i] = A[i];
        }
        for (uint256 j = 0; j < bLength; j++) {
            newUints[aLength + j] = B[j];
        }
        return newUints;
    }
}
