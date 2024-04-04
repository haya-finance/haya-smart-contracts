/*
 * @Author: Dev FullStackBuilds@gmail.com
 * @Date: 2024-03-31 11:21:00
 * @LastEditors: Dev FullStackBuilds@gmail.com
 * @Description: 
 * 
 * Copyright (c) 2024 by Haya, All Rights Reserved. 
 */

import { ethers, run } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  const controllerContract = "0xc8548A0F72a6Baa5A7BCa998a10AB3b22e121F8f";
  const AuctionModule = await ethers.getContractFactory("AuctionRebalanceModule");
  const auctionModule = await AuctionModule.deploy(controllerContract);
  await auctionModule.deployed();
  console.log("AuctionModule deployed to", auctionModule.address);
  await new Promise(resolve => setTimeout(resolve, 40000));
  await run("verify:verify", {
    address: auctionModule.address,
    constructorArguments: [controllerContract],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });