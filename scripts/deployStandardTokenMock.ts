import { ethers, run } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  interface Dictionary {
    [key: string]: any;
  }
  const tokensMap: Dictionary = {
    BTC: ["WBTC-Haya", "WBTC-H", 8],
    ETH: ["WETH-Haya", "WETH-H", 18],
    BNB: ["WBNB-Haya", "WBNB-H", 18],
    SOL: ["SOL-Haya", "SOL-H", 18],
    DOGE: ["DOGE-Haya", "DOGE-H", 18],

    TON: ["TON-Haya", "TON-H", 18],
    ADA: ["ADA-Haya", "ADA-H", 18],
    SHIB: ["SHIB-Haya", "SHIB-H", 18],
    AVAX: ["AVAX-Haya", "AVAX-H", 18],
    TRX: ["TRX-Haya", "TRX-H", 18],

    DOT: ["DOT-Haya", "DOT-H", 18],
    LINK: ["LINK-Haya", "LINK-H", 18],
    NEAR: ["NEAR-Haya", "NEAR-H", 18],
    MATIC: ["MATIC-Haya", "MATIC-H", 18],
    ICP: ["ICP-Haya", "ICP-H", 18],

    LTC: ["LTC-Haya", "LTC-H", 18],
    UNI: ["UNI-Haya", "UNI-H", 18],
    APT: ["APT-Haya", "APT-H", 18],
    FIL: ["FIL-Haya", "FIL-H", 18],
    ATOM: ["ATOM-Haya", "ATOM-H", 18],
  };
  const keys = Object.keys(tokensMap);
  for (let key of keys) {
    const StandardTokenMock =
      await ethers.getContractFactory("StandardTokenMock");
    const token = await StandardTokenMock.deploy(...tokensMap[key]);
    console.log("Wait deployed...");
    await token.deployed();
    console.log(key, "depoyed to:", token.address);
    await new Promise((resolve) => setTimeout(resolve, 20000));
    await run("verify:verify", {
      address: token.address,
      constructorArguments: tokensMap[key],
    });
    console.log("All Finished.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
