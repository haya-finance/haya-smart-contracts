import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xd5c077Efe284b060c68c4Fdf9888d4734DDe74E0";

const SetTokenCreator = buildModule("SetTokenCreator", (m) => {
  const controller = m.getParameter("Controller", CONTROLLER);
  const setTokenCreator = m.contract("SetTokenCreator", [controller]);
  return { setTokenCreator };
});

export default SetTokenCreator;
