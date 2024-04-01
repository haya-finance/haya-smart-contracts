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
    /* ============ Enums ============ */
    enum RebalanceStatus {
        NONE, // Indicates no rebalance action can be taken
        PROGRESSING,
        SUCCESSED,
        FAILURED
    }
    int256 public constant virtualBaseAmount = 1 ether; // Just base for caculate
    /* ============ State Variables ============ */
    mapping(ISetToken => uint256) public serialIds; // For recording rebalance serial, start at No 1.
    mapping(ISetToken => mapping(uint256 => int256)) public minPrices; // Each setup balance minimum price record.
    mapping(ISetToken => mapping(uint256 => int256)) public winningBidPrices; // Price win the bid.
    mapping(ISetToken => mapping(uint256 => RebalanceInfo))
        public rebalanceInfos; // Recorded all rebanalce info.

    mapping(ISetToken => mapping(uint256 => mapping(int16 => uint256)))
        public tickBitmaps;
    mapping(ISetToken => mapping(bytes32 => ValuePosition.Info))
        public valuePositions; // Storage user amount in tick and status claimed
    mapping(ISetToken => mapping(uint256 => mapping(int24 => uint256)))
        public sharesOnTicks;

    mapping(ISetToken => mapping(uint256 => InternalCaculateInfo))
        private internalCaculateInfos; // Recorded all caculate info.

    struct RebalanceInfo {
        RebalanceStatus status; // Status.
        int256 positionMultiplier; // Position multiplier when target units were calculated.
        uint256 rebalanceStartTime; // Unix timestamp marking the start of the rebalance.
        uint256 rebalanceDuration; // Duration of the rebalance in seconds, exp 3 days.
        address[] rebalanceComponents; // List of component tokens involved in the rebalance.
        int256[] rebalanceAmounts; // List of component tokens rebalance amounts, maybe nagtive.
        uint256 minBidAmount; // Minimum sets required for each bid.
        int256 minTotalAmountsSetsRequire; // Minimum sets required for the corresponding token quantity raised.
        int256 maxTotalAmountsSetsRequire; // Maximum sets required for the corresponding token quantity raised.
        int24 numOfPriceSegments; // For caculate rise price step or ticks from 0 ~ numOfPriceSegments.
    }

    // internal caculate to avoid duplicate calculations and save gas
    struct InternalCaculateInfo {
        int256 minBasePrice; // can be nagtive. Decimal 10**18.
        int256 maxBasePrice;
        int256 priceSpacing; // price step, caculate from `numOfPriceSegments`
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

    constructor(IController _controller) public ModuleBase(_controller) {}

    function setupRebalance(
        ISetToken _setToken,
        address[] calldata _rebalanceComponents,
        int256[] calldata _rebalanceAmounts,
        uint256 _rebalanceStartTime,
        uint256 _rebalanceDuration,
        int256 _minAmountsSetsRequire,
        int256 _maxAmountsSetsRequire,
        int24 _numOfPriceSegments
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        require(
            _rebalanceComponents.length > 0,
            "Must have at least 1 component"
        );
        require(
            _rebalanceComponents.length == _rebalanceAmounts.length,
            "Component and unit lengths must be the same"
        );
        require(
            _numOfPriceSegments > 0,
            "Num Of Price Segments must be bigger than 0"
        );
        require(
            _maxAmountsSetsRequire > _minAmountsSetsRequire,
            "max Amounts Sets Require must be bigger"
        );
        require(_setToken.isLocked(), "Sets should be locked");
        uint256 id = serialIds[_setToken];
        require(
            rebalanceInfos[_setToken][id].status != RebalanceStatus.PROGRESSING,
            "Latest bid is progressing"
        );
        serialIds[_setToken] = id.add(1);

        RebalanceInfo storage rInfo = rebalanceInfos[_setToken][id];
        rInfo.status = RebalanceStatus.PROGRESSING;
        rInfo.positionMultiplier = _setToken.positionMultiplier();
        rInfo.rebalanceStartTime = _rebalanceStartTime;
        rInfo.rebalanceDuration = _rebalanceDuration;
        rInfo.rebalanceComponents = _rebalanceComponents;
        rInfo.numOfPriceSegments = _numOfPriceSegments;

        InternalCaculateInfo storage iInfo = internalCaculateInfos[_setToken][
            id
        ];
        int256 minBasePrice = _minAmountsSetsRequire.preciseDiv(
            virtualBaseAmount
        );
        int256 maxBasePrice = _maxAmountsSetsRequire.preciseDiv(
            virtualBaseAmount
        );
        iInfo.priceSpacing = maxBasePrice.sub(minBasePrice).div(
            _numOfPriceSegments
        );
        iInfo.minBasePrice = minBasePrice;
        iInfo.maxBasePrice = maxBasePrice;
    }

    function bid(
        ISetToken _setToken,
        int24 tick,
        int256 virtualAmount
    ) external nonReentrant onlyAllowedBidTime(_setToken) {}

    function claim(
        ISetToken _setToken,
        uint256 _serialId,
        int24 tick
    ) external nonReentrant {
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        require(
            info.status == RebalanceStatus.SUCCESSED ||
                info.status == RebalanceStatus.FAILURED,
            "Bid's status must be finished status"
        );

        if (info.status == RebalanceStatus.FAILURED) {
            _bidFailedClaimAllAssets(_setToken, _serialId, msg.sender, tick);
        } else if (info.status == RebalanceStatus.SUCCESSED) {
            _bidSuccessClaimRewards(_setToken, _serialId, msg.sender, tick);
        }
    }

    function _bidFailedClaimAllAssets(
        ISetToken _setToken,
        uint256 _serialId,
        address account,
        int24 tick
    ) internal {
        ValuePosition.Info storage valuePosition = valuePositions[_setToken]
            .get(_serialId, account, tick);
        require(!valuePosition.claimed, "Already been claimed");

        // TODO: claim all assets
        // change
        valuePosition.claimed = true;
    }

    function _bidSuccessClaimRewards(
        ISetToken _setToken,
        uint256 _serialId,
        address account,
        int24 tick
    ) internal {
        ValuePosition.Info storage valuePosition = valuePositions[_setToken]
            .get(_serialId, account, tick);
        require(!valuePosition.claimed, "Already been claimed");
        // TODO: claim rewards

        valuePosition.claimed = true;
    }

    function excutionBidResult(
        ISetToken _setToken,
        bool validated
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        uint256 id = serialIds[_setToken];
        RebalanceInfo memory info = rebalanceInfos[_setToken][id];
        require(
            info.status == RebalanceStatus.PROGRESSING,
            "Bid's status must be progressing"
        );
        require(
            info.rebalanceStartTime + info.rebalanceDuration < block.timestamp,
            "Not excution time"
        );
        RebalanceStatus status = RebalanceStatus.FAILURED;
        if (validated) {
            status = RebalanceStatus.SUCCESSED;
        }
        rebalanceInfos[_setToken][id].status = status;
        _transferAndUpdatePositionState(id);
    }

    function _transferAndUpdatePositionState(uint256 id) internal {
        // TODO: transfer component token to sets or recive component token from sets
        // If component not exsit, add component to sets. not consider 0 component.
        // TODO: burn recived sets
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
        ISetToken.Position[] memory positions = _setToken.getPositions();
        for (uint256 i = 0; i < positions.length; i++) {
            ISetToken.Position memory position = positions[i];
            require(
                position.positionState == 0,
                "External positions not allowed"
            );
        }
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
