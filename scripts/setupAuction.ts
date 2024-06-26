import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();

  const USDTAddress = "";
  const BTCAddress = "";
  const ETHAddress = "";

  const SetTokenAddress = "";

  const AuctionRebalanceModuleAddress = "";

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
  if (!isLock) {
    console.log("lock...");
    let unlock = await deployedAuctionRebalanceModule.lock(SetTokenAddress);
    await unlock.wait();
  }
  const StandardTokenMock =
    await ethers.getContractFactory("StandardTokenMock");
  const deployedToken = await StandardTokenMock.attach(SetTokenAddress);
  let allowence = await deployedToken.allowance(
    owner.address,
    AuctionRebalanceModuleAddress
  );
  if (allowence == 0) {
    let approve = await deployedToken.approve(
      AuctionRebalanceModuleAddress,
      ethers.constants.MaxUint256
    );
    console.log("approve sets...");
    await approve.wait();
  }
  const rebalanceComponents = [USDTAddress];
  const relabalanceAmounts = [ethers.utils.parseUnits("100", 6)];
  let nowTime: number = Math.floor(Date.now() / 1000);
  let duration = 50;
  let targetAmountsSets = ethers.utils.parseUnits("-10", 18);
  let minBidVirtualAmount = ethers.utils.parseUnits("0.001", 18);
  let priceSpacing = ethers.utils.parseUnits("0.00000001", 18);
  let setupAuction = await deployedAuctionRebalanceModule.setupAuction(
    SetTokenAddress,
    rebalanceComponents,
    relabalanceAmounts,
    nowTime,
    duration,
    targetAmountsSets,
    minBidVirtualAmount,
    priceSpacing
  );
  await setupAuction.wait();
  const tick = 1000;
  const virtualAmount = ethers.utils.parseUnits("0.1", 18);
  lasestId = await deployedAuctionRebalanceModule.serialIds(SetTokenAddress);
  let payInfo =
    await deployedAuctionRebalanceModule.getRequiredOrRewardsSetsAmountsOnTickForBid(
      SetTokenAddress,
      lasestId,
      tick,
      virtualAmount
    );
  console.log(payInfo);
  console.log("serialld", lasestId);

  console.log("bidding...");
  let bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    0,
    ethers.utils.parseUnits("0.1", 18)
  );
  // await bid.wait();
  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    3,
    ethers.utils.parseUnits("0.2", 18)
  );
  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    3,
    ethers.utils.parseUnits("0.2", 18)
  );

  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    9,
    ethers.utils.parseUnits("0.2", 18)
  );

  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    300,
    ethers.utils.parseUnits("0.2", 18)
  );

  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    1231,
    ethers.utils.parseUnits("0.2", 18)
  );

  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    2000,
    ethers.utils.parseUnits("0.2", 18)
  );

  bid = await deployedAuctionRebalanceModule.bid(
    SetTokenAddress,
    32767,
    ethers.utils.parseUnits("0.2", 18)
  );

  await new Promise((resolve) => setTimeout(resolve, 60000));
  let success =
    await deployedAuctionRebalanceModule.setAuctionResultSuccess(
      SetTokenAddress
    );
  success.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
