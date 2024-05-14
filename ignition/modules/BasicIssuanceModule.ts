import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "";

const BasicIssuanceModule = buildModule("BasicIssuanceModule", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);
  const basicIssuanceModule = m.contract("BasicIssuanceModule", [
    controllerContract,
  ]);
  return { basicIssuanceModule };
});

export default BasicIssuanceModule;
