import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const ControllerAddress = "";
  const IntegrationRegistryAddress = "";
  const SetTokenCreatorAddress = "";
  const BasicIssuanceModuleAddress = "";
  const AuctionRebalanceModuleAddress = "";

  const INTEGRATION_REGISTRY_RESOURCE_ID = 0;
  const PRICE_ORACLE_RESOURCE_ID = 1;
  const SET_VALUER_RESOURCE_ID = 2;

  const Controller = await ethers.getContractFactory("Controller");
  const deployedController = await Controller.attach(ControllerAddress);

  let init = await deployedController.initialize(
    [SetTokenCreatorAddress],
    [BasicIssuanceModuleAddress, AuctionRebalanceModuleAddress],
    [IntegrationRegistryAddress],
    [INTEGRATION_REGISTRY_RESOURCE_ID]
  );
  await init.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
