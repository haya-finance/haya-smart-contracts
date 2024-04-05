import { ethers, run } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const ControllerAddress = "0xc8548a0f72a6baa5a7bca998a10ab3b22e121f8f";
    const IntegrationRegistryAddress = "0x9B49c78E6FF64c008f0021Cf5D06681c7687DA8C";
    const SetTokenCreatorAddress = "0xC427b85123271A24c495f5D5cCF7fd2a018365B2";
    const BasicIssuanceModuleAddress = "0xAaE7c1CC8450B98ba15FB2a18686f7890812dDa3";
    const AuctionRebalanceModuleAddress = "0x7Ee4857161b273390fED3B6a52577b7f0D6f8a97";
    
    const INTEGRATION_REGISTRY_RESOURCE_ID = 0;
    const PRICE_ORACLE_RESOURCE_ID = 1;
    const SET_VALUER_RESOURCE_ID = 2;

    const Controller = await ethers.getContractFactory("Controller");
    const deployedController = await Controller.attach(ControllerAddress);

    let init = await deployedController.initialize([SetTokenCreatorAddress],[BasicIssuanceModuleAddress, AuctionRebalanceModuleAddress],[IntegrationRegistryAddress],[INTEGRATION_REGISTRY_RESOURCE_ID]);
    await init.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });