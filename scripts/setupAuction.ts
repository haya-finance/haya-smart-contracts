import { ethers, run } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();

    const USDTAddress = "0xf8E496C378B80956e0016a72c19c27D01F7e3D5f";
    const BTCAddress = "0x4230063186699F6BBc2FAdE9716e27815c8346eC";
    const ETHAddress = "0x8b5F184973b34F9D57A9706E31aE66d67824139B";


    const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";

    const AuctionRebalanceModuleAddress = "0x7Ee4857161b273390fED3B6a52577b7f0D6f8a97";
    
    const AuctionRebalanceModule = await ethers.getContractFactory("AuctionRebalanceModule");
    const deployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(AuctionRebalanceModuleAddress);

    const rebalanceComponents = [
        USDTAddress,
        BTCAddress
    ];
    const relabalanceAmounts = [
        ethers.utils.parseUnits("600000", 6),
        ethers.utils.parseUnits("-10", 6),
    ];
    let nowTime :number = Math.floor(Date.now() / 1000);
    let duration = 600;
    let targetAmountsSets = ethers.utils.parseUnits("-100", 18);
    let minBidSetsAmount = ethers.utils.parseUnits("-1", 18);
    let priceSpacing = ethers.utils.parseUnits("0.1", 18);
    let setupRebalance = await deployedAuctionRebalanceModule.setupRebalance(
        SetTokenAddress,
        rebalanceComponents,
        relabalanceAmounts,
        nowTime,
        duration,
        targetAmountsSets,
        minBidSetsAmount,
        priceSpacing
        );
    await setupRebalance.wait();

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });