// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

/**
 * @title BytesArrayUtils
 * @author Set Protocol
 *
 * Utility library to type cast bytes arrays. Extends BytesLib (external/contracts/uniswap/v3/lib/BytesLib.sol)
 * library functionality.
 */
library BytesArrayUtils {
    /**
     * Type cast byte to boolean.
     * @param _bytes        Bytes array
     * @param _start        Starting index
     * @return bool        Boolean value
     */
    function toBool(
        bytes memory _bytes,
        uint256 _start
    ) internal pure returns (bool) {
        require(_start + 1 >= _start, "toBool_overflow");
        require(_bytes.length >= _start + 1, "toBool_outOfBounds");
        uint8 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x1), _start))
        }

        require(tempUint <= 1, "Invalid bool data"); // Should be either 0 or 1

        return (tempUint == 0) ? false : true;
    }
}
