import { ethers } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();

  const SetTokenCreatorAddress = "";

  const BasicIssuanceModuleAddress = "";

  const AuctionRebalanceModuleAddress = "";

  const BTC = ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", 8, "1"];
  const ETH = ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 18, "1"];
  const LINK = ["0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", 18, "1"];
  const UNI = ["0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", 18, "1"];
  const ARB = ["0x912CE59144191C1204E64559FE8253a0e49E6548", 18, "1"];
  const BNB = ["0x7AF00405916D823eDb1121546EfA6F4972B51b84", 18, "1"];
  const SOL = ["0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07", 9, "1"];
  const AVAX = ["0x565609fAF65B92F7be02468acF86f8979423e514", 18, "1"];
  const MATIC = ["0x3ab0E28C3F56616aD7061b4db38aE337E3809AEA", 18, "1"];
  const APT = ["0x4EdeF400eDe5309240814b5FC403F224504604e9", 8, "1"];
  const TON = ["0x425AC12bb19070901C0CDE873Fc5299cbD7f23D4", 9, "1"];
  const NEAR = ["0x795818DAE0D32E2cf0B1C56ac73B9f5d80D2176c", 24, "1"];
  const SHIB = ["0x5033833c9fe8B9d3E09EEd2f73d2aaF7E3872fd1", 18, "1"];
  const RNDR = ["0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279", 18, "1"];
  const DOGE = ["0xd99528Df88172a68E9caCD7Cd4c2712Eb80Dab1E", 8, "1"];
  const ADA = ["0x5A01d64Ee1d9E350DC0Fa2443872bc814d2b14B8", 18, "1"];
  const TRX = ["0x29A1DBE8c32C0ceB1eB92722afb9B231b6F6fdDA", 6, "1"];
  const DOT = ["0x8DC6E5Bfdb369Ea61Aa00666d8a0cB922716A819", 18, "1"];
  const LTC = ["0x9586De8f0F7384CBC12b0ffd3B0d4c12C12871C4", 18, "1"];
  const FIL = ["0xd7F78263CF1A40ab5710725974B7eD6d6A99f4c5", 18, "1"];
  const SetTokenCreator = await ethers.getContractFactory("SetTokenCreator");
  const deployedSetTokenCreator = await SetTokenCreator.attach(
    SetTokenCreatorAddress
  );

  let init = await deployedSetTokenCreator.create(
    [
      BTC[0],
      ETH[0],
      LINK[0],
      UNI[0],
      ARB[0],
      BNB[0],
      SOL[0],
      AVAX[0],
      MATIC[0],
      APT[0],
      TON[0],
      NEAR[0],
      SHIB[0],
      RNDR[0],
      DOGE[0],
      ADA[0],
      TRX[0],
      DOT[0],
      LTC[0],
      FIL[0],
    ],
    [
      ethers.utils.parseUnits(BTC[2] as string, BTC[1]),
      ethers.utils.parseUnits(ETH[2] as string, ETH[1]),
      ethers.utils.parseUnits(LINK[2] as string, LINK[1]),
      ethers.utils.parseUnits(UNI[2] as string, UNI[1]),
      ethers.utils.parseUnits(ARB[2] as string, ARB[1]),
      ethers.utils.parseUnits(BNB[2] as string, BNB[1]),
      ethers.utils.parseUnits(SOL[2] as string, SOL[1]),
      ethers.utils.parseUnits(AVAX[2] as string, AVAX[1]),
      ethers.utils.parseUnits(MATIC[2] as string, MATIC[1]),
      ethers.utils.parseUnits(APT[2] as string, APT[1]),
      ethers.utils.parseUnits(TON[2] as string, TON[1]),
      ethers.utils.parseUnits(NEAR[2] as string, NEAR[1]),
      ethers.utils.parseUnits(SHIB[2] as string, SHIB[1]),
      ethers.utils.parseUnits(RNDR[2] as string, RNDR[1]),
      ethers.utils.parseUnits(DOGE[2] as string, DOGE[1]),
      ethers.utils.parseUnits(ADA[2] as string, ADA[1]),
      ethers.utils.parseUnits(TRX[2] as string, TRX[1]),
      ethers.utils.parseUnits(DOT[2] as string, DOT[1]),
      ethers.utils.parseUnits(LTC[2] as string, LTC[1]),
      ethers.utils.parseUnits(FIL[2] as string, FIL[1]),
    ],
    [BasicIssuanceModuleAddress, AuctionRebalanceModuleAddress],
    owner.address,
    "H20",
    "H20"
  );
  await init.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
