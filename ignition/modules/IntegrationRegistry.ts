import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "";

const IntegrationRegistry = buildModule("IntegrationRegistry", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);
  const integrationRegistry = m.contract("IntegrationRegistry", [
    controllerContract,
  ]);
  return { integrationRegistry };
});

export default IntegrationRegistry;
