import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const ControllerAddress = "0xd5c077Efe284b060c68c4Fdf9888d4734DDe74E0";
  const IntegrationRegistryAddress =
    "0x22199Fe14E098d726b75347d35Dd5E4AC71Af09d";
  const SetTokenCreatorAddress = "0x4DBBc91D75b69865e61632DB8c5e36C544A3B6D9";
  const BasicIssuanceModuleAddress =
    "0x0Dd18972815D8A2b611F82F57E0bA26faaA972e1";
  const AuctionRebalanceModuleAddress =
    "0x9fab487f90c0A3b20717c245004952da9827C8Ff";

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
