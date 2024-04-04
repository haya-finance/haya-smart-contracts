// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import {ISetToken} from "./ISetToken.sol";

interface IManagerIssuanceHook {
    function invokePreIssueHook(
        ISetToken _setToken,
        uint256 _issueQuantity,
        address _sender,
        address _to
    ) external;

    function invokePreRedeemHook(
        ISetToken _setToken,
        uint256 _redeemQuantity,
        address _sender,
        address _to
    ) external;
}
