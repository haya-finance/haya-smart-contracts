import { ethers } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";
    const ControllerAddress = "0xc8548a0f72a6baa5a7bca998a10ab3b22e121f8f";


    const oldAuctionRebalanceModuleAddress = "0x890A7E036843f0790852ac7e24A95Fee3B7B3849";
    const newAuctionRebalanceModuleAddress = "0xb5ed7eDf57B1A41545386eCb98cA293a66A5E02a";

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