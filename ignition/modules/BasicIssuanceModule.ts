import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xc8548A0F72a6Baa5A7BCa998a10AB3b22e121F8f";

const BasicIssuanceModule = buildModule("BasicIssuanceModule", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);
  const basicIssuanceModule = m.contract("BasicIssuanceModule", [controllerContract]);
  return { basicIssuanceModule };
});

export default BasicIssuanceModule;