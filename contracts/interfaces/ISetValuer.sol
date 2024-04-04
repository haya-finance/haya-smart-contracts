// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import {ISetToken} from "../interfaces/ISetToken.sol";

interface ISetValuer {
    function calculateSetTokenValuation(
        ISetToken _setToken,
        address _quoteAsset
    ) external view returns (uint256);
}
