import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const SetTokenAddress = "";

  const BasicIssuanceModuleAddress = "";

  const BasicIssuanceModule = await ethers.getContractFactory(
    "BasicIssuanceModule"
  );
  const deployedBasicIssuanceModule = await BasicIssuanceModule.attach(
    BasicIssuanceModuleAddress
  );

  let redeem = await deployedBasicIssuanceModule.redeem(
    SetTokenAddress,
    ethers.utils.parseUnits("1", 18),
    owner.address
  );
  await redeem.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
