// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

interface IIntegrationRegistry {
    function addIntegration(
        address _module,
        string memory _id,
        address _wrapper
    ) external;

    function getIntegrationAdapter(
        address _module,
        string memory _id
    ) external view returns (address);

    function getIntegrationAdapterWithHash(
        address _module,
        bytes32 _id
    ) external view returns (address);

    function isValidIntegration(
        address _module,
        string memory _id
    ) external view returns (bool);
}
