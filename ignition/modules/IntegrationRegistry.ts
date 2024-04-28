import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xd5c077Efe284b060c68c4Fdf9888d4734DDe74E0";

const IntegrationRegistry = buildModule("IntegrationRegistry", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);
  const integrationRegistry = m.contract("IntegrationRegistry", [
    controllerContract,
  ]);
  return { integrationRegistry };
});

export default IntegrationRegistry;
