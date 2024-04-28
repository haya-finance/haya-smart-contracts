import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const SetTokenAddress = "";
  const ControllerAddress = "";

  const oldAuctionRebalanceModuleAddress = "";
  const newAuctionRebalanceModuleAddress = "";

  const AuctionRebalanceModule = await ethers.getContractFactory(
    "AuctionRebalanceModule"
  );

  const Controller = await ethers.getContractFactory("Controller");
  const deployedController = await Controller.attach(ControllerAddress);

  const controllerAddModule = await deployedController.addModule(
    newAuctionRebalanceModuleAddress
  );
  await controllerAddModule.wait();

  const SetToken = await ethers.getContractFactory("SetToken");
  const deployedSetToken = await SetToken.attach(SetTokenAddress);

  let isLock = await deployedSetToken.isLocked();
  if (isLock) {
    console.log("unlock...");
    const oldDeployedAuctionRebalanceModule =
      await AuctionRebalanceModule.attach(oldAuctionRebalanceModuleAddress);
    let unlock =
      await oldDeployedAuctionRebalanceModule.unlock(SetTokenAddress);
    await unlock.wait();
  }
  let removeModule = await deployedSetToken.removeModule(
    oldAuctionRebalanceModuleAddress
  );
  console.log("removeModule...");
  await removeModule.wait();

  let addModule = await deployedSetToken.addModule(
    newAuctionRebalanceModuleAddress
  );
  console.log("addModule...");
  await addModule.wait();
  const newDeployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(
    newAuctionRebalanceModuleAddress
  );

  let initModule =
    await newDeployedAuctionRebalanceModule.initialize(SetTokenAddress);
  console.log("initialize...");
  await initModule.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
