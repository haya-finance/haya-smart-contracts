import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FACTORY: string = "0x96AFFaA7b0C9CdF6618631991622F03e222dc657";
const WETH: string = "0x0d05D33Ab10870069DE5Aa7Ddcd42fbEB8C44dCd";
const UniswapV2Router02 = buildModule("UniswapV2Router02", (m) => {
  const factory = m.getParameter("factory", FACTORY);
  const weth = m.getParameter("weth", WETH);
  const uniswapV2Router = m.contract("UniswapV2Router02", [factory, weth]);
  return { uniswapV2Router };
});

export default UniswapV2Router02;
