import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();

  const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";

  const AuctionRebalanceModuleAddress =
    "0x86afdaCE7d815D6E2764B4c335D1994D4346e6B8";

  const AuctionRebalanceModule = await ethers.getContractFactory(
    "AuctionRebalanceModule"
  );
  const deployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(
    AuctionRebalanceModuleAddress
  );

  let lasestId =
    await deployedAuctionRebalanceModule.serialIds(SetTokenAddress);
  const info = await deployedAuctionRebalanceModule.rebalanceInfos(
    SetTokenAddress,
    lasestId
  );
  if (info.status == 1) {
    const setFailed =
      await deployedAuctionRebalanceModule.setAuctionResultFailed(
        SetTokenAddress
      );
    console.log("cancel latest auction..");
    await setFailed.wait();
  }

  const SetToken = await ethers.getContractFactory("SetToken");
  const deployedSetToken = await SetToken.attach(SetTokenAddress);

  let isLock = await deployedSetToken.isLocked();
  if (isLock) {
    console.log("unlock...");
    let unlock = await deployedAuctionRebalanceModule.unlock(SetTokenAddress);
    await unlock.wait();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
