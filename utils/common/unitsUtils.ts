import { ethers } from "ethers";
import { BigNumber } from "ethers";

export const btc = (amount: number): BigNumber => {
  const weiString = 100000000 * amount; // Handles decimal Bitcoins better
  return BigNumber.from(weiString);
};

export const eth = (amount: number | string): BigNumber => {
  const weiString = ethers.utils.parseEther(amount.toString());
  return BigNumber.from(weiString);
};

export const usdc = (amount: number): BigNumber => {
  const weiString = 1000000 * amount;
  return BigNumber.from(weiString);
};

export const ens = (amount: number | string): BigNumber => {
  const weiString = ethers.utils.parseEther(amount.toString());
  return BigNumber.from(weiString);
};
