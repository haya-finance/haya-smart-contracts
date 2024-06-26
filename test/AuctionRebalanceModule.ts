import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseGwei } from "viem";
import { btc, eth, usdc, ens } from "../utils/index";
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
          BigInt(600),
          eth(1).toBigInt(),
          eth(0.01).toBigInt(),
          eth(0.0001).toBigInt(),
          3000,
        ])
      ).to.be.rejectedWith("Must be the SetToken manager");
    });

    it("Test start time must be in the future", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt((await time.latest()) - 200),
            BigInt(ONE_WEEK_IN_SECS),
            BigInt(600),
            eth(1).toBigInt(),
            eth(0.003).toBigInt(),
            eth(0.0001).toBigInt(),
            3000,
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith("The start time must be in the future");
    });

    it("Test duration must be greater than the minimum duration", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await auctionRebalanceModule.write.lock([setToken.address], {
        account: manager.account,
      });
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt((await time.latest()) + 12),
            BigInt(1700),
            BigInt(1700),
            eth(1).toBigInt(),
            eth(0.01).toBigInt(),
            eth(0.01).toBigInt(),
            3000,
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith(
        "The duration must be greater than the minimum duration"
      );
    });
    it("Test prohibition of cancellation shall not be greater than the total duration", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt((await time.latest()) + 12),
            BigInt(ONE_WEEK_IN_SECS),
            BigInt(ONE_WEEK_IN_SECS + 1),
            eth(1).toBigInt(),
            eth(0.001).toBigInt(),
            eth(0.0001).toBigInt(),
            3000,
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith(
        "The prohibition of cancellation shall not be greater than the total duration"
      );
    });
    it("Test maxtick less than max", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt((await time.latest()) + 100),
            BigInt(ONE_WEEK_IN_SECS),
            BigInt(600),
            eth(1).toBigInt(),
            eth(0.01).toBigInt(),
            eth(0.0001).toBigInt(),
            4097,
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith("Tick must less than MAXTICK");
    });
    it("Test available in equal portions", async function () {
      const { manager, btcToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployAuctionRebalanceModuleFixture);
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt((await time.latest()) + 200),
            BigInt(ONE_WEEK_IN_SECS),
            BigInt(600),
            eth(1).toBigInt(),
            eth(0.003).toBigInt(),
            eth(0.0001).toBigInt(),
            3000,
          ],
          { account: manager.account }
        )
      ).to.be.rejectedWith("Must be available in equal portions");
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
            BigInt((await time.latest()) + 200),
            BigInt(ONE_WEEK_IN_SECS),
            BigInt(600),
            eth(1).toBigInt(),
            eth(0.01).toBigInt(),
            eth(0.0001).toBigInt(),
            3000,
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
          BigInt((await time.latest()) + 200),
          BigInt(ONE_WEEK_IN_SECS),
          BigInt(600),
          eth(1).toBigInt(),
          eth(0.01).toBigInt(),
          eth(0.0001).toBigInt(),
          3000,
        ],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.setupAuction(
          [
            setToken.address,
            [btcToken.address],
            [btc(100).toBigInt()],
            BigInt((await time.latest()) + 200),
            BigInt(ONE_WEEK_IN_SECS),
            BigInt(600),
            eth(1).toBigInt(),
            eth(0.01).toBigInt(),
            eth(0.0001).toBigInt(),
            3000,
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
          [setToken.address, 0, eth(0.01).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Not bidding time");
      await time.increaseTo(startTime);
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.01).toBigInt()],
          { account: user1.account }
        )
      ).to.be.fulfilled;
      await time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.01).toBigInt()],
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
          [setToken.address, 0, eth(0.001).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Virtual quantity not meeting the requirements");
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 0, eth(0.201).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Virtual quantity not meeting the requirements");
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, -1, eth(0.01).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Tick need be bigger than 0");
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, 3073, eth(0.01).toBigInt()],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Tick too big");
    });

    it("Test bid amount person tick record, total tick record, bitmap, max tick", async function () {
      // Confirm that the bitmap will not come and will be reversed
      // test auction btc 100 eth -1000
      const { user1, startTime, ethToken, setToken, auctionRebalanceModule } =
        await loadFixture(deploySetupedAuctionFixture);
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

      const basePrice = auctionInfo[6];
      const priceSpacing = auctionInfo[5];

      // need not pay sets but eth
      const tick = 1;
      const virtualAmount = eth(0.01).toBigInt();
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
      await ethToken.write.mintWithAmount([-components[1][1]], {
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
      const tick2 = 3000;
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
      await ethToken.write.mintWithAmount([BigInt(2) * -components[1][1]], {
        account: user1.account,
      });
      await expect(
        auctionRebalanceModule.write.bid(
          [setToken.address, tick2, virtualAmount],
          { account: user1.account }
        )
      ).to.be.fulfilled;

      // tick = 3000, word = 11 |1...000000(total 184 zero)|
      const bitPos = 3000 % 256;
      const position: bigint = BigInt(1) << BigInt(bitPos);
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          11,
        ])
      ).to.be.equal(position);

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

      // tick = 3000, word = 11 |000000...1...000000|
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          11,
        ])
      ).to.be.equal(position);

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
      await time.increaseTo(endTime - BigInt(600));
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 3000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Not cancel time");
      await time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 3000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Not cancel time");
    });

    it("Test auction be set result failed", async function () {
      const { user1, manager, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 3000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Bid's status must be progressing");
    });

    it("Test auction be set result success", async function () {
      const { user1, endTime, manager, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 3000], {
          account: user1.account,
        })
      ).to.be.rejectedWith("Bid's status must be progressing");
    });

    it("Test no bid to cancel", async function () {
      const { user2, endTime, manager, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, 3000], {
          account: user2.account,
        })
      ).to.be.rejectedWith("There is no corresponding asset");
    });

    it("Test cancel rollback amounts", async function () {
      const { user1, ethToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const beforeEthBalance = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      const beforeSetsBalance = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      // tick = 1  virtual amount = eth(0.01).toBigInt()
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const auctionInfo = await auctionRebalanceModule.read.rebalanceInfos([
        setToken.address,
        lastestId,
      ]);

      const basePrice = eth(-10).toBigInt();
      const priceSpacing = eth(0.01).toBigInt();

      // not pay sets but eth
      const tick = 1;
      const virtualAmount = eth(0.01).toBigInt();

      let components =
        await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
          [setToken.address, lastestId, virtualAmount]
        );
      const paidETHAmount = components[1][1];

      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user1.account,
      });
      // Each bid will pay 1 more, and if you bid twice, it will pay 2 more
      expect(
        await ethToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeEthBalance - paidETHAmount);
      expect(
        await setToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeSetsBalance);

      // paied sets but eth
      const tick2 = 3000;
      const price2 = BigInt(tick2) * priceSpacing + basePrice;

      const beforeEthBalance2 = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      const setsPaid = localCaculateSetsAmount(price2, virtualAmount);

      await auctionRebalanceModule.write.cancelBid([setToken.address, tick2], {
        account: user1.account,
      });
      // Each bid will pay 1 more, and if you bid twice, it will pay 2 more
      expect(
        await ethToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeEthBalance2 + -paidETHAmount * BigInt(2));
      expect(
        await setToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeSetsBalance + setsPaid * BigInt(2));
    });

    it("Test bid max tick test, cancel max tick test", async function () {
      // user1 tick = 1, tick = 3000
      const { user1, user2, ethToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await ethToken.write.mintWithAmount([eth(1000000000).toBigInt()], {
        account: user2.account,
      });
      await ethToken.write.approve(
        [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
        {
          account: user2.account,
        }
      );
      await setToken.write.transfer(
        [user2.account.address, eth(50).toBigInt()],
        {
          account: user1.account,
        }
      );
      await setToken.write.approve(
        [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
        {
          account: user2.account,
        }
      );
      let tick = 3000;
      const virtualAmount = eth(0.01).toBigInt();
      await auctionRebalanceModule.write.bid(
        [setToken.address, tick, virtualAmount],
        { account: user2.account }
      );
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(3000);
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user1.account,
      });
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(3000);
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user2.account,
      });
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(1);
      tick = 100;
      await auctionRebalanceModule.write.bid(
        [setToken.address, tick, virtualAmount],
        { account: user2.account }
      );
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(100);
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user2.account,
      });
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(1);
      await auctionRebalanceModule.write.bid(
        [setToken.address, 2, virtualAmount],
        { account: user2.account }
      );
      await auctionRebalanceModule.write.bid(
        [setToken.address, 240, virtualAmount],
        { account: user2.account }
      );
      await auctionRebalanceModule.write.bid(
        [setToken.address, 504, virtualAmount],
        { account: user2.account }
      );
      await auctionRebalanceModule.write.bid(
        [setToken.address, 999, virtualAmount],
        { account: user2.account }
      );
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(999);
      await auctionRebalanceModule.write.cancelBid([setToken.address, 999], {
        account: user2.account,
      });
      expect(
        await auctionRebalanceModule.read.maxTicks([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(504);
    });

    it("Test after rollback tickBitmap value, personal tick amounts, total tick amounts", async function () {
      const { user1, user2, ethToken, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      // Check whether user number of bids on the tick is correct
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const tick = 1;
      const virtualAmount = eth(0.01).toBigInt();
      let components =
        await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
          [setToken.address, lastestId, virtualAmount]
        );
      await ethToken.write.mintWithAmount([-components[1][1] + BigInt(1)], {
        account: user2.account,
      });
      await ethToken.write.approve(
        [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
        {
          account: user2.account,
        }
      );
      await auctionRebalanceModule.write.bid(
        [setToken.address, tick, virtualAmount],
        { account: user2.account }
      );
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user1.account,
      });
      expect(
        await auctionRebalanceModule.read.getAccountTotalVirtualAmountOnTick([
          setToken.address,
          lastestId,
          user1.account.address,
          tick,
        ])
      ).to.be.equal(BigInt(0));
      expect(
        await auctionRebalanceModule.read.getTotalVirtualAmountsOnTick([
          setToken.address,
          lastestId,
          tick,
        ])
      ).to.be.equal(virtualAmount);
      // tick = 1, word = 0 |000000...000010|
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          0,
        ])
      ).to.be.equal(BigInt(2));

      const tick2 = 3000;
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick2], {
        account: user1.account,
      });
      expect(
        await auctionRebalanceModule.read.getAccountTotalVirtualAmountOnTick([
          setToken.address,
          lastestId,
          user1.account.address,
          tick2,
        ])
      ).to.be.equal(BigInt(0));
      expect(
        await auctionRebalanceModule.read.getTotalVirtualAmountsOnTick([
          setToken.address,
          lastestId,
          tick2,
        ])
      ).to.be.equal(BigInt(0));
      // tick = 3000, word = 11 |000000...1...000000|
      expect(
        await auctionRebalanceModule.read.tickBitmaps([
          setToken.address,
          lastestId,
          11,
        ])
      ).to.be.equal(BigInt(0));
    });

    it("Test duplicate cancel", async function () {
      const { user1, setToken, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );

      const tick = 1;
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user1.account,
      });
      await expect(
        auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
          account: user1.account,
        })
      ).to.be.rejectedWith("There is no corresponding asset");
    });

    it("Test cancel bid event", async function () {
      const { user1, setToken, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const tick = 1;
      const virtualAmount = eth(0.01).toBigInt();
      await auctionRebalanceModule.write.cancelBid([setToken.address, tick], {
        account: user1.account,
      });
      // test cancel event
      const cancelEvents = await auctionRebalanceModule.getEvents.CancelBid();
      expect(cancelEvents).to.have.lengthOf(1);
      expect(cancelEvents[0].args._setToken).to.be.equal(
        getAddress(setToken.address)
      );
      expect(cancelEvents[0].args._account).to.be.equal(
        getAddress(user1.account.address)
      );
      expect(cancelEvents[0].args._serialId).to.be.equal(BigInt(lastestId));
      expect(cancelEvents[0].args._tick).to.be.equal(tick);
      expect(cancelEvents[0].args._virtualAmount).to.be.equal(virtualAmount);
    });
  });

  describe("AuctionBalanceModule set auction result test", function () {
    it("Test not manager set result", async function () {
      const { user1, setToken, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      await expect(
        auctionRebalanceModule.write.setAuctionResultFailed(
          [setToken.address],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Must be the SetToken manager");
      await expect(
        auctionRebalanceModule.write.setAuctionResultSuccess(
          [setToken.address],
          { account: user1.account }
        )
      ).to.be.rejectedWith("Must be the SetToken manager");
    });
    it("Test not time to set failed", async function () {
      const { manager, setToken, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      await expect(
        auctionRebalanceModule.write.setAuctionResultFailed(
          [setToken.address],
          { account: manager.account }
        )
      ).to.be.fulfilled;
    });
    it("Test time to set failed", async function () {
      const { manager, endTime, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.setAuctionResultFailed(
          [setToken.address],
          { account: manager.account }
        )
      ).to.be.fulfilled;
    });
    it("Test not time to set success", async function () {
      const { manager, setToken, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      await expect(
        auctionRebalanceModule.write.setAuctionResultSuccess(
          [setToken.address],
          { account: manager.account }
        )
      ).to.be.rejectedWith("Not excution time");
    });
    it("Test time to set success", async function () {
      const { manager, endTime, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.setAuctionResultSuccess(
          [setToken.address],
          { account: manager.account }
        )
      ).to.be.fulfilled;
    });
    it("Test lastest bid finished or duplicate set", async function () {
      const { manager, endTime, setToken, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      await expect(
        auctionRebalanceModule.write.setAuctionResultSuccess(
          [setToken.address],
          { account: manager.account }
        )
      ).to.be.rejectedWith("Auction status must be progressing");
    });
    it("Test not full bid win tick result", async function () {
      // not full all win tick equal zero
      const {
        manager,
        endTime,
        setToken,
        btcToken,
        ethToken,
        auctionRebalanceModule,
      } = await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      expect(
        await auctionRebalanceModule.read.getFinalWinningTick([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(0);
      // tick = 0, virtual amount 0.01  tick = 3000, virtual amount 0.02
      // result mint 0.3 sets, contract sent 3 btc receive 30 eth
      expect(await setToken.read.totalSupply()).to.be.equal(
        eth(100.3).toBigInt()
      );
      expect(await btcToken.read.balanceOf([setToken.address])).to.be.equal(
        btc(97).toBigInt()
      );
      expect(await ethToken.read.balanceOf([setToken.address])).to.be.equal(
        eth(1030).toBigInt()
      );
    });

    it("Test full bid, win tick, tranfer components amounts, set token inflation coefficient", async function () {
      const {
        endTime,
        setToken,
        ethToken,
        btcToken,
        manager,
        auctionRebalanceModule,
      } = await loadFixture(deployFullBiddedSetsSendAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const winTick = 500;
      const componentsInfo =
        await auctionRebalanceModule.read.getAuctionComponentsAndAmounts([
          setToken.address,
          lastestId,
        ]);
      const saleBtcAmount = componentsInfo[1][0];
      const raiseEthAmount = -componentsInfo[1][1];
      await time.increaseTo(endTime);

      const beforeEthAmount = await ethToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const beforeSetsAmount = await setToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const beforeBtcAmount = await btcToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const oldPositionMultiplier = await setToken.read.positionMultiplier();
      const oldSetsSupply = await setToken.read.totalSupply();

      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      expect(
        await auctionRebalanceModule.read.getFinalWinningTick([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(winTick);
      const afterEthAmount = await ethToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const afterSetsAmount = await setToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const afterBtcAmount = await btcToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const tick = winTick;
      const price = BigInt(tick) * eth(0.01).toBigInt() + eth(-10).toBigInt();
      const rollsetsPaid = localCaculateSetsAmount(price, eth(1).toBigInt());
      expect(raiseEthAmount).to.be.equal(beforeEthAmount - afterEthAmount);
      expect(saleBtcAmount).to.be.equal(afterBtcAmount - beforeBtcAmount);
      expect(rollsetsPaid).to.be.equal(beforeSetsAmount - afterSetsAmount);
      const latestSetsSupply = await setToken.read.totalSupply();
      const newPositionMultiplier =
        (oldPositionMultiplier * oldSetsSupply) / latestSetsSupply;
      expect(await setToken.read.positionMultiplier()).to.be.equal(
        newPositionMultiplier
      );
    });
    it("Test component add", async function () {
      const {
        user1,
        ensToken,
        startTime,
        manager,
        endTime,
        setToken,
        auctionRebalanceModule,
      } = await loadFixture(deployRaiseENSSetupedAuctionFixture);

      const tick = 0;
      const virtualAmount = eth(1).toBigInt();
      await ensToken.write.mintWithAmount([ens(1000).toBigInt() + BigInt(1)], {
        account: user1.account,
      });
      await time.increaseTo(startTime);
      await auctionRebalanceModule.write.bid(
        [setToken.address, tick, virtualAmount],
        { account: user1.account }
      );
      await time.increaseTo(endTime);
      expect(await setToken.read.getComponents()).to.have.lengthOf(3);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      expect(await setToken.read.getComponents()).to.have.lengthOf(4);
      expect(
        await setToken.read.getDefaultPositionRealUnit([ensToken.address])
      ).to.be.equal(ens(10).toBigInt());
      expect(await setToken.read.isComponent([ensToken.address])).to.true;
    });
    it("Test component remove", async function () {
      const {
        user1,
        ethToken,
        btcToken,
        manager,
        endTime,
        setToken,
        auctionRebalanceModule,
      } = await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const tick = 0;
      const virtualAmount = eth(0.98).toBigInt();
      let components =
        await auctionRebalanceModule.read.getRequiredOrRewardComponentsAndAmountsForBid(
          [setToken.address, lastestId, virtualAmount]
        );
      await ethToken.write.mintWithAmount([-components[1][1] + BigInt(1)], {
        account: user1.account,
      });
      await ethToken.write.approve(
        [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
        {
          account: user1.account,
        }
      );
      await auctionRebalanceModule.write.bid(
        [setToken.address, tick, virtualAmount],
        { account: user1.account }
      );
      await time.increaseTo(endTime);
      const oldPositionMultiplier = await setToken.read.positionMultiplier();
      const oldSetsSupply = await setToken.read.totalSupply();
      expect(await setToken.read.getComponents()).to.have.lengthOf(3);
      expect(
        await setToken.read.getDefaultPositionRealUnit([ethToken.address])
      ).to.be.equal(eth(10).toBigInt());

      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      expect(await setToken.read.getComponents()).to.have.lengthOf(2);
      const latestSetsSupply = await setToken.read.totalSupply();
      const newPositionMultiplier =
        (oldPositionMultiplier * oldSetsSupply) / latestSetsSupply;
      expect(await setToken.read.positionMultiplier()).to.be.equal(
        newPositionMultiplier
      );
      expect(oldSetsSupply).to.be.equal(eth(100).toBigInt());
      expect(latestSetsSupply).to.be.equal(eth(110).toBigInt());
      const newEthUnit =
        (eth(20).toBigInt() * newPositionMultiplier) / eth(1).toBigInt();
      expect(
        await setToken.read.getDefaultPositionRealUnit([ethToken.address])
      ).to.be.equal(newEthUnit);
      expect(await setToken.read.isComponent([btcToken.address])).to.false;
    });

    it("Test set fail result event", async function () {
      const { setToken, manager, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      // test set failed event
      const failedEvents =
        await auctionRebalanceModule.getEvents.AuctionResultSet();
      expect(failedEvents).to.have.lengthOf(1);
      expect(failedEvents[0].args._setToken).to.be.equal(
        getAddress(setToken.address)
      );
      expect(failedEvents[0].args._serialId).to.be.equal(BigInt(lastestId));
      expect(failedEvents[0].args._isSuccess).to.be.false;
      expect(failedEvents[0].args._winTick).to.be.equal(0);
    });

    it("Test set success result event", async function () {
      const { endTime, setToken, manager, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      // test set success event
      const successEvents =
        await auctionRebalanceModule.getEvents.AuctionResultSet();
      expect(successEvents).to.have.lengthOf(1);
      expect(successEvents[0].args._setToken).to.be.equal(
        getAddress(setToken.address)
      );
      expect(successEvents[0].args._serialId).to.be.equal(BigInt(lastestId));
      expect(successEvents[0].args._isSuccess).to.be.true;
      expect(successEvents[0].args._winTick).to.be.equal(0);
    });
  });

  describe("AuctionBalanceModule claim test", function () {
    it("Test not time to claim", async function () {
      const { user1, setToken, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const tick = 1;
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.rejectedWith("Bid's status must be finished status");
    });

    it("Test auction failed to claim and check amounts", async function () {
      const { user1, setToken, ethToken, manager, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      let tick = 1;
      // virtual amount 0.01
      // tick 0 rollback 0 sets 10 eth
      let beforeEth = await ethToken.read.balanceOf([user1.account.address]);
      let beforeSets = await setToken.read.balanceOf([user1.account.address]);
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.fulfilled;
      expect(
        await ethToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeEth + eth(10).toBigInt());
      expect(
        await setToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeSets);

      // virtual amount 0.02
      // tick 3000 rollback ? sets 2 eth
      tick = 3000;
      const price = BigInt(tick) * eth(0.01).toBigInt() + eth(-10).toBigInt();
      const rollsetsPaid = localCaculateSetsAmount(price, eth(0.02).toBigInt());
      beforeEth = await ethToken.read.balanceOf([user1.account.address]);
      beforeSets = await setToken.read.balanceOf([user1.account.address]);
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.fulfilled;
      expect(
        await ethToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeEth + eth(20).toBigInt());
      expect(
        await setToken.read.balanceOf([user1.account.address])
      ).to.be.equal(beforeSets + rollsetsPaid);
    });

    it("Test not win the bid to claim", async function () {
      // claim user2 tick = 1, amount = 0.01
      const {
        user2,
        endTime,
        setToken,
        ethToken,
        manager,
        auctionRebalanceModule,
      } = await loadFixture(deployFullBiddedNoSetsAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      const tick = 1;
      const beforeEth = await ethToken.read.balanceOf([user2.account.address]);
      const beforeSets = await setToken.read.balanceOf([user2.account.address]);
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user2.account,
          }
        )
      ).to.be.fulfilled;
      expect(
        await ethToken.read.balanceOf([user2.account.address])
      ).to.be.equal(beforeEth + eth(10).toBigInt());
      expect(
        await setToken.read.balanceOf([user2.account.address])
      ).to.be.equal(beforeSets);
    });
    it("Test bidder no pay sets, bidder pay sets on win tick and win price < 0", async function () {
      // win tick 500, on tick virtual amount 0.3, proportion 2/3 = 0.666666...
      // user1 tick (500, 0.1) # (600, 0.1) # (1500, 0.1)
      // user1 tick (500, 0.2) # (600, 0.3) # (1500, 0.3)
      const {
        auctionRebalanceModule,
        setToken,
        manager,
        btcToken,
        ethToken,
        user1,
        user2,
        startTime,
        endTime,
      } = await loadFixture(deploySetupedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await time.increaseTo(startTime);
      await ethToken.write.mintWithAmount([eth(100000).toBigInt()], {
        account: user1.account,
      });
      await ethToken.write.mintWithAmount([eth(100000).toBigInt()], {
        account: user2.account,
      });
      await setToken.write.transfer(
        [user2.account.address, eth(50).toBigInt()],
        { account: user1.account }
      );
      await auctionRebalanceModule.write.batchBid(
        [
          setToken.address,
          [500, 600, 1500],
          [eth(0.1).toBigInt(), eth(0.1).toBigInt(), eth(0.1).toBigInt()],
        ],
        { account: user1.account }
      );
      await auctionRebalanceModule.write.batchBid(
        [
          setToken.address,
          [500, 600, 1500],
          [eth(0.2).toBigInt(), eth(0.3).toBigInt(), eth(0.3).toBigInt()],
        ],
        { account: user2.account }
      );
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      let user1SetsBalance = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1ETHsBalance = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1BTCBalance = await btcToken.read.balanceOf([
        user1.account.address,
      ]);

      let winTick = 500;
      const proportion =
        (eth(2).toBigInt() * eth(1).toBigInt()) / eth(3).toBigInt();
      const basePrice = eth(-10).toBigInt();
      const priceSpacing = eth(0.01).toBigInt();
      let virtualAmount = eth(0.1).toBigInt();
      let tick = 500;
      let price = basePrice + BigInt(tick) * priceSpacing;
      let biddedVirtualAmount =
        (proportion * virtualAmount) / eth(1).toBigInt();
      let setsTokenAmountNeeded = localCaculateSetsAmount(price, virtualAmount);
      let finalRollbackBidSetsAmount = -(
        (setsTokenAmountNeeded * proportion) /
        eth(1).toBigInt()
      );
      let finalRollbackBidTokenAmount =
        ((virtualAmount - biddedVirtualAmount - BigInt(1)) *
          eth(1000).toBigInt()) /
        eth(1).toBigInt();
      let finalRewardBTCAmount =
        (biddedVirtualAmount * btc(100).toBigInt()) / eth(1).toBigInt();
      await auctionRebalanceModule.write.claim(
        [setToken.address, lastestId, tick],
        { account: user1.account }
      );
      let user1SetsBalanceAfter = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1ETHsBalanceAfter = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1BTCBalanceAfter = await btcToken.read.balanceOf([
        user1.account.address,
      ]);

      expect(user1SetsBalanceAfter).to.be.equal(
        user1SetsBalance + finalRollbackBidSetsAmount
      );
      expect(user1ETHsBalanceAfter).to.be.equal(
        user1ETHsBalance + finalRollbackBidTokenAmount
      );
      expect(user1BTCBalanceAfter).to.be.equal(
        user1BTCBalance + finalRewardBTCAmount
      );

      virtualAmount = eth(0.1).toBigInt();
      tick = 600;

      price = basePrice + BigInt(tick) * priceSpacing;
      let winPrice = basePrice + BigInt(winTick) * priceSpacing;
      biddedVirtualAmount = virtualAmount;
      let winsetsTokenAmountNeeded = localCaculateSetsAmount(
        winPrice,
        virtualAmount
      );
      setsTokenAmountNeeded = localCaculateSetsAmount(price, virtualAmount);
      // price < 0
      finalRollbackBidSetsAmount =
        setsTokenAmountNeeded - winsetsTokenAmountNeeded;
      if (price < 0) {
        finalRollbackBidSetsAmount -= setsTokenAmountNeeded;
      }
      finalRewardBTCAmount =
        (biddedVirtualAmount * btc(100).toBigInt()) / eth(1).toBigInt();
      await auctionRebalanceModule.write.claim(
        [setToken.address, lastestId, tick],
        { account: user1.account }
      );
      user1BTCBalance = user1BTCBalanceAfter;
      user1ETHsBalance = user1ETHsBalanceAfter;
      user1SetsBalance = user1SetsBalanceAfter;
      user1SetsBalanceAfter = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      user1ETHsBalanceAfter = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      user1BTCBalanceAfter = await btcToken.read.balanceOf([
        user1.account.address,
      ]);

      expect(user1SetsBalanceAfter).to.be.equal(
        user1SetsBalance + finalRollbackBidSetsAmount
      );
      expect(user1ETHsBalanceAfter).to.be.equal(user1ETHsBalance);
      expect(user1BTCBalanceAfter).to.be.equal(
        user1BTCBalance + finalRewardBTCAmount
      );
      await auctionRebalanceModule.write.batchClaim(
        [setToken.address, [lastestId], [1500]],
        { account: user1.account }
      );
      await auctionRebalanceModule.write.batchClaim(
        [setToken.address, [lastestId, lastestId, lastestId], [500, 600, 1500]],
        { account: user2.account }
      );
      const poolSetsBalance = await setToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const poolETHsBalance = await ethToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const poolBTCBalance = await btcToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      // There will be a surplus that cannot be evenly distributed completely
      expect(poolSetsBalance).to.be.equal(BigInt(1));
      expect(poolETHsBalance).to.be.equal(BigInt(1000));
      expect(poolBTCBalance).to.be.equal(BigInt(1));
    });
    it("Test bidder pay sets, on win tick and win price > 0", async function () {
      // win tick 1500, on tick virtual amount 0.3, proportion 1/3 = 0.33333...
      // user1 tick (1500, 0.1) # (2000, 0.1) # (3000, 0.1)
      // user1 tick (1500, 0.2) # (2000, 0.4) # (3000, 0.3)
      const {
        auctionRebalanceModule,
        setToken,
        manager,
        btcToken,
        ethToken,
        user1,
        user2,
        startTime,
        endTime,
      } = await loadFixture(deploySetupedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await time.increaseTo(startTime);
      await ethToken.write.mintWithAmount([eth(100000).toBigInt()], {
        account: user1.account,
      });
      await ethToken.write.mintWithAmount([eth(100000).toBigInt()], {
        account: user2.account,
      });
      await setToken.write.transfer(
        [user2.account.address, eth(50).toBigInt()],
        { account: user1.account }
      );
      await auctionRebalanceModule.write.batchBid(
        [
          setToken.address,
          [1500, 2000, 3000],
          [eth(0.1).toBigInt(), eth(0.1).toBigInt(), eth(0.1).toBigInt()],
        ],
        { account: user1.account }
      );
      await auctionRebalanceModule.write.batchBid(
        [
          setToken.address,
          [1500, 2000, 3000],
          [eth(0.2).toBigInt(), eth(0.4).toBigInt(), eth(0.3).toBigInt()],
        ],
        { account: user2.account }
      );
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        { account: manager.account }
      );
      let user1SetsBalance = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1ETHsBalance = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1BTCBalance = await btcToken.read.balanceOf([
        user1.account.address,
      ]);
      const winTick = 1500;
      const proportion =
        (eth(1).toBigInt() * eth(1).toBigInt()) / eth(3).toBigInt();
      const basePrice = eth(-10).toBigInt();
      const priceSpacing = eth(0.01).toBigInt();
      let virtualAmount = eth(0.1).toBigInt();
      let tick = 1500;
      let price = basePrice + BigInt(tick) * priceSpacing;
      let biddedVirtualAmount =
        (proportion * virtualAmount) / eth(1).toBigInt();
      let setsTokenAmountNeeded = localCaculateSetsAmount(price, virtualAmount);
      let finalRollbackBidSetsAmount =
        setsTokenAmountNeeded -
        (setsTokenAmountNeeded * proportion) / eth(1).toBigInt() -
        BigInt(1);
      let finalRollbackBidTokenAmount =
        ((virtualAmount - biddedVirtualAmount - BigInt(1)) *
          eth(1000).toBigInt()) /
        eth(1).toBigInt();
      let finalRewardBTCAmount =
        (biddedVirtualAmount * btc(100).toBigInt()) / eth(1).toBigInt();
      await auctionRebalanceModule.write.claim(
        [setToken.address, lastestId, tick],
        { account: user1.account }
      );
      let user1SetsBalanceAfter = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1ETHsBalanceAfter = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      let user1BTCBalanceAfter = await btcToken.read.balanceOf([
        user1.account.address,
      ]);

      expect(user1SetsBalanceAfter).to.be.equal(
        user1SetsBalance + finalRollbackBidSetsAmount
      );
      expect(user1ETHsBalanceAfter).to.be.equal(
        user1ETHsBalance + finalRollbackBidTokenAmount
      );
      expect(user1BTCBalanceAfter).to.be.equal(
        user1BTCBalance + finalRewardBTCAmount
      );

      virtualAmount = eth(0.1).toBigInt();
      tick = 2000;

      price = basePrice + BigInt(tick) * priceSpacing;
      let winPrice = basePrice + BigInt(winTick) * priceSpacing;
      biddedVirtualAmount = virtualAmount;
      let winsetsTokenAmountNeeded = localCaculateSetsAmount(
        winPrice,
        virtualAmount
      );
      setsTokenAmountNeeded = localCaculateSetsAmount(price, virtualAmount);
      // price > 0
      finalRollbackBidSetsAmount =
        setsTokenAmountNeeded - winsetsTokenAmountNeeded;
      finalRewardBTCAmount =
        (biddedVirtualAmount * btc(100).toBigInt()) / eth(1).toBigInt();
      await auctionRebalanceModule.write.claim(
        [setToken.address, lastestId, tick],
        { account: user1.account }
      );
      user1BTCBalance = user1BTCBalanceAfter;
      user1ETHsBalance = user1ETHsBalanceAfter;
      user1SetsBalance = user1SetsBalanceAfter;
      user1SetsBalanceAfter = await setToken.read.balanceOf([
        user1.account.address,
      ]);
      user1ETHsBalanceAfter = await ethToken.read.balanceOf([
        user1.account.address,
      ]);
      user1BTCBalanceAfter = await btcToken.read.balanceOf([
        user1.account.address,
      ]);

      expect(user1SetsBalanceAfter).to.be.equal(
        user1SetsBalance + finalRollbackBidSetsAmount
      );
      expect(user1ETHsBalanceAfter).to.be.equal(user1ETHsBalance);
      expect(user1BTCBalanceAfter).to.be.equal(
        user1BTCBalance + finalRewardBTCAmount
      );
      await auctionRebalanceModule.write.batchClaim(
        [setToken.address, [lastestId], [3000]],
        { account: user1.account }
      );
      await auctionRebalanceModule.write.batchClaim(
        [
          setToken.address,
          [lastestId, lastestId, lastestId],
          [1500, 2000, 3000],
        ],
        { account: user2.account }
      );
      const poolSetsBalance = await setToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const poolETHsBalance = await ethToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      const poolBTCBalance = await btcToken.read.balanceOf([
        auctionRebalanceModule.address,
      ]);
      // There will be a surplus that cannot be evenly distributed completely
      expect(poolSetsBalance).to.be.equal(BigInt(1));
      expect(poolETHsBalance).to.be.equal(BigInt(1000));
      expect(poolBTCBalance).to.be.equal(BigInt(1));
    });
    it("Test not pay sets, win the bid to claim, on win tick and win price = 0, check amounts", async function () {
      // claim user3 tick = 1000(win 20%)
      const {
        user3,
        endTime,
        setToken,
        ethToken,
        btcToken,
        manager,
        auctionRebalanceModule,
      } = await loadFixture(deployFullBiddedNoSetsAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);

      expect(
        await auctionRebalanceModule.read.getActualBiddedVirtualAmount([
          setToken.address,
          lastestId,
          user3.account.address,
          1000,
        ])
      ).to.be.equal(eth(0.08).toBigInt());
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      expect(
        await auctionRebalanceModule.read.getFinalWinningTick([
          setToken.address,
          lastestId,
        ])
      ).to.be.equal(1000);
      const tick = 1000;
      const virtualAmount = eth(0.4).toBigInt();
      const price = BigInt(tick) * eth(0.01).toBigInt() + eth(-10).toBigInt();

      localCaculateSetsAmount(price, virtualAmount);
      // price zero, so rollsetsPaid equal zero
      const rollEthVirtualAmount = eth(0.32).toBigInt() - BigInt(1);
      const rollEthAmount = rollEthVirtualAmount * BigInt(1000);
      const btcReward =
        (((eth(0.2).toBigInt() * virtualAmount) / eth(1).toBigInt()) *
          btc(100).toBigInt()) /
        eth(1).toBigInt();
      const beforeEth = await ethToken.read.balanceOf([user3.account.address]);
      const beforeSets = await setToken.read.balanceOf([user3.account.address]);
      const beforeBtc = await btcToken.read.balanceOf([user3.account.address]);
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user3.account,
          }
        )
      ).to.be.fulfilled;
      expect(
        await ethToken.read.balanceOf([user3.account.address])
      ).to.be.equal(beforeEth + rollEthAmount);
      expect(
        await setToken.read.balanceOf([user3.account.address])
      ).to.be.equal(beforeSets);
      expect(
        await btcToken.read.balanceOf([user3.account.address])
      ).to.be.equal(beforeBtc + btcReward);
    });
    it("Test win the bid and bigger than win tick, check amounts", async function () {
      // claim user3 tick = 2000(full)
      const {
        user3,
        endTime,
        setToken,
        ethToken,
        btcToken,
        manager,
        auctionRebalanceModule,
      } = await loadFixture(deployFullBiddedNoSetsAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      expect(
        await auctionRebalanceModule.read.getActualBiddedVirtualAmount([
          setToken.address,
          lastestId,
          user3.account.address,
          2000,
        ])
      ).to.be.equal(eth(0.7).toBigInt());
      await time.increaseTo(endTime);
      await auctionRebalanceModule.write.setAuctionResultSuccess(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      const tick = 2000;
      const winTick = 1000;
      const virtualAmount = eth(0.7).toBigInt();
      const price = BigInt(tick) * eth(0.01).toBigInt() + eth(-10).toBigInt();
      const winPrice =
        BigInt(winTick) * eth(0.01).toBigInt() + eth(-10).toBigInt();

      const rollbackSets =
        (virtualAmount * (price - winPrice)) / eth(1).toBigInt();
      const beforeEth = await ethToken.read.balanceOf([user3.account.address]);
      const beforeSets = await setToken.read.balanceOf([user3.account.address]);
      const beforeBtc = await btcToken.read.balanceOf([user3.account.address]);
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user3.account,
          }
        )
      ).to.be.fulfilled;
      expect(
        await btcToken.read.balanceOf([user3.account.address])
      ).to.be.equal(beforeBtc + btc(70).toBigInt());
      expect(
        await ethToken.read.balanceOf([user3.account.address])
      ).to.be.equal(beforeEth);
      expect(
        await setToken.read.balanceOf([user3.account.address])
      ).to.be.equal(beforeSets + rollbackSets);
    });

    it("Test duplicate claim", async function () {
      const { user1, setToken, manager, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      const tick = 1;
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.fulfilled;
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.rejectedWith("Already been claimed");
    });
    it("Test never bidded to claim", async function () {
      const { user2, setToken, manager, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      const tick = 1;
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user2.account,
          }
        )
      ).to.be.rejectedWith("There is no corresponding asset");
    });

    it("Test claim event", async function () {
      const { user1, setToken, manager, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        {
          account: manager.account,
        }
      );
      const tick = 1;
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.fulfilled;
      // test claim event
      const claimEvents = await auctionRebalanceModule.getEvents.Claim();
      expect(claimEvents).to.have.lengthOf(1);
      expect(claimEvents[0].args._setToken).to.be.equal(
        getAddress(setToken.address)
      );
      expect(claimEvents[0].args._account).to.be.equal(
        getAddress(user1.account.address)
      );
      expect(claimEvents[0].args._serialId).to.be.equal(BigInt(lastestId));
      expect(claimEvents[0].args._tick).to.be.equal(tick);
    });
  });

  describe("AuctionBalanceModule remove module test", function () {
    it("Test latest bid not finished", async function () {
      const { setToken, manager, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      await auctionRebalanceModule.write.unlock([setToken.address], {
        account: manager.account,
      });
      await expect(
        setToken.write.removeModule([auctionRebalanceModule.address], {
          account: manager.account,
        })
      ).to.be.rejectedWith("Latest bid is progressing");
    });
    it("Test set token is still lock", async function () {
      const { setToken, manager, auctionRebalanceModule } = await loadFixture(
        deployUser1BiddedAuctionFixture
      );
      await expect(
        setToken.write.removeModule([auctionRebalanceModule.address], {
          account: manager.account,
        })
      ).to.be.rejectedWith("Only when unlocked");
    });
    it("Test removed and still can claim", async function () {
      const { user1, setToken, manager, auctionRebalanceModule } =
        await loadFixture(deployUser1BiddedAuctionFixture);
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      const tick = 1;
      await auctionRebalanceModule.write.setAuctionResultFailed(
        [setToken.address],
        { account: manager.account }
      );
      await auctionRebalanceModule.write.unlock([setToken.address], {
        account: manager.account,
      });
      await setToken.write.removeModule([auctionRebalanceModule.address], {
        account: manager.account,
      });
      await expect(
        auctionRebalanceModule.write.claim(
          [setToken.address, lastestId, tick],
          {
            account: user1.account,
          }
        )
      ).to.be.fulfilled;
    });
  });

  describe("AuctionBalanceModule set success result gas limit test", function () {
    it("Test gas limit", async function () {
      const {
        auctionRebalanceModule,
        setToken,
        manager,
        user1,
        btcToken,
        ethToken,
      } = await loadFixture(deployIssuedSetsAuctionRebalanceModuleFixture);

      const startTime = BigInt((await time.latest()) + 100);
      const endTime = startTime + BigInt(ONE_WEEK_IN_SECS);

      await auctionRebalanceModule.write.setupAuction(
        [
          setToken.address,
          [btcToken.address, ethToken.address],
          [btc(1).toBigInt(), eth(1).toBigInt()],
          startTime,
          BigInt(ONE_WEEK_IN_SECS),
          BigInt(600),
          eth(1).toBigInt(),
          eth(0.0001).toBigInt(),
          eth(0.0001).toBigInt(),
          3000,
        ],
        { account: manager.account }
      );
      time.increaseTo(startTime);
      await setToken.write.approve(
        [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
        { account: user1.account }
      );
      const lastestId = await auctionRebalanceModule.read.serialIds([
        setToken.address,
      ]);
      let num: number = 3000;
      let i: number;
      for (i = 50; i < num; i++) {
        await auctionRebalanceModule.write.bid(
          [setToken.address, i, eth(0.0003).toBigInt()],
          { account: user1.account }
        );
      }
      await time.increaseTo(endTime);
      await expect(
        auctionRebalanceModule.write.setAuctionResultSuccess(
          [setToken.address],
          { account: manager.account, gas: BigInt(12000000) }
        )
      ).to.be.fulfilled;
      expect(
        await auctionRebalanceModule.read.getFinalWinningTick([
          setToken.address,
          BigInt(1),
        ])
      ).to.be.equal(0);
    });
  });

  // bid on tick 0 ,1, 500, 2000, 3000,
  // bid 8 times
  // user1 tick=0 virtual=0.01, tick=300 virtual=0.01, tick=3000 virtual=0.01
  // user2 tick=1 virtual=0.01, tick=500 virtual=0.1, tick=3000 virtual=0.18
  // user3 tick=500 virtual=0.4, tick=2000, virtual=0.7
  // win bid 500, on tick 500 win 20%
  async function deployFullBiddedSetsSendAuctionFixture() {
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
    } = await loadFixture(deployUser1BiddedAuctionFixture);
    const [, , , , , user3] = await hre.viem.getWalletClients();
    await auctionRebalanceModule.write.unlock([setToken.address], {
      account: manager.account,
    });
    await basicIssueModule.write.issue([
      setToken.address,
      eth(900).toBigInt(),
      user2.account.address,
    ]);
    await basicIssueModule.write.issue([
      setToken.address,
      eth(2000).toBigInt(),
      user3.account.address,
    ]);
    await auctionRebalanceModule.write.lock([setToken.address], {
      account: manager.account,
    });
    await ethToken.write.mintWithAmount([eth(1000).toBigInt()], {
      account: user2.account,
    });

    await ethToken.write.mintWithAmount([eth(1102).toBigInt()], {
      account: user3.account,
    });
    await ethToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user3.account,
      }
    );
    await setToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user3.account,
      }
    );
    await auctionRebalanceModule.write.batchBid(
      [
        setToken.address,
        [1, 500, 3000],
        [eth(0.01).toBigInt(), eth(0.1).toBigInt(), eth(0.18).toBigInt()],
      ],
      { account: user2.account }
    );
    await auctionRebalanceModule.write.batchBid(
      [
        setToken.address,
        [500, 2000],
        [eth(0.4).toBigInt(), eth(0.7).toBigInt()],
      ],
      { account: user3.account }
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
      user3,
      startTime,
      endTime,
    };
  }

  // bid on tick 0 ,1, 1000, 2000, 3000,

  // user1 tick=0 virtual=0.01, tick=3000 virtual=0.02
  // user2 tick=1 virtual=0.01, tick=1000 virtual=0.1, tick=3000 virtual=0.18
  // user3 tick=1000 virtual=0.4, tick=2000, virtual=0.7
  // win bid 1000, on tick 1000 win 20%
  async function deployFullBiddedNoSetsAuctionFixture() {
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
    } = await loadFixture(deployUser1BiddedAuctionFixture);
    const [, , , , , user3] = await hre.viem.getWalletClients();
    await auctionRebalanceModule.write.unlock([setToken.address], {
      account: manager.account,
    });
    await basicIssueModule.write.issue([
      setToken.address,
      eth(900).toBigInt(),
      user2.account.address,
    ]);
    await basicIssueModule.write.issue([
      setToken.address,
      eth(2000).toBigInt(),
      user3.account.address,
    ]);
    await auctionRebalanceModule.write.lock([setToken.address], {
      account: manager.account,
    });
    await ethToken.write.mintWithAmount([eth(1000).toBigInt()], {
      account: user2.account,
    });

    await ethToken.write.mintWithAmount([eth(1102).toBigInt()], {
      account: user3.account,
    });
    await ethToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user3.account,
      }
    );
    await setToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user3.account,
      }
    );
    await auctionRebalanceModule.write.batchBid(
      [
        setToken.address,
        [1, 1000, 3000],
        [eth(0.01).toBigInt(), eth(0.1).toBigInt(), eth(0.18).toBigInt()],
      ],
      { account: user2.account }
    );
    await auctionRebalanceModule.write.batchBid(
      [
        setToken.address,
        [1000, 2000],
        [eth(0.4).toBigInt(), eth(0.7).toBigInt()],
      ],
      { account: user3.account }
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
      user3,
      startTime,
      endTime,
    };
  }

  // bid on tick = 1, tick = 3000
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
    const virtualAmount = eth(0.01).toBigInt();
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
    const tick2 = 3000;
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

  // ens -1000
  async function deployRaiseENSSetupedAuctionFixture() {
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
    const ensToken = await hre.viem.deployContract("StandardTokenMock", [
      "ens",
      "ens",
      8,
    ]);
    await ensToken.write.mintWithAmount([ens(1000).toBigInt()]);
    const startTime = BigInt((await time.latest()) + 200);
    const endTime = startTime + BigInt(ONE_WEEK_IN_SECS);

    await auctionRebalanceModule.write.setupAuction(
      [
        setToken.address,
        [ensToken.address],
        [ens(-1000).toBigInt()],
        startTime,
        BigInt(ONE_WEEK_IN_SECS),
        BigInt(600),
        eth(0).toBigInt(),
        eth(0.01).toBigInt(),
        eth(0.01).toBigInt(),
        3000,
      ],
      { account: manager.account }
    );
    await ensToken.write.mintWithAmount([ens(1000).toBigInt()], {
      account: user1.account,
    });
    await ensToken.write.approve(
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
      ensToken,
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
        BigInt(600),
        eth(-10).toBigInt(),
        eth(0.01).toBigInt(),
        eth(0.01).toBigInt(),
        3000,
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
    await ethToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user2.account,
      }
    );
    await setToken.write.approve(
      [auctionRebalanceModule.address, MAX_UINT_256.toBigInt()],
      {
        account: user2.account,
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
      btc(20000).toBigInt(),
    ]);
    await ethToken.write.approve([
      basicIssueModule.address,
      eth(300000).toBigInt(),
    ]);
    await usdcToken.write.approve([
      basicIssueModule.address,
      usdc(2000000).toBigInt(),
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
      "bitcoin",
      "btc",
      8,
    ]);
    await btcToken.write.mintWithAmount([btc(20000).toBigInt()]);
    const ethToken = await hre.viem.deployContract("StandardTokenMock", [
      "eth",
      "eth",
      18,
    ]);
    await ethToken.write.mintWithAmount([eth(300000).toBigInt()]);
    const usdcToken = await hre.viem.deployContract("StandardTokenMock", [
      "usdc",
      "usdc",
      6,
    ]);
    await usdcToken.write.mintWithAmount([usdc(2000000).toBigInt()]);
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
  return amount;
}
