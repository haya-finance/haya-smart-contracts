import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xc8548A0F72a6Baa5A7BCa998a10AB3b22e121F8f";

const SetTokenCreator = buildModule("SetTokenCreator", (m) => {
  const controller = m.getParameter("Controller", CONTROLLER);
  const setTokenCreator = m.contract("SetTokenCreator", [controller]);
  return { setTokenCreator };
});

export default SetTokenCreator;