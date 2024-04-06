import { ethers, run } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";
    const ControllerAddress = "0xc8548a0f72a6baa5a7bca998a10ab3b22e121f8f";


    const oldAuctionRebalanceModuleAddress = "0x7Ee4857161b273390fED3B6a52577b7f0D6f8a97";
    const newAuctionRebalanceModuleAddress = "0xC8B5c3Dc61dF97F996cBE4E1cA61a874E4cEC8C1";

    const AuctionRebalanceModule = await ethers.getContractFactory("AuctionRebalanceModule");

    const Controller = await ethers.getContractFactory("Controller");
    const deployedController = await Controller.attach(ControllerAddress);
    
    const controllerAddModule = await deployedController.addModule(newAuctionRebalanceModuleAddress);
    await controllerAddModule.wait();

    const SetToken = await ethers.getContractFactory("SetToken");
    const deployedSetToken = await SetToken.attach(SetTokenAddress);

    let isLock = await deployedSetToken.isLocked();
    if (isLock) {
        console.log("unlock...");
        const oldDeployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(oldAuctionRebalanceModuleAddress);
        let unlock = await oldDeployedAuctionRebalanceModule.unlock(SetTokenAddress);
        await unlock.wait();
    }
    let removeModule = await deployedSetToken.removeModule(oldAuctionRebalanceModuleAddress);
    console.log("removeModule...");
    await removeModule.wait();

    let addModule = await deployedSetToken.addModule(newAuctionRebalanceModuleAddress);
    console.log("addModule...");
    await addModule.wait();
    const newDeployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(newAuctionRebalanceModuleAddress);
    
    let initModule = await newDeployedAuctionRebalanceModule.initialize(SetTokenAddress);
    console.log("initialize...");
    await initModule.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });