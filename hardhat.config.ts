/*
 * @Author: Dev FullStackBuilds@gmail.com
 * @Date: 2024-03-31 10:58:01
 * @LastEditors: Dev FullStackBuilds@gmail.com
 * @LastEditTime: 2024-03-31 15:10:17
 * @FilePath: /haya-smart-contracts/hardhat.config.ts
 * @Description:
 *
 * Copyright (c) 2024 by Haya, All Rights Reserved.
 */
require("dotenv").config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import { forkingConfig } from "./utils/config";
import { privateKeys } from "./utils/wallets";
import "@nomiclabs/hardhat-waffle";
import "@nomicfoundation/hardhat-verify";

const INTEGRATIONTEST_TIMEOUT = 600000;

const mochaConfig = {
  timeout: process.env.INTEGRATIONTEST ? INTEGRATIONTEST_TIMEOUT : 50000,
} as Mocha.MochaOptions;

const gasOption = {
  gas: 12000000,
  blockGasLimit: 30000000,
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.10",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
  },
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/" + process.env.INFURA_TOKEN,
      // @ts-ignore
      accounts: process.env.SEPOLIA_DEPLOY_PRIVATE_KEY
        ? [`0x${process.env.SEPOLIA_DEPLOY_PRIVATE_KEY}`]
        : undefined,
    },
    production: {
      url: "https://mainnet.infura.io/v3/" + process.env.INFURA_TOKEN,
      // @ts-ignore
      accounts: process.env.PRODUCTION_MAINNET_DEPLOY_PRIVATE_KEY
        ? [`0x${process.env.PRODUCTION_MAINNET_DEPLOY_PRIVATE_KEY}`]
        : undefined,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_TOKEN,
  },
  sourcify: {
    enabled: true,
    // Optional: specify a different Sourcify server
    apiUrl: "https://sourcify.dev/server",
    // Optional: specify a different Sourcify repository
    browserUrl: "https://repo.sourcify.dev",
  },
  mocha: mochaConfig,
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

function getHardhatPrivateKeys() {
  return privateKeys.map((key) => {
    const TEN_MILLION_ETH = "10000000000000000000000000";
    return {
      privateKey: key,
      balance: TEN_MILLION_ETH,
    };
  });
}

export default config;
