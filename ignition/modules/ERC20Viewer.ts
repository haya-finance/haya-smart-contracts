import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ERC20Viewer = buildModule("ERC20Viewer", (m) => {
  const viewer = m.contract("ERC20Viewer");
  return { viewer };
});

export default ERC20Viewer;
