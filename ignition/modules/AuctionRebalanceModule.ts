import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xd5c077Efe284b060c68c4Fdf9888d4734DDe74E0";

const AuctionRebalanceModule = buildModule("AuctionRebalanceModule", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);

  const auctionRebalanceModule = m.contract("AuctionRebalanceModule", [
    controllerContract,
  ]);

  return { auctionRebalanceModule };
});

export default AuctionRebalanceModule;
