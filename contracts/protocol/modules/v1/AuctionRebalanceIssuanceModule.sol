/*
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

    SPDX-License-Identifier: Apache License, Version 2.0
*/
pragma solidity 0.6.10;
pragma experimental "ABIEncoderV2";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/SafeCast.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {Invoke} from "../../lib/Invoke.sol";
import {Position} from "../../lib/Position.sol";
import {PreciseUnitMath} from "../../../lib/PreciseUnitMath.sol";
import {ISetToken} from "../../../interfaces/ISetToken.sol";
import {ModuleBase} from "../../lib/ModuleBase.sol";
import {IController} from "../../../interfaces/IController.sol";
import {AddressArrayUtils} from "../../../lib/AddressArrayUtils.sol";
import {TickBitmap} from "../../../lib/TickBitmap.sol";
import {ValuePosition} from "../../../lib/ValuePosition.sol";

contract AuctionRebalanceIssuanceModule is ModuleBase, ReentrancyGuard {
    using Invoke for ISetToken;
    using Position for ISetToken.Position;
    using Position for ISetToken;
    using PreciseUnitMath for uint256;
    using PreciseUnitMath for int256;
    using SafeMath for uint256;
    using SafeCast for int256;
    using TickBitmap for mapping(int16 => uint256);
    using ValuePosition for ValuePosition.Info;
    using ValuePosition for mapping(bytes32 => ValuePosition.Info);
    using AddressArrayUtils for address[];
    using AddressArrayUtils for IERC20[];
    /* ============ Enums ============ */
    enum RebalanceStatus {
        NONE, // Indicates no rebalance action can be taken
        PROGRESSING,
        SUCCESSED,
        FAILURED
    }

    int256 public immutable VirtualBaseAmount; // Just base for caculate
    /* ============ State Variables ============ */
    mapping(ISetToken => uint256) public serialIds; // For recording rebalance serial, start at No 1.
    mapping(ISetToken => mapping(uint256 => int24)) public maxTicks; // Each setup balance maximum tick record.
    mapping(ISetToken => mapping(uint256 => int24)) public winningBidTick; // Price win the bid. If win tick = 0, bid may not get full. _totalVirtualAmount will be sign.
    mapping(ISetToken => mapping(uint256 => RebalanceInfo))
        public rebalanceInfos; // Recorded all rebanalce info.

    mapping(ISetToken => mapping(uint256 => mapping(int16 => uint256)))
        public tickBitmaps;
    mapping(ISetToken => mapping(bytes32 => ValuePosition.Info))
        public valuePositions; // Storage user amount in tick and status claimed
    mapping(ISetToken => mapping(uint256 => mapping(int24 => int256)))
        public virtualAmountsOnTicks;

    // This variable can only be set if it is overrecruited
    mapping(ISetToken => mapping(uint256 => int256))
        public exactTickAboveGetProportion; // The percentage of tokens that users who are bid at the tick will be able to acquire 10% = 0.1*10**18

    struct RebalanceInfo {
        RebalanceStatus status; // Status.
        int256 positionMultiplier; // Position multiplier when target units were calculated.
        uint256 rebalanceStartTime; // Unix timestamp marking the start of the rebalance.
        uint256 rebalanceDuration; // Duration of the rebalance in seconds, exp 3 days.
        address[] rebalanceComponents; // List of component tokens involved in the rebalance.
        int256[] rebalanceAmounts; // List of component tokens rebalance amounts, maybe nagtive.
        int256 minBidAmount; // Minimum sets required for each bid.
        int256 minTotalAmountsSetsRequire; // Minimum sets required for the corresponding token quantity raised.
        int256 priceSpacing;
        int256 _minBasePrice; // For internal can be nagtive. Decimal 10**18.
        // _totalVirtualAmount > VirtualBaseAmount: overrecruited.
        int256 _totalVirtualAmount; //  When the bid is not completed, the final total virtual amount. Also save gas.
    }

    function getBiddingSetsTokenAmountFromTick(
        ISetToken _setToken,
        int24 tick
    ) public view returns (int256) {}

    /* ============ Modifiers ============ */

    modifier onlyAllowedBidTime(ISetToken _setToken) {
        _validateOnlyAllowedBidTimeOrStatus(_setToken);
        _;
    }

    constructor(IController _controller) public ModuleBase(_controller) {
        VirtualBaseAmount = PreciseUnitMath.preciseUnitInt();
    }

    function setupRebalance(
        ISetToken _setToken,
        address[] memory _rebalanceComponents,
        int256[] memory _rebalanceAmounts,
        uint256 _rebalanceStartTime,
        uint256 _rebalanceDuration,
        int256 _minAmountsSetsRequire,
        int256 _minBidAmount,
        int256 _priceSpacing
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        require(
            _rebalanceComponents.length > 0,
            "Must have at least 1 component"
        );
        require(
            _rebalanceComponents.length == _rebalanceAmounts.length,
            "Component and unit lengths must be the same"
        );
        require(_priceSpacing > 0, "Price spcacing must be bigger than 0");
        require(_setToken.isLocked(), "Sets should be locked");
        uint256 id = serialIds[_setToken];
        require(
            rebalanceInfos[_setToken][id].status != RebalanceStatus.PROGRESSING,
            "Latest bid is progressing"
        );

        serialIds[_setToken] = id.add(1);

        RebalanceInfo storage info = rebalanceInfos[_setToken][id];
        info.status = RebalanceStatus.PROGRESSING;
        info.positionMultiplier = _setToken.positionMultiplier();
        info.rebalanceStartTime = _rebalanceStartTime;
        info.rebalanceDuration = _rebalanceDuration;
        info.rebalanceComponents = _rebalanceComponents;
        info.minTotalAmountsSetsRequire = _minAmountsSetsRequire;
        info.minBidAmount = _minBidAmount;
        info.priceSpacing = _priceSpacing;

        int256 minBasePrice = _minAmountsSetsRequire.preciseDiv(
            VirtualBaseAmount
        );
        info._minBasePrice = minBasePrice;
    }
    // ATAINTION !!!
    // cant choose sets amount as param, calulate amount div target price, but price maybe zero.
    function bid(
        ISetToken _setToken,
        int24 _tick,
        int256 _virtualAmount
    ) external nonReentrant onlyAllowedBidTime(_setToken) {
        require(_virtualAmount > 0, "Virtual amount must be positive number");
        require(_tick >= 0, "Tick need be bigger than 0");
        uint256 serialId = serialIds[_setToken];
        RebalanceInfo storage info = rebalanceInfos[_setToken][serialId];
        int256 setsTokenAmountNeeded = _caculateSetsTokenNeeded(
            info._minBasePrice,
            info.priceSpacing,
            _tick,
            _virtualAmount
        );
        require(
            setsTokenAmountNeeded >= info.minBidAmount,
            "Sets quantity not meeting the requirements"
        );
        // tranfer token if needed
        _transferBidSets(_setToken, msg.sender, setsTokenAmountNeeded);
        _transferBidToken(
            msg.sender,
            _virtualAmount,
            info.rebalanceComponents,
            info.rebalanceAmounts
        );

        ValuePosition.Info storage valuePosition = valuePositions[_setToken]
            .get(serialId, msg.sender, _tick);
        valuePosition.add(_virtualAmount);

        mapping(int16 => uint256) storage tickBitmap = tickBitmaps[_setToken][
            serialId
        ];
        // make sure this tick 0
        (, bool initialize) = tickBitmap.nextInitializedTickWithinOneWord(
            _tick,
            1,
            false
        );
        if (!initialize) {
            tickBitmap.flipTick(_tick, 1);
        }
        _updateTotalVirtualAmountsOnTick(
            _setToken,
            serialId,
            _tick,
            _virtualAmount
        );
        _updateMaxTick(_setToken, serialId, _tick);
    }

    // TODO: maybe not
    // function cancelBid(
    //     ISetToken _setToken,
    //     int24 _tick
    // ) external nonReentrant onlyAllowedBidTime(_setToken) {
    //     require(_tick >= 0, "Tick need be bigger than 0");
    //     uint256 serialId = serialIds[_setToken];
    //     ValuePosition.Info storage valuePosition = valuePositions[_setToken]
    //         .get(serialId, msg.sender, _tick);
    //     // require(condition);
    // }

    // function _transferClaimSets(
    //     ISetToken _setToken,
    //     address _account,
    //     int256 _amount
    // ) internal {}
    // function _transferClaimToken(
    //     ISetToken _setToken,
    //     address _account,
    //     int256 _virtualAmount,
    //     address[] calldata _component,
    //     int256[] calldata _amounts
    // ) internal {}

    function claim(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick
    ) external nonReentrant {
        require(_tick >= 0, "Tick need be bigger than 0");
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        require(
            info.status == RebalanceStatus.SUCCESSED ||
                info.status == RebalanceStatus.FAILURED,
            "Bid's status must be finished status"
        );
        if (info.status == RebalanceStatus.FAILURED) {
            _bidFailedClaimAllAssets(_setToken, _serialId, msg.sender, _tick);
        } else if (info.status == RebalanceStatus.SUCCESSED) {
            _bidSuccessClaimRewards(_setToken, _serialId, msg.sender, _tick);
        }
    }

    function _bidFailedClaimAllAssets(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick
    ) internal {
        ValuePosition.Info storage valuePosition = valuePositions[_setToken]
            .get(_serialId, _account, _tick);
        require(!valuePosition.claimed, "Already been claimed");
        int256 virtualAmount = valuePosition.virtualAmount;
        require(virtualAmount > 0, "There is no corresponding asset");

        valuePosition.claimed = true;

        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        int256 setsTokenAmountNeeded = _caculateSetsTokenNeeded(
            info._minBasePrice,
            info.priceSpacing,
            _tick,
            virtualAmount
        );
        _rollbackBidSets(_setToken, _account, setsTokenAmountNeeded);
        _rollbackBidToken(
            _account,
            virtualAmount,
            info.rebalanceComponents,
            info.rebalanceAmounts
        );
    }

    function _bidSuccessClaimRewards(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick
    ) internal {
        ValuePosition.Info storage valuePosition = valuePositions[_setToken]
            .get(_serialId, _account, _tick);
        require(!valuePosition.claimed, "Already been claimed");
        int256 virtualAmount = valuePosition.virtualAmount;
        require(virtualAmount > 0, "There is no corresponding asset");
        valuePosition.claimed = true;
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        int256 setsTokenAmountNeeded = _caculateSetsTokenNeeded(
            info._minBasePrice,
            info.priceSpacing,
            _tick,
            virtualAmount
        );
        int24 winTick = winningBidTick[_setToken][_serialId];

        if (_tick < winTick) {
            // no win bid
            _rollbackBidSets(_setToken, _account, setsTokenAmountNeeded);
            _rollbackBidToken(
                _account,
                virtualAmount,
                info.rebalanceComponents,
                info.rebalanceAmounts
            );
        } else {
            int256 biddedVirtualAmount = virtualAmount;
            if (
                info._totalVirtualAmount > VirtualBaseAmount && winTick == _tick
            ) {
                biddedVirtualAmount = exactTickAboveGetProportion[_setToken][
                    _serialId
                ].preciseMul(virtualAmount);
            }
            int256 ultimatelyConsumedSets = _caculateSetsTokenNeeded(
                info._minBasePrice,
                info.priceSpacing,
                winTick,
                biddedVirtualAmount
            );

            _rollbackBidSets(
                _setToken,
                _account,
                setsTokenAmountNeeded.sub(ultimatelyConsumedSets)
            );

            _rollbackBidToken(
                _account,
                virtualAmount.sub(biddedVirtualAmount),
                info.rebalanceComponents,
                info.rebalanceAmounts
            );

            _sentSetsRewards(_setToken, _account, ultimatelyConsumedSets);

            _sentTokenRewards(
                _account,
                biddedVirtualAmount,
                info.rebalanceComponents,
                info.rebalanceAmounts
            );
        }
    }

    function _rollbackBidSets(
        ISetToken _setToken,
        address _account,
        int256 _amount
    ) internal {
        if (_amount > 0) {
            transferFrom(_setToken, address(this), _account, uint256(_amount));
        }
    }

    function _rollbackBidToken(
        address _account,
        int256 _virtualAmount,
        address[] memory _components,
        int256[] memory _amounts
    ) internal {
        for (uint256 i = 0; i < _components.length; i++) {
            int256 totalAmount = _amounts[i];
            if (totalAmount < 0) {
                int256 amount2Transfer = totalAmount.preciseMul(_virtualAmount);
                transferFrom(
                    IERC20(_components[i]),
                    address(this),
                    _account,
                    amount2Transfer.abs()
                );
            }
        }
    }

    function _sentSetsRewards(
        ISetToken _setToken,
        address _account,
        int256 _amount
    ) internal {
        if (_amount < 0) {
            transferFrom(_setToken, address(this), _account, _amount.abs());
        }
    }

    function _sentTokenRewards(
        address _account,
        int256 _virtualAmount,
        address[] memory _components,
        int256[] memory _amounts
    ) internal {
        for (uint256 i = 0; i < _components.length; i++) {
            int256 totalAmount = _amounts[i];
            if (totalAmount > 0) {
                int256 amount2Transfer = totalAmount
                    .preciseMul(_virtualAmount)
                    .add(1); // trik, Why didn't you choose to subtract one from the time of withdrawal, because it is possible that the user will deposit multiple times, but only once withdraw.
                transferFrom(
                    IERC20(_components[i]),
                    _account,
                    address(this),
                    amount2Transfer.abs()
                );
            }
        }
    }

    function _transferBidSets(
        ISetToken _setToken,
        address _account,
        int256 _amount
    ) internal {
        if (_amount > 0) {
            transferFrom(
                _setToken,
                _account,
                address(this),
                uint256(_amount).add(1) //trik, Why didn't you choose to subtract one from the time of withdrawal, because it is possible that the user will deposit multiple times, but only once withdraw.
            );
        }
    }

    // each component tranfer if amount < 0
    function _transferBidToken(
        address _account,
        int256 _virtualAmount,
        address[] memory _components,
        int256[] memory _amounts
    ) internal {
        for (uint256 i = 0; i < _components.length; i++) {
            int256 totalAmount = _amounts[i];
            if (totalAmount < 0) {
                int256 amount2Transfer = totalAmount
                    .preciseMul(_virtualAmount)
                    .add(1); // trik, Why didn't you choose to subtract one from the time of withdrawal, because it is possible that the user will deposit multiple times, but only once withdraw.
                transferFrom(
                    IERC20(_components[i]),
                    _account,
                    address(this),
                    amount2Transfer.abs()
                );
            }
        }
    }

    function revertBidResult(
        ISetToken _setToken
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        _excutionBidResult(_setToken, false);
    }

    function passBidResult(
        ISetToken _setToken
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        _excutionBidResult(_setToken, true);
    }

    function _excutionBidResult(ISetToken _setToken, bool validated) internal {
        uint256 serialId = serialIds[_setToken];
        RebalanceInfo storage info = rebalanceInfos[_setToken][serialId];
        require(
            info.status == RebalanceStatus.PROGRESSING,
            "Bid's status must be progressing"
        );
        if (validated) {
            require(
                info.rebalanceStartTime + info.rebalanceDuration <
                    block.timestamp,
                "Not excution time"
            );
            (
                int24 winTick,
                int256 totalVirtualAmount,
                int256 lastTickVirtualAmount
            ) = _searchWinningBidTick(_setToken, serialId);
            winningBidTick[_setToken][serialId] = winTick;

            if (totalVirtualAmount > VirtualBaseAmount) {
                int256 overBidVirtualAmount = totalVirtualAmount.sub(
                    VirtualBaseAmount
                );
                exactTickAboveGetProportion[_setToken][
                    serialId
                ] = lastTickVirtualAmount.sub(overBidVirtualAmount).preciseDiv(
                    lastTickVirtualAmount
                );
            }
            info._totalVirtualAmount = totalVirtualAmount;
            info.status = RebalanceStatus.SUCCESSED;

            // for caculate
            if (totalVirtualAmount > VirtualBaseAmount) {
                totalVirtualAmount = VirtualBaseAmount;
            }

            int256 ultimatelyConsumedSets = _caculateSetsTokenNeeded(
                info._minBasePrice,
                info.priceSpacing,
                winTick,
                totalVirtualAmount
            );

            _transferTokenAndUpdatePositionState(
                _setToken,
                ultimatelyConsumedSets,
                totalVirtualAmount,
                info.rebalanceComponents,
                info.rebalanceAmounts
            );
        } else {
            info.status = RebalanceStatus.FAILURED;
            // Do nothing
        }
    }

    function _disposeSetToken(ISetToken _setToken, int256 _amount) internal {
        if (_amount > 0) {
            // burn
            _setToken.burn(address(this), uint256(_amount));
        } else if (_amount < 0) {
            // mint
            _setToken.mint(address(this), _amount.abs());
        }
    }

    function _searchWinningBidTick(
        ISetToken _setToken,
        uint256 _serialId
    )
        internal
        view
        returns (
            int24 winTick,
            int256 totalVirtualAmount,
            int256 lastTickVirtualAmount
        )
    {
        int24 maxTick = maxTicks[_setToken][_serialId];
        mapping(int16 => uint256) storage tickBitmap = tickBitmaps[_setToken][
            _serialId
        ];
        totalVirtualAmount = 0;
        winTick = maxTick;
        // if tick < 0, bid not full the pool. if tick >=0 and totalVirtualAmount >= VirtualBaseAmount, bid success.
        while (true) {
            (int24 next, bool initialize) = tickBitmap
                .nextInitializedTickWithinOneWord(winTick, 1, true);
            // Went through all the ticks and didn't get full
            if (next < 0) {
                winTick = 0;
                break;
            }
            if (initialize) {
                lastTickVirtualAmount = virtualAmountsOnTicks[_setToken][
                    _serialId
                ][winTick];
                totalVirtualAmount += lastTickVirtualAmount; // if user cancel bid, virtual amount maybe zero.
                // bid full
                if (totalVirtualAmount >= VirtualBaseAmount) {
                    break;
                }
            }
            winTick = next;
        }
    }

    function _transferTokenAndUpdatePositionState(
        ISetToken _setToken,
        int256 _setsAmount,
        int256 _virtualAmount,
        address[] memory _components,
        int256[] memory _amounts
    ) internal {
        uint256 preSetTotalSupply = _setToken.totalSupply();

        for (uint256 i = 0; i < _components.length; i++) {
            address component = _components[i];
            int256 transferAmount = _amounts[i].preciseMul(_virtualAmount);
            uint256 preTokenBalance = IERC20(component).balanceOf(
                address(_setToken)
            );
            if (transferAmount > 0) {
                _setToken.invokeTransfer(
                    component,
                    address(this),
                    uint256(transferAmount)
                );
            } else {
                IERC20(component).transfer(
                    address(_setToken),
                    transferAmount.abs()
                );
            }
            _setToken.calculateAndEditDefaultPosition(
                component,
                preSetTotalSupply,
                preTokenBalance
            );
        }
        // The two steps can be operated together
        // All component rebalance, because of sets changed
        _disposeSetToken(_setToken, _setsAmount);
        uint256 currentSetTotalSupply = _setToken.totalSupply();
        address[] memory currentComponents = _setToken.getComponents();
        for (uint256 i = 0; i < currentComponents.length; i++) {
            address component = currentComponents[i];
            uint256 tokenBalance = IERC20(component).balanceOf(
                address(_setToken)
            );
            _setToken.calculateAndEditDefaultPosition(
                component,
                currentSetTotalSupply,
                tokenBalance
            );
        }
    }

    function _updateTotalVirtualAmountsOnTick(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick,
        int256 _virtualAmount
    ) internal returns (int256 totalVirtualAmountAfter) {
        int256 totalVirtualAmountBefore = virtualAmountsOnTicks[_setToken][
            _serialId
        ][_tick];
        totalVirtualAmountAfter = totalVirtualAmountBefore + _virtualAmount;
        require(totalVirtualAmountAfter >= 0, "Nerver less than zero");
        virtualAmountsOnTicks[_setToken][_serialId][
            _tick
        ] = totalVirtualAmountAfter;
    }

    function _caculateSetsTokenNeeded(
        int256 _minBasePrice,
        int256 _priceSpacing,
        int24 _tick,
        int256 _virtualAmount
    ) internal pure returns (int256) {
        int256 targetPrice = _caculateTargetPriceWithTickAndVirtualAmount(
            _minBasePrice,
            _priceSpacing,
            _tick
        );
        return _virtualAmount.preciseMul(targetPrice);
    }

    function _caculateTargetPriceWithTickAndVirtualAmount(
        int256 _minBasePrice,
        int256 _priceSpacing,
        int24 _tick
    ) internal pure returns (int256) {
        return _minBasePrice.add(int256(_tick).mul(_priceSpacing));
    }

    function _updateMaxTick(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick
    ) internal {
        int24 lastTick = maxTicks[_setToken][_serialId];
        if (lastTick < _tick) {
            maxTicks[_setToken][_serialId] = _tick;
        }
    }

    function lock(
        ISetToken _setToken
    ) external onlyManagerAndValidSet(_setToken) {
        // lock the SetToken
        _setToken.lock();
    }

    function unlock(
        ISetToken _setToken
    ) external onlyManagerAndValidSet(_setToken) {
        // Unlock the SetToken
        _setToken.unlock();
    }

    /**
     * @param _setToken   Address of the Set Token
     */
    function initialize(
        ISetToken _setToken
    )
        external
        onlySetManager(_setToken, msg.sender)
        onlyValidAndPendingSet(_setToken)
    {
        _setToken.initializeModule();
    }

    function _validateOnlyAllowedBidTimeOrStatus(
        ISetToken _setToken
    ) internal view {
        uint256 id = serialIds[_setToken];
        RebalanceInfo memory info = rebalanceInfos[_setToken][id];
        require(
            info.status == RebalanceStatus.PROGRESSING,
            "Bid's status must be progressing"
        );
        require(
            info.rebalanceStartTime <= block.timestamp &&
                info.rebalanceStartTime + info.rebalanceDuration >=
                block.timestamp,
            "Not bidding time"
        );
    }

    /**
     * Reverts as this module should not be removable after added. Users should always
     * have a way to claim their Sets or Tokens.
     */
    function removeModule() external override {
        revert("The AuctionRebanalceIssuanceModule module cannot be removed");
    }
}
