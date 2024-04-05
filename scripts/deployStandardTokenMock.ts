import { ethers, run } from "hardhat";
async function main() {
    
    const [owner] = await ethers.getSigners();
    interface Dictionary {
        [key: string]: any;
      }
    const tokensMap: Dictionary = {
        "USDT": [owner.address, ethers.utils.parseUnits("100000000", 6), "USDT-Haya", "USDT-H", 6],
        "USDC": [owner.address, ethers.utils.parseUnits("100000000", 6), "USDC-Haya", "USDC-H", 6],
        "ETH": [owner.address, ethers.utils.parseEther("100000000"), "WETH-Haya", "WETH-H", 18],
        "BTC": [owner.address, ethers.utils.parseEther("100000000"), "WBTC-Haya", "WBTC-H", 18],
        "BNB": [owner.address, ethers.utils.parseEther("100000000"), "WBNB-Haya", "WBNB-H", 18],
        "SOL": [owner.address, ethers.utils.parseEther("100000000"), "SOL-Haya", "SOL-H", 18],
        "DOGE": [owner.address, ethers.utils.parseEther("100000000"), "DOGE-Haya", "DOGE-H", 18],
        "ADA": [owner.address, ethers.utils.parseEther("100000000"), "ADA-Haya", "ADA-H", 18],
        "AVAX": [owner.address, ethers.utils.parseEther("100000000"), "AVAX-Haya", "AVAX-H", 18],
        "LTC": [owner.address, ethers.utils.parseEther("100000000"), "LTC-Haya", "LTC-H", 18],
    };
    const keys = Object.keys(tokensMap);
    for (let key of keys) {
        const StandardTokenMock = await ethers.getContractFactory("StandardTokenMock");
        const token = await StandardTokenMock.deploy(...tokensMap[key]);
        console.log("Wait deployed...");
        await token.deployed();
        console.log(key,"depoyed to:", token.address);
        await new Promise(resolve => setTimeout(resolve, 20000));
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