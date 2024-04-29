import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FEETOSETTER: string = "0x62a9E51CAf4138e3De7411cC0000000007918888";
const UniswapV2Factory = buildModule("UniswapV2Factory", (m) => {
  const feeToSetter = m.getParameter("feeToSetter", FEETOSETTER);
  const uniswapV2Factory = m.contract("UniswapV2Factory", [feeToSetter]);
  return { uniswapV2Factory };
});

export default UniswapV2Factory;
