import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "";

const SetTokenCreator = buildModule("SetTokenCreator", (m) => {
  const controller = m.getParameter("Controller", CONTROLLER);
  const setTokenCreator = m.contract("SetTokenCreator", [controller]);
  return { setTokenCreator };
});

export default SetTokenCreator;
