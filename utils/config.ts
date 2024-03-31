/*
 * @Author: Dev FullStackBuilds@gmail.com
 * @Date: 2024-03-31 11:12:29
 * @LastEditors: Dev FullStackBuilds@gmail.com
 * @LastEditTime: 2024-03-31 11:12:34
 * @FilePath: /haya-smart-contracts/utils/config.ts
 * @Description: 
 * 
 * Copyright (c) 2024 by Haya, All Rights Reserved. 
 */

  export const mainnetForkingConfig = {
    url: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_TOKEN,
    blockNumber: process.env.LATESTBLOCK ? undefined : 17895372,
  };
  
  export const forkingConfig = mainnetForkingConfig;
  
  