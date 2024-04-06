import { ethers } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();
    const SetTokenAddress = "0x8E6795eA1242486CF498DD587F4933005586142B";

    const BasicIssuanceModuleAddress = "0xAaE7c1CC8450B98ba15FB2a18686f7890812dDa3";
    
    const BasicIssuanceModule = await ethers.getContractFactory("BasicIssuanceModule");
    const deployedBasicIssuanceModule = await BasicIssuanceModule.attach(BasicIssuanceModuleAddress);

    let redeem = await deployedBasicIssuanceModule.redeem(SetTokenAddress, ethers.utils.parseUnits("1", 18), owner.address);
    await redeem.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });