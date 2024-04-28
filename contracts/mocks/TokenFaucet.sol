// SPDX-License-Identifier: MIT
pragma solidity 0.6.10;
pragma experimental "ABIEncoderV2";
import {AddressArrayUtils} from "../lib/AddressArrayUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStandardTokenMock} from "./IStandardTokenMock.sol";


contract TokenFaucet is Ownable {
    using AddressArrayUtils for address[];

    address[] public components;
    uint256 public amount;

    constructor() public {
        amount = 100_000;
    }

    receive() external payable {
        address payable _toPayable = payable(msg.sender);
        (bool sent, ) = _toPayable.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
        _mint2Account(msg.sender);
    }

    function setAmount(uint256 _amount) external onlyOwner {
        amount = _amount;
    }

    function addComponents(address[] memory _components) external onlyOwner {
        components = components.extend(_components);
    }

    function addComponent(address _component) external onlyOwner {
        components.push(_component);
    }

    function removeComponent(address _component) external onlyOwner {
        components.removeStorage(_component);
    }

    function mint2Accounts(address[] memory _accounts) external {
        for (uint i = 0; i < _accounts.length; i++) {
            _mint2Account(_accounts[i]);
        }
    }

    function _mint2Account(address _account) internal {
        for (uint i = 0; i < components.length; i++) {
            uint256 _amount = amount * 10**uint256(IStandardTokenMock(components[i]).decimals());
            IStandardTokenMock(components[i]).mintWithAmount(_amount);
            IStandardTokenMock(components[i]).transfer(_account, _amount);
        }
    }
}

