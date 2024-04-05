import { ethers, run } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";

    const BasicIssuanceModuleAddress = "0xAaE7c1CC8450B98ba15FB2a18686f7890812dDa3";
    
    const AuctionRebalanceModuleAddress = "0x7Ee4857161b273390fED3B6a52577b7f0D6f8a97";
    
    const BasicIssuanceModule = await ethers.getContractFactory("BasicIssuanceModule");
    const deployedBasicIssuanceModule = await BasicIssuanceModule.attach(BasicIssuanceModuleAddress);

    const AuctionRebalanceModule = await ethers.getContractFactory("AuctionRebalanceModule");
    const deployedAuctionRebalanceModule = await AuctionRebalanceModule.attach(AuctionRebalanceModuleAddress);


    let initBasic = await deployedBasicIssuanceModule.initialize(SetTokenAddress,"0x0000000000000000000000000000000000000000");
    await initBasic.wait();

    let initAuction = await deployedAuctionRebalanceModule.initialize(SetTokenAddress);
    await initAuction.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });