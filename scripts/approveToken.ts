import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();

  const tokensAddress = ["", "", "", "", "", "", "", "", "", ""];

  const targetAddress = "";

  for (let tokenAddress of tokensAddress) {
    const StandardTokenMock =
      await ethers.getContractFactory("StandardTokenMock");
    const deployedToken = await StandardTokenMock.attach(tokenAddress);
    let approve = await deployedToken.approve(
      targetAddress,
      ethers.constants.MaxUint256
    );
    // await approve.wait();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
