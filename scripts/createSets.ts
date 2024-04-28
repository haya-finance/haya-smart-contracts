import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const SetTokenCreatorAddress = "";

  const BasicIssuanceModuleAddress = "";

  const AuctionRebalanceModuleAddress = "";

  const INTEGRATION_REGISTRY_RESOURCE_ID = 0;
  const PRICE_ORACLE_RESOURCE_ID = 1;
  const SET_VALUER_RESOURCE_ID = 2;

  const USDTAddress = "";
  const BTCAddress = "";
  const ETHAddress = "";

  const SetTokenCreator = await ethers.getContractFactory("SetTokenCreator");
  const deployedSetTokenCreator = await SetTokenCreator.attach(
    SetTokenCreatorAddress
  );

  let init = await deployedSetTokenCreator.create(
    [BTCAddress, ETHAddress, USDTAddress],
    [
      ethers.utils.parseUnits("1", 18),
      ethers.utils.parseUnits("10", 18),
      ethers.utils.parseUnits("2000", 6),
    ],
    [BasicIssuanceModuleAddress, AuctionRebalanceModuleAddress],
    owner.address,
    "H3-B",
    "H3"
  );
  await init.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
