// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

interface IController {
    function addSet(address _setToken) external;

    function feeRecipient() external view returns (address);

    function getModuleFee(
        address _module,
        uint256 _feeType
    ) external view returns (uint256);

    function isModule(address _module) external view returns (bool);

    function isSet(address _setToken) external view returns (bool);

    function isSystemContract(
        address _contractAddress
    ) external view returns (bool);

    function resourceId(uint256 _id) external view returns (address);
}
