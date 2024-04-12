import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseGwei } from "viem";
import { btc, eth, usdc } from "../utils/index";
import { ADDRESS_ZERO, MAX_UINT_256 } from "../utils/constants";
describe("AuctionRebalanceModule", function () {
  const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60;
  describe("Deployment", function () {
    it("Should added AuctionModule", async function () {
      const { owner, controller, auctionRebalanceModule } = await loadFixture(
        deployAuctionRebalanceModuleFixture
      );
      expect(
        await controller.read.isSystemContract([auctionRebalanceModule.address])
      ).to.equal(true);
    });
  });
  describe("AuctionBalanceModule setup balance test", function () {
    it("Test setup only by manager", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.setupAuction([
          setToken.address,
          [btcToken.address],
          [btc(100).toBigInt()],
          BigInt(await time.latest()),
          BigInt(ONE_WEEK_IN_SECS),
          eth(1).toBigInt(),
          eth(0.01).toBigInt(),
          eth(0.0001).toBigInt(),
        ])
      ).to.be.rejectedWith("Must be the SetToken manager");
    });
    it("Test setup issue should be locked", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt(await time.latest()),
            BigInt(ONE_WEEK_IN_SECS),
            eth(1).toBigInt(),
            eth(0.01).toBigInt(),
            eth(0.0001).toBigInt(),
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith("Sets should be locked");
    });
    it("Test only manager can lock", async function () {
      const { owner, manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.lock([setToken.address], {
          account: owner.account,
        })
      ).to.be.rejectedWith("Must be the SetToken manager");
    });
    it("Test lastest bid not finished", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await auctionRebalanceModule.write.lock([setToken.address], {
        account: manager.account,
      });
      await auctionRebalanceModule.write.setupAuction(
        [
          setToken.address,
          [btcToken.address],
          [btc(100).toBigInt()],
          BigInt(await time.latest()),
          BigInt(ONE_WEEK_IN_SECS),
          eth(1).toBigInt(),
          eth(0.01).toBigInt(),
          eth(0.0001).toBigInt(),
        ],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt(await time.latest()),
            BigInt(ONE_WEEK_IN_SECS),
            eth(1).toBigInt(),
            eth(0.01).toBigInt(),
            eth(0.0001).toBigInt(),
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith("Latest bid is progressing");
    });
  });
  describe("AuctionBalanceModule bid test", function () {
    it("Test bid time", async function () {
      const {
        user1,
        startTime,
        ethToken,
        endTime,
        setToken,
        auctionRebalanceModule,
      } = await loadFixture(deploySetupedAuctionFixture);
      await ethToken.write.mintWithAmount([eth(1000).toBigInt()], {
        account: user1.account,
      });
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Not bidding time");
      await time.increaseTo(startTime);
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.fulfilled;
      await time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Not bidding time");
    });
    it("Test virtual amount or tick not meet the requirements", async function () {
      const { user1, startTime, setToken, auctionRebalanceModule } =
        await loadFixture(deploySetupedAuctionFixture);
      await time.increaseTo(startTime);
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.0001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Virtual quantity not meeting the requirements");
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, -1, eth(0.001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Tick need be bigger than 0");
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 32768, eth(0.001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Tick too big");
    });

    it("Test bid amount person tick record, total tick record, bitmap, max tick", async function () {
      // Confirm that the bitmap will not come and will be reversed
      // test auction btc 100 eth -1000
      const {
        publicClient,
        user1,
        startTime,
        ethToken,
        setToken,
        auctionRebalanceModule,
      } = await loadFixture(deploySetupedAuctionFixture);
      await time.increaseTo(startTime);
      const ethBalance = await ethToken.read.balanceOf([user1.account.address]);
      const beforeSetsBalance = await setToken.read.balanceOf([
        user1.account.address,
      ]);

      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const auctionInfo = await auctionRebalanceModule.read.rebalanceInfos([
        setToken.address,
        lastestId,
      ]);
      let maxTick = await auctionRebalanceModule.read._maxTicks([
        setToken.address,
        lastestId,
      ]);
      const basePrice = auctionInfo[5];
      const priceSpacing = auctionInfo[4];

      // need not pay sets but eth
      const tick = 1;
      const virtualAmount = eth(0.001).toBigInt();
      const price = BigInt(tick) * priceSpacing + basePrice;
      expect(
        await auctionRebalanceModule.read.getRequiredOrRewardsSetsAmountsOnTickForBid(
          [setToken.address, lastestId, tick, virtualAmount]
        )
      ).to.equal(localCaculateSetsAmount(price, virtualAmount));
      let components =
        await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
          [setToken.address, lastestId, virtualAmount]
        );

      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, tick, virtualAmount],
          { account: user1.account }
        )
      ).to.be.rejectedWith("ERC20: transfer amount exceeds balance");
      await ethToken.write.mintWithAmount([-components[1][1] + BigInt(1)], {
        account: user1.account,
      });
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, tick, virtualAmount],
          { account: user1.account }
        )
      ).to.be.fulfilled;
      expect(await ethToken.read.balanceOf([user1.account.address])).to.equal(
        BigInt(0)
      );
      let aferSetsAmount = beforeSetsBalance;
      if (localCaculateSetsAmount(price, virtualAmount) >= 0) {
        aferSetsAmount -= localCaculateSetsAmount(price, virtualAmount);
      }
      expect(await setToken.read.balanceOf([user1.account.address])).to.equal(
        aferSetsAmount
      );
      expect(
        await auctionRebalanceModule.read._maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(tick);
      const bitmap = await auctionRebalanceModule.read.tickBitmaps([
        setToken.address,
        lastestId,
        0,
      ]);
      // tick = 1, word = 0 |000000...000010|
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          0,
        ])
      ).to.be.equal(BigInt(2));

      // Check whether user number of bids on the tick is correct
      expect(
        await auctionRebalanceModule.read.getAccountTotalVirtualAmountOnTick([
          setToken.address,
          lastestId,
          user1.account.address,
          tick,
        ])
      ).to.be.equal(virtualAmount);
      // Check whether the total number of bids on the tick is correct
      expect(
        await auctionRebalanceModule.read.getTotalVirtualAmountsOnTick([
          setToken.address,
          lastestId,
          tick,
        ])
      ).to.be.equal(virtualAmount);

      // need pay sets and eth
      const tick2 = 30000;
      const price2 = BigInt(tick2) * priceSpacing + basePrice;

      expect(
        await auctionRebalanceModule.read.getRequiredOrRewardsSetsAmountsOnTickForBid(
          [setToken.address, lastestId, tick2, virtualAmount]
        )
      ).to.equal(localCaculateSetsAmount(price2, virtualAmount));

      components =
        await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
          [setToken.address, lastestId, virtualAmount]
        );
      await ethToken.write.mintWithAmount(
        [BigInt(2) * (-components[1][1] + BigInt(1))],
        {
          account: user1.account,
        }
      );
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, tick2, virtualAmount],
          { account: user1.account }
        )
      ).to.be.fulfilled;

      // tick = 30000, word = 117 |000000...1...000000|
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          117,
        ])
      ).to.be.equal(BigInt(281474976710656));

      expect(
        await auctionRebalanceModule.read._maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(tick2);

      // bid twice
      await auctionRebalanceModule.write.bid(
        [setToken.address, tick2, virtualAmount],
        { account: user1.account }
      );

      // test bid event
      const bidEvents = await auctionRebalanceModule.getEvents.Bid();
      expect(bidEvents).to.have.lengthOf(1);
      expect(bidEvents[0].args._setToken).to.be.equal(
        getAddress(setToken.address)
      );
      expect(bidEvents[0].args._account).to.be.equal(
        getAddress(user1.account.address)
      );
      expect(bidEvents[0].args._serialId).to.be.equal(BigInt(lastestId));
      expect(bidEvents[0].args._tick).to.be.equal(tick2);
      expect(bidEvents[0].args._virtualAmount).to.be.equal(virtualAmount);

      // tick = 30000, word = 117 |000000...1...000000|
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          117,
        ])
      ).to.be.equal(BigInt(281474976710656));

      if (localCaculateSetsAmount(price2, virtualAmount) >= 0) {
        aferSetsAmount -=
          BigInt(2) * localCaculateSetsAmount(price2, virtualAmount);
      }
      expect(await setToken.read.balanceOf([user1.account.address])).to.equal(
        aferSetsAmount
      );

      // Check whether user number of bids on the tick is correct
      expect(
        await auctionRebalanceModule.read.getAccountTotalVirtualAmountOnTick([
          setToken.address,
          lastestId,
          user1.account.address,
          tick2,
        ])
      ).to.be.equal(virtualAmount + virtualAmount);
      // Check whether the total number of bids on the tick is correct
      expect(
        await auctionRebalanceModule.read.getTotalVirtualAmountsOnTick([
          setToken.address,
          lastestId,
          tick2,
        ])
      ).to.be.equal(virtualAmount + virtualAmount);
    });
  });
  describe("AuctionBalanceModule cancel bid test", function () {
    it("Test claim time", async function () {
      const { user1, endTime, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 1], {
          account: user1.account,
        })
      ).to.be.fulfilled;
      time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 30000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Not bidding time");
    });
    it("Test auction be set result failed", async function () {
      const { user1, endTime, manager, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 30000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Bid's status must be progressing");
    });
    it("Test auction be set result success", async function () {
      const { user1, endTime, manager, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 30000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Bid's status must be progressing");
    });
    it("Test no bid to cancel", async function () {});
    it("Test cancel rollback amounts", async function () {});
    it("Test after rollback tickBitmap value, personal tick amounts, total tick amounts", async function () {});
    it("Test duplicate cancel", async function () {});
    it("Test cancel bid event", async function () {});
  });
  describe("AuctionBalanceModule set auction result test", function () {
    it("Test not manager set result", async function () {});
    it("Test not time and time to set failed", async function () {});
    it("Test not time and time to set success", async function () {});
    it("Test lastest bid finished or duplicate set", async function () {});
    it("Test win tick result", async function () {});
    it("Test tranfer components amounts, burn or mint sets, set token inflation coefficient", async function () {});
    it("Test set result event", async function () {});
  });
  describe("AuctionBalanceModule claim test", function () {
    it("Test not time to claim", async function () {});
    it("Test auction failed to claim", async function () {});
    it("Test not win the bid to claim", async function () {});
    it("Test win the bid to claim, on win tick, bigger than win tick, check amounts", async function () {});
    it("Test duplicate claim", async function () {});
    it("Test never bidded to claim", async function () {});
  });
  describe("AuctionBalanceModule remove module test", function () {
    it("Test latest bid not finished", async function () {});
    it("Test set token is still lock", async function () {});
    it("Test removed and still can claim", async function () {});
  });

  // bid on tick = 1, tick = 30000
  async function deployUser1BiddedAuctionFixture() {
    const {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
      user1,
      user2,
      startTime,
      endTime,
    } = await loadFixture(deploySetupedAuctionFixture);
    await time.increaseTo(startTime);
    const beforeSetsBalance = await setToken.read.balanceOf([
      user1.account.address,
    ]);
    const lastestId = await auctionRebalanceModule.read.serialIds([
      setToken.address,
    ]);
    const auctionInfo = await auctionRebalanceModule.read.rebalanceInfos([
      setToken.address,
      lastestId,
    ]);
    const basePrice = auctionInfo[5];
    const priceSpacing = auctionInfo[4];
    const tick = 1;
    const virtualAmount = eth(0.001).toBigInt();
    const price = BigInt(tick) * priceSpacing + basePrice;
    let components =
      await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
        [setToken.address, lastestId, virtualAmount]
      );

    await ethToken.write.mintWithAmount([-components[1][1] + BigInt(1)], {
      account: user1.account,
    });
    await auctionRebalanceModule.write.bid(
      [setToken.address, tick, virtualAmount],
      { account: user1.account }
    );
    // need pay sets and eth
    const tick2 = 30000;
    const price2 = BigInt(tick2) * priceSpacing + basePrice;
    components =
      await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
        [setToken.address, lastestId, virtualAmount]
      );
    await ethToken.write.mintWithAmount(
      [BigInt(2) * (-components[1][1] + BigInt(1))],
      {
        account: user1.account,
      }
    );
    await auctionRebalanceModule.write.bid(
      [setToken.address, tick2, virtualAmount],
      { account: user1.account }
    );
    await auctionRebalanceModule.write.bid(
      [setToken.address, tick2, virtualAmount],
      { account: user1.account }
    );
    return {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
      user1,
      user2,
      startTime,
      endTime,
    };
  }
  // btc 100 || eth -1000
  async function deploySetupedAuctionFixture() {
    const {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
      user1,
      user2,
    } = await loadFixture(deployIssuedSetsAuctionRebalanceModuleFixture);

    const startTime = BigInt(await time.latest()) + BigInt(ONE_WEEK_IN_SECS);
    const endTime = startTime + BigInt(ONE_WEEK_IN_SECS);

    await auctionRebalanceModule.write.setupAuction(
      [
        setToken.address,
        [btcToken.address, ethToken.address],
        [btc(100).toBigInt(), eth(-1000).toBigInt()],
        startTime,
        BigInt(ONE_WEEK_IN_SECS),
        eth(-10).toBigInt(),
        eth(0.001).toBigInt(),
        eth(0.001).toBigInt(),
      ],
      { account: manager.account }
    );

    await ethToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user1.account,
      }
    );
    await setToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user1.account,
      }
    );

    return {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
      user1,
      user2,
      startTime,
      endTime,
    };
  }

  async function deployIssuedSetsAuctionRebalanceModuleFixture() {
    const {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
    } = await loadFixture(deployAuctionRebalanceModuleFixture);
    const [, , , user1, user2] = await hre.viem.getWalletClients();
    await btcToken.write.approve([
      basicIssueModule.address,
      btc(100).toBigInt(),
    ]);
    await ethToken.write.approve([
      basicIssueModule.address,
      eth(1000).toBigInt(),
    ]);
    await usdcToken.write.approve([
      basicIssueModule.address,
      usdc(10000).toBigInt(),
    ]);
    await basicIssueModule.write.issue([
      setToken.address,
      eth(100).toBigInt(),
      user1.account.address,
    ]);
    await auctionRebalanceModule.write.lock([setToken.address], {
      account: manager.account,
    });
    return {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
      user1,
      user2,
    };
  }
  async function deployAuctionRebalanceModuleFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, manager, feeRecipient] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const controller = await hre.viem.deployContract("Controller", [
      feeRecipient.account.address,
    ]);
    const setTokenCreator = await hre.viem.deployContract("SetTokenCreator", [
      controller.address,
    ]);
    const basicIssueModule = await hre.viem.deployContract(
      "BasicIssuanceModule",
      [controller.address]
    );
    const auctionRebalanceModule = await hre.viem.deployContract(
      "AuctionRebalanceModule",
      [controller.address]
    );
    await controller.write.initialize([
      [setTokenCreator.address, owner.account.address],
      [basicIssueModule.address, auctionRebalanceModule.address],
      [],
      [],
    ]);

    const btcToken = await hre.viem.deployContract("StandardTokenMock", [
      owner.account.address,
      btc(100).toBigInt(),
      "bitcoin",
      "btc",
      8,
    ]);
    const ethToken = await hre.viem.deployContract("StandardTokenMock", [
      owner.account.address,
      eth(1000).toBigInt(),
      "eth",
      "eth",
      18,
    ]);
    const usdcToken = await hre.viem.deployContract("StandardTokenMock", [
      owner.account.address,
      usdc(10000).toBigInt(),
      "usdc",
      "usdc",
      6,
    ]);

    let tx = await setTokenCreator.write.create([
      [btcToken.address, ethToken.address, usdcToken.address],
      [btc(1).toBigInt(), eth(10).toBigInt(), usdc(100).toBigInt()],
      [basicIssueModule.address, auctionRebalanceModule.address],
      manager.account.address,
      "H3-B",
      "H3",
    ]);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    const hexString = receipt.logs[0].topics[1] as string;
    const setsAddress = hre.ethers.utils.getAddress(
      trimHexStringToAddress(hexString)
    );

    const setToken = await hre.viem.deployContract("SetToken", [
      [btcToken.address, ethToken.address, usdcToken.address],
      [btc(1).toBigInt(), eth(10).toBigInt(), usdc(100).toBigInt()],
      [basicIssueModule.address, auctionRebalanceModule.address],
      controller.address,
      manager.account.address,
      "H3-B",
      "H3",
    ]);
    await controller.write.addSet([setToken.address]);

    await basicIssueModule.write.initialize([setToken.address, ADDRESS_ZERO], {
      account: manager.account,
    });
    await auctionRebalanceModule.write.initialize([setToken.address], {
      account: manager.account,
    });
    return {
      controller,
      basicIssueModule,
      auctionRebalanceModule,
      setToken,
      owner,
      manager,
      feeRecipient,
      publicClient,
      btcToken,
      ethToken,
      usdcToken,
    };
  }
});

function trimHexStringToAddress(hexString: string): string {
  const trimmedHexString = hexString.slice(-40);
  const address = `0x${trimmedHexString}`;
  return address;
}
function localCaculateSetsAmount(price: bigint, virtualAmount: bigint): bigint {
  let amount = (price * virtualAmount) / eth(1).toBigInt();
  if (amount >= 0) {
    // All the users need to pay need to add 1
    amount += BigInt(1);
  }
  return amount;
}
