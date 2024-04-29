import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();

  const UniswapSepoliaRouterContract =
    "0x19FC234A7DE9146f30Ef1dCB1B48b035A99B634d";

  const tokenAAddress = "0x2F4904dfb5493850077155Dd8aD6b551e28A50B1";
  const tokenBAddress = "0xaA0da0C413f93579aEbE86d59c733492aaf7096e";
  const StandardTokenMock =
    await ethers.getContractFactory("StandardTokenMock");
  const tokenA = await StandardTokenMock.attach(tokenAAddress);
  const tokenB = await StandardTokenMock.attach(tokenBAddress);
  const UniswapV2Router02 =
    await ethers.getContractFactory("UniswapV2Router02");
  const router = await UniswapV2Router02.attach(UniswapSepoliaRouterContract);
  let aApprove = await tokenA.approve(
    UniswapSepoliaRouterContract,
    ethers.constants.MaxUint256
  );
  await aApprove.wait();
  let bApprove = await tokenB.approve(
    UniswapSepoliaRouterContract,
    ethers.constants.MaxUint256
  );
  await bApprove.wait();
  console.log(await tokenA.balanceOf(owner.address));
  console.log(await tokenB.balanceOf(owner.address));

  await router.addLiquidity(
    tokenAAddress,
    tokenBAddress,
    ethers.utils.parseUnits("1", 9),
    ethers.utils.parseUnits("1", 9),
    ethers.utils.parseUnits("0", 9),
    ethers.utils.parseUnits("0", 9),
    owner.address,
    9999999999999
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
