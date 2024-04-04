// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

/**
 * @title IOracleAdapter
 * @author Set Protocol
 *
 * Interface for calling an oracle adapter.
 */
interface IOracleAdapter {
    /**
     * Function for retrieving a price that requires sourcing data from outside protocols to calculate.
     *
     * @param  _assetOne    First asset in pair
     * @param  _assetTwo    Second asset in pair
     * @return                  Boolean indicating if oracle exists
     * @return              Current price of asset represented in uint256
     */
    function getPrice(
        address _assetOne,
        address _assetTwo
    ) external view returns (bool, uint256);
}
