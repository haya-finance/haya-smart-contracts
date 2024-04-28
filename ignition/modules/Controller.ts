import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const FEERECIPIENT: string = "0xEeecDf2Cc0E5FB3A2BFf15Cf86c51860D8eb8801";
const Controller = buildModule("Controller", (m) => {
  const feeRecipient = m.getParameter("Controller", FEERECIPIENT);
  const controller = m.contract("Controller", [feeRecipient]);
  return { controller };
});

export default Controller;
