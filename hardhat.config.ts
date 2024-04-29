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
  timeout: process.env.INTEGRATIONTEST ? INTEGRATIONTEST_TIMEOUT : 500000,
} as Mocha.MochaOptions;

const gasOption = {
  gas: 12000000,
  blockGasLimit: 30000000,
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.4.22",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.5.16",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.6.6",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.6.10",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
  },
  networks: {
    hardhat: {
      forking: process.env.FORK ? forkingConfig : undefined,
      accounts: getHardhatPrivateKeys(),
      // @ts-ignore
      timeout: INTEGRATIONTEST_TIMEOUT,
      initialBaseFeePerGas: 0,
      ...gasOption,
    },
    sepolia: {
      url: "https://arbitrum-sepolia.infura.io/v3/" + process.env.INFURA_TOKEN,
      // @ts-ignore
      accounts: process.env.SEPOLIA_DEPLOY_PRIVATE_KEY
        ? [`0x${process.env.SEPOLIA_DEPLOY_PRIVATE_KEY}`]
        : undefined,
    },
    production: {
      url: "https://arbitrum-mainnet.infura.io/v3/" + process.env.INFURA_TOKEN,
      // @ts-ignore
      accounts: process.env.PRODUCTION_MAINNET_DEPLOY_PRIVATE_KEY
        ? [`0x${process.env.PRODUCTION_MAINNET_DEPLOY_PRIVATE_KEY}`]
        : undefined,
    },
  },
  etherscan: {
    apiKey: {
      // @ts-ignore
      sepolia: process.env.ARBITRUM_ETHERSCAN_TOKEN,
      // @ts-ignore
      production: process.env.ARBITRUM_ETHERSCAN_TOKEN,
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "production",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
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
