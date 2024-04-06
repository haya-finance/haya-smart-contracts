import { ethers } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const SetTokenCreatorAddress = "0xC427b85123271A24c495f5D5cCF7fd2a018365B2";

    const BasicIssuanceModuleAddress = "0xAaE7c1CC8450B98ba15FB2a18686f7890812dDa3";
    
    const AuctionRebalanceModuleAddress = "0x7Ee4857161b273390fED3B6a52577b7f0D6f8a97";
    
    const INTEGRATION_REGISTRY_RESOURCE_ID = 0;
    const PRICE_ORACLE_RESOURCE_ID = 1;
    const SET_VALUER_RESOURCE_ID = 2;

    const USDTAddress = "0xf8E496C378B80956e0016a72c19c27D01F7e3D5f";
    const BTCAddress = "0x4230063186699F6BBc2FAdE9716e27815c8346eC";
    const ETHAddress = "0x8b5F184973b34F9D57A9706E31aE66d67824139B";

    const SetTokenCreator = await ethers.getContractFactory("SetTokenCreator");
    const deployedSetTokenCreator = await SetTokenCreator.attach(SetTokenCreatorAddress);

    let init = await deployedSetTokenCreator.create([BTCAddress, ETHAddress, USDTAddress],[ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("10", 18),ethers.utils.parseUnits("2000", 6) ],[BasicIssuanceModuleAddress, AuctionRebalanceModuleAddress], owner.address, "H3-B", "H3");
    await init.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });