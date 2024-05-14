import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "";

const AuctionRebalanceModule = buildModule("AuctionRebalanceModule", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);

  const auctionRebalanceModule = m.contract("AuctionRebalanceModule", [
    controllerContract,
  ]);

  return { auctionRebalanceModule };
});

export default AuctionRebalanceModule;
