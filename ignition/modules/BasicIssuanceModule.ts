import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xd5c077Efe284b060c68c4Fdf9888d4734DDe74E0";

const BasicIssuanceModule = buildModule("BasicIssuanceModule", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);
  const basicIssuanceModule = m.contract("BasicIssuanceModule", [
    controllerContract,
  ]);
  return { basicIssuanceModule };
});

export default BasicIssuanceModule;
