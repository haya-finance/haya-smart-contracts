import { ethers, run } from "hardhat";
async function main() {
  const [owner] = await ethers.getSigners();
  interface Dictionary {
    [key: string]: any;
  }
  const tokensMap: Dictionary = {
    BTC: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"],
    ETH: ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
    BNB: ["0x7AF00405916D823eDb1121546EfA6F4972B51b84"],
    SOL: ["0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07"],
    DOGE: ["0xd99528Df88172a68E9caCD7Cd4c2712Eb80Dab1E"],

    TON: ["0x425AC12bb19070901C0CDE873Fc5299cbD7f23D4"],
    ADA: ["0x5A01d64Ee1d9E350DC0Fa2443872bc814d2b14B8"],
    SHIB: ["0x5033833c9fe8B9d3E09EEd2f73d2aaF7E3872fd1"],
    AVAX: ["0x565609fAF65B92F7be02468acF86f8979423e514"],
    TRX: ["0x29A1DBE8c32C0ceB1eB92722afb9B231b6F6fdDA"],

    DOT: ["0x8DC6E5Bfdb369Ea61Aa00666d8a0cB922716A819"],
    LINK: ["0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"],
    NEAR: ["0x795818DAE0D32E2cf0B1C56ac73B9f5d80D2176c"],
    MATIC: ["0x3ab0E28C3F56616aD7061b4db38aE337E3809AEA"],
    RNDR: ["0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279"],

    LTC: ["0x9586De8f0F7384CBC12b0ffd3B0d4c12C12871C4"],
    UNI: ["0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0"],
    APT: ["0x4EdeF400eDe5309240814b5FC403F224504604e9"],
    FIL: ["0xd7F78263CF1A40ab5710725974B7eD6d6A99f4c5"],
    ARB: ["0x912CE59144191C1204E64559FE8253a0e49E6548"],
  };
  const keys = Object.keys(tokensMap);
  for (let key of keys) {
    const StandardTokenMock =
      await ethers.getContractFactory("StandardTokenMock");

    const token = await StandardTokenMock.attach(tokensMap[key][0]);
    const decimals = await token.decimals();
    console.log(key, "decimals:", decimals.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
