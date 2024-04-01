/*
 * @Author: Dev FullStackBuilds@gmail.com
 * @Date: 2024-03-31 11:21:00
 * @LastEditors: Dev FullStackBuilds@gmail.com
 * @LastEditTime: 2024-04-01 17:32:14
 * @FilePath: /haya-smart-contracts/scripts/deployBidModule.ts
 * @Description: 
 * 
 * Copyright (c) 2024 by Haya, All Rights Reserved. 
 */


import { ethers, run } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  // const Controller = await ethers.getContractFactory("Controller");
  // const controller = await Controller.deploy(owner.address);
  // await controller.deployed();
  // console.log("Controller deployed to", controller.address);
  // await run("verify:verify", {
  //   address: controller.address,
  //   constructorArguments: [owner.address],
  // });

  // const BasicIssuanceModule = await ethers.getContractFactory("BasicIssuanceModule");
  // const basicIssuanceModule = await BasicIssuanceModule.deploy(controller.address);
  // await basicIssuanceModule.deployed();
  // console.log("BasicIssuanceModule deployed to", basicIssuanceModule.address);

  const AuctionModule = await ethers.getContractFactory("AuctionRebalanceIssuanceModule");
  const auctionModule = await AuctionModule.deploy("0xc0b4a682cb13b0f1924dccb5651736f9fffcdd04");
  await auctionModule.deployed();
  console.log("auctionModule deployed to", auctionModule.address);

  await run("verify:verify", {
    address: auctionModule.address,
    constructorArguments: ["0xc0b4a682cb13b0f1924dccb5651736f9fffcdd04"],
  });



}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });