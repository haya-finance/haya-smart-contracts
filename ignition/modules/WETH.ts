import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WETH9 = buildModule("WETH9", (m) => {
  const weth = m.contract("WETH9");
  return { weth };
});

export default WETH9;
