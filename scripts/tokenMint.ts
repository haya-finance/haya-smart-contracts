import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();

  const tokensAddress = ["", "", "", "", "", "", "", "", "", ""];

  for (let tokenAddress of tokensAddress) {
    const StandardTokenMock =
      await ethers.getContractFactory("StandardTokenMock");
    const deployedToken = await StandardTokenMock.attach(tokenAddress);
    let mint = await deployedToken.mint();
    // await mint.wait();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
