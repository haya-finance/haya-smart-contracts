import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenFaucet = buildModule("TokenFaucet", (m) => {
  const tokenFaucet = m.contract("TokenFaucet");
  return { tokenFaucet };
});

export default TokenFaucet;
