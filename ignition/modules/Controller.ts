import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const FEERECIPIENT: string = "";
const Controller = buildModule("Controller", (m) => {
  const feeRecipient = m.getParameter("Controller", FEERECIPIENT);
  const controller = m.contract("Controller", [feeRecipient]);
  return { controller };
});

export default Controller;
