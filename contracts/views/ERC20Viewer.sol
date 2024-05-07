// SPDX-License-Identifier: MIT
pragma solidity 0.6.10;
pragma experimental "ABIEncoderV2";

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/**
 * @title ERC20Viewer
 *
 * Interfaces for fetching multiple ERC20 state in a single read
 */
contract ERC20Viewer {
    
    /**
     * @notice  Fetches token symbols names decimals for each tokenAddress
     * @dev     .
     * @param   _tokenAddresses  Addresses of ERC20 contracts
     */
    function batchFetchBaseInfos(address[] calldata _tokenAddresses) public view returns(string [] memory, string [] memory, uint8[] memory) {
        // Cache length of addresses to fetch 
        uint256 addressesCount = _tokenAddresses.length;
        // Instantiate output array in memory
        string [] memory symbols = new string[](addressesCount);
        string [] memory names = new string[](addressesCount);
        uint8[] memory decimals = new uint8[](addressesCount);
        for (uint256 i = 0; i < addressesCount; i++) {
            symbols[i] = ERC20(address(_tokenAddresses[i])).symbol();
            names[i] = ERC20(address(_tokenAddresses[i])).name();
            decimals[i] = ERC20(address(_tokenAddresses[i])).decimals();
        }
        return (symbols, names, decimals);
    }

    /*
     * Fetches token balances for each tokenAddress, tokenOwner pair
     *
     * @param  _tokenAddresses    Addresses of ERC20 contracts
     * @param  _ownerAddresses    Addresses of users sequential to tokenAddress
     * @return  uint256[]         Array of balances for each ERC20 contract passed in
     */
    function batchFetchBalancesOf(
        address[] calldata _tokenAddresses,
        address[] calldata _ownerAddresses
    )
        public
        view
        returns (uint256[] memory)
    {
        // Cache length of addresses to fetch balances for
        uint256 addressesCount = _tokenAddresses.length;

        // Instantiate output array in memory
        uint256[] memory balances = new uint256[](addressesCount);

        // Cycle through contract addresses array and fetching the balance of each for the owner
        for (uint256 i = 0; i < addressesCount; i++) {
            balances[i] = ERC20(address(_tokenAddresses[i])).balanceOf(_ownerAddresses[i]);
        }

        return balances;
    }

    /*
     * Fetches token allowances for each tokenAddress, tokenOwner tuple
     *
     * @param  _tokenAddresses      Addresses of ERC20 contracts
     * @param  _ownerAddresses      Addresses of owner sequential to tokenAddress
     * @param  _spenderAddresses    Addresses of spenders sequential to tokenAddress
     * @return  uint256[]           Array of allowances for each ERC20 contract passed in
     */
    function batchFetchAllowances(
        address[] calldata _tokenAddresses,
        address[] calldata _ownerAddresses,
        address[] calldata _spenderAddresses
    )
        public
        view
        returns (uint256[] memory)
    {
        // Cache length of addresses to fetch allowances for
        uint256 addressesCount = _tokenAddresses.length;

        // Instantiate output array in memory
        uint256[] memory allowances = new uint256[](addressesCount);

        // Cycle through contract addresses array and fetching the balance of each for the owner
        for (uint256 i = 0; i < addressesCount; i++) {
            allowances[i] = ERC20(address(_tokenAddresses[i])).allowance(_ownerAddresses[i], _spenderAddresses[i]);
        }

        return allowances;
    }
}