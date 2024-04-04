import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CONTROLLER: string = "0xc8548A0F72a6Baa5A7BCa998a10AB3b22e121F8f";

const AuctionRebalanceModule = buildModule("AuctionRebalanceModule", (m) => {
  const controllerContract = m.getParameter("controller", CONTROLLER);

  const auctionRebalanceModule = m.contract("AuctionRebalanceModule", [controllerContract]);

  return { auctionRebalanceModule };
});

export default AuctionRebalanceModule;