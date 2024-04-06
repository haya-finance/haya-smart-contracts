import { ethers } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";

    const AuctionRebalanceModuleAddress = "0x7Ee4857161b273390fED3B6a52577b7f0D6f8a97";
    
    const AuctionRebalanceModule = await ethers.getContractFactory("AuctionRebalanceModule");
    const deployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(AuctionRebalanceModuleAddress);

    let lock = await deployedAuctionRebalanceModule.lock(SetTokenAddress);

    await lock.wait();

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });