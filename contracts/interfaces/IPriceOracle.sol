// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

/**
 * @title IPriceOracle
 * @author Set Protocol
 *
 * Interface for interacting with PriceOracle
 */
interface IPriceOracle {
    /* ============ Functions ============ */

    function getPrice(
        address _assetOne,
        address _assetTwo
    ) external view returns (uint256);

    function masterQuoteAsset() external view returns (address);
}
