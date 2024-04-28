import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const SetTokenAddress = "";

  const BasicIssuanceModuleAddress = "";

  const AuctionRebalanceModuleAddress = "";

  const BasicIssuanceModule = await ethers.getContractFactory(
    "BasicIssuanceModule"
  );
  const deployedBasicIssuanceModule = await BasicIssuanceModule.attach(
    BasicIssuanceModuleAddress
  );

  const AuctionRebalanceModule = await ethers.getContractFactory(
    "AuctionRebalanceModule"
  );
  const deployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(
    AuctionRebalanceModuleAddress
  );

  let initBasic = await deployedBasicIssuanceModule.initialize(
    SetTokenAddress,
    "0x0000000000000000000000000000000000000000"
  );
  await initBasic.wait();

  let initAuction =
    await deployedAuctionRebalanceModule.initialize(SetTokenAddress);
  await initAuction.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
