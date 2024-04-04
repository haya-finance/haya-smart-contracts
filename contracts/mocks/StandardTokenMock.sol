// SPDX-License-Identifier: MIT
pragma solidity 0.6.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// mock class using BasicToken
contract StandardTokenMock is ERC20 {
    constructor(
        address _initialAccount,
        uint256 _initialBalance,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public ERC20(_name, _symbol) {
        _mint(_initialAccount, _initialBalance);
        _setupDecimals(_decimals);
    }

    function mint() external {
        _mint(msg.sender, 1_000_000 * 10 ** uint256(decimals()));
    }

    function mintWithAmount(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
