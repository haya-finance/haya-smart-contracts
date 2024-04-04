// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import {ISetToken} from "./ISetToken.sol";

interface IBasicIssuanceModule {
    function getRequiredComponentUnitsForIssue(
        ISetToken _setToken,
        uint256 _quantity
    ) external returns (address[] memory, uint256[] memory);

    function redeem(
        ISetToken _setToken,
        uint256 _quantity,
        address _to
    ) external;
}
