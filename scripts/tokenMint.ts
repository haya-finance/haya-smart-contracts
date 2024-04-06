import { ethers } from "hardhat";
async function main() {
    const [owner] = await ethers.getSigners();

    const tokensAddress = [
        "0xf8E496C378B80956e0016a72c19c27D01F7e3D5f",
        "0x7657854cb2A4b69def2b16c16F8f31CDa1D1691e",
        "0x8b5F184973b34F9D57A9706E31aE66d67824139B",
        "0x4230063186699F6BBc2FAdE9716e27815c8346eC",
        "0xfb4e9F0Fd0573a977a8791dc45cddc75840b9AAd",
        "0xdF73AA299824c6CfDF2b33304Ba7FDF2d6582092",
        "0x5d13094a5F52b6B926921a7eDE14d22148dE1843",
        "0x4B60B7312822BD2C54464c0d7860a6e68De6DB7b",
        "0x41587980cB06e82E1BcD35F22d185322cf137B9a",
        "0xD458e00e5ad8264aBa545dDfAB58409e8D4AB8e4",
    ];

    for (let tokenAddress of tokensAddress) {
        const StandardTokenMock = await ethers.getContractFactory("StandardTokenMock");
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