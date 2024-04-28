// SPDX-License-Identifier: MIT
pragma solidity 0.6.10;
pragma experimental "ABIEncoderV2";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AddressArrayUtils} from "../lib/AddressArrayUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


contract TokenFaucet is Ownable {
    using AddressArrayUtils for address[];

}