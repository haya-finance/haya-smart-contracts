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
  const Controller = await ethers.getContractFactory("Controller");
  const controller = await Controller.deploy(owner.address);
  await controller.deployed();
  console.log("Controller deployed to", controller.address);
  
  await new Promise(resolve => setTimeout(resolve, 20000));
  await run("verify:verify", {
    address: controller.address,
    constructorArguments: [owner.address],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });