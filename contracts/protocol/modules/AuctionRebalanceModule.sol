// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;
pragma experimental "ABIEncoderV2";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Invoke} from "../lib/Invoke.sol";
import {Position} from "../lib/Position.sol";
import {PreciseUnitMath} from "../../lib/PreciseUnitMath.sol";
import {ISetToken} from "../../interfaces/ISetToken.sol";
import {ModuleBase} from "../lib/ModuleBase.sol";
import {IController} from "../../interfaces/IController.sol";
import {AddressArrayUtils} from "../../lib/AddressArrayUtils.sol";
import {TickBitmap} from "../../lib/TickBitmap.sol";
import {ValuePosition} from "../../lib/ValuePosition.sol";

contract AuctionRebalanceModule is ModuleBase, ReentrancyGuard {
    using Invoke for ISetToken;
    using Position for ISetToken.Position;
    using Position for ISetToken;
    using PreciseUnitMath for int256;
    using TickBitmap for mapping(int16 => uint256);
    using ValuePosition for ValuePosition.Info;
    using ValuePosition for mapping(bytes32 => ValuePosition.Info);
    using AddressArrayUtils for address[];

    /* ============ Enums ============ */
    enum RebalanceStatus {
        NONE, // Indicates no rebalance action can be taken
        PROGRESSING,
        SUCCESSED,
        FAILURED
    }

    /* ============ Constants ============ */

    int24 internal constant MAXTICK = 32767;

    /* ============ Immutable ============ */
    int256 public immutable VIRTUAL_BASE_AMOUNT; // Just base for caculate

    /* ============ State Variables ============ */

    mapping(ISetToken => uint256) public serialIds; // For recording rebalance serial, start at No 1.
    mapping(ISetToken => mapping(uint256 => RebalanceInfo))
        public rebalanceInfos; // Recorded all rebalance info.
    mapping(ISetToken => mapping(uint256 => mapping(int16 => uint256)))
        public tickBitmaps;

    mapping(ISetToken => mapping(uint256 => int24)) public _maxTicks; // Each setup balance maximum tick record. If the highest record is cancelled, the maximum value will remain.
    mapping(ISetToken => mapping(bytes32 => ValuePosition.Info))
        private _valuePositions; // Storage user amount in tick and status claimed
    mapping(ISetToken => mapping(uint256 => mapping(int24 => int256)))
        private _virtualAmountsOnTicks; // The total amount reserved on each tick
    // This variable can only be set if it is overrecruited
    mapping(ISetToken => mapping(uint256 => int256))
        private _exactTickAboveGetProportion; // The percentage of tokens that users who are bid at exact tick will be able to acquire 10% = 0.1*10**18
    mapping(ISetToken => mapping(uint256 => int24)) private _winningBidTick; // Price win the bid. If win tick = 0, bid may not get full. _totalVirtualAmount will be sign.

    /* ============ Structs ============ */
    struct RebalanceInfo {
        RebalanceStatus status; // Status.
        uint256 rebalanceStartTime; // Unix timestamp marking the start of the rebalance.
        uint256 rebalanceDuration; // Duration of the rebalance in seconds, exp 3 days.
        address[] rebalanceComponents; // List of component tokens involved in the rebalance.
        int256[] rebalanceAmounts; // List of component tokens rebalance amounts, maybe nagtive.
        int256 minBidVirtualAmount; // Minimum sets required for each bid.
        int256 priceSpacing;
        int256 minBasePrice; // Can be nagtive. Decimal 10**18.
        // _totalVirtualAmount > VIRTUAL_BASE_AMOUNT: overrecruited.
        int256 _totalVirtualAmount; //  When the bid is not completed, the final total virtual amount. Also save gas.
    }

    /* ============ Modifiers ============ */

    modifier onlyAllowedBidTime(ISetToken _setToken) {
        _validateOnlyAllowedBidTimeOrStatus(_setToken);
        _;
    }

    /* ============ Events ============ */
    event AuctionSetuped(address indexed _setToken, uint256 _serialId);

    // If the auction result is successful, the winning tick will have a value
    event AuctionResultSet(
        address indexed _setToken,
        uint256 _serialId,
        bool _isSuccess,
        int24 _winTick
    );
    event Bid(
        address indexed _setToken,
        address indexed _account,
        uint256 _serialId,
        int24 _tick,
        int256 _virtualAmount
    );
    event CancelBid(
        address indexed _setToken,
        address indexed _account,
        uint256 _serialId,
        int24 _tick,
        int256 _virtualAmount
    );
    event Claim(
        address indexed _setToken,
        address indexed _account,
        uint256 _serialId,
        int24 _tick
    );

    /* ============ Constructor ============ */
    constructor(IController _controller) public ModuleBase(_controller) {
        VIRTUAL_BASE_AMOUNT = PreciseUnitMath.preciseUnitInt();
    }

    /* ============ External Functions ============ */

    /**
     * @notice  The manager initiates the auction.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation.
     * @param   _rebalanceComponents  The token address that needs to be auctioned.
     * @param   _rebalanceAmounts  The number of auctions, the positive number is for the tokens sold, and the negative number is the revenue tokens.
     * @param   _rebalanceStartTime  The time when the auction started.
     * @param   _rebalanceDuration  Auction duration, in seconds.
     * @param   _targetAmountsSets  The minimum number of sets expected to be received.
     * @param   _minBidVirtualAmount  The minimum number of sets required at a time.
     * @param   _priceSpacing  Price Minimum Interval.
     */

    function setupAuction(
        ISetToken _setToken,
        address[] memory _rebalanceComponents,
        int256[] memory _rebalanceAmounts,
        uint256 _rebalanceStartTime,
        uint256 _rebalanceDuration,
        int256 _targetAmountsSets,
        int256 _minBidVirtualAmount,
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
        uint256 serialId = serialIds[_setToken];
        require(
            rebalanceInfos[_setToken][serialId].status !=
                RebalanceStatus.PROGRESSING,
            "Latest bid is progressing"
        );
        serialId = serialId.add(1);
        serialIds[_setToken] = serialId;

        RebalanceInfo storage info = rebalanceInfos[_setToken][serialId];
        info.status = RebalanceStatus.PROGRESSING;
        info.rebalanceStartTime = _rebalanceStartTime;
        info.rebalanceDuration = _rebalanceDuration;
        info.rebalanceComponents = _rebalanceComponents;
        info.rebalanceAmounts = _rebalanceAmounts;
        info.minBidVirtualAmount = _minBidVirtualAmount;
        info.priceSpacing = _priceSpacing;
        info.minBasePrice = _targetAmountsSets.preciseDiv(VIRTUAL_BASE_AMOUNT);
        emit AuctionSetuped(address(_setToken), serialId);
    }

    /**
     * @notice  The auction failed.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     */
    function setAuctionResultFailed(
        ISetToken _setToken
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        _excutionBidResult(_setToken, false);
    }

    /**
     * @notice  Confirm the success of the auction after the auction is closed.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     */
    function setAuctionResultSuccess(
        ISetToken _setToken
    ) external nonReentrant onlyManagerAndValidSet(_setToken) {
        _excutionBidResult(_setToken, true);
    }

    /**
     * @notice  Auctions are conducted in bulk.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _ticks  The minimum price is used as the criterion to interval the number of spaces.
     * @param   _virtualAmounts  The number of auctions can be taken as a percentage.
     */
    function batchBid(
        ISetToken _setToken,
        int24[] memory _ticks,
        int256[] memory _virtualAmounts
    )
        external
        nonReentrant
        onlyValidAndInitializedSet(_setToken)
        onlyAllowedBidTime(_setToken)
    {
        require(_ticks.length > 0, "Must have at least 1 tick");
        require(
            _ticks.length == _virtualAmounts.length,
            "Ticks and virtualAmounts lengths must be the same"
        );
        for (uint256 i = 0; i < _ticks.length; i++) {
            _bid(_setToken, _ticks[i], _virtualAmounts[i]);
        }
    }

    /**
     * @notice  The user participates in the operation of the auction during the auction phase.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     * @param   _virtualAmount  The number of auctions can be taken as a percentage.
     */
    function bid(
        ISetToken _setToken,
        int24 _tick,
        int256 _virtualAmount
    )
        external
        nonReentrant
        onlyValidAndInitializedSet(_setToken)
        onlyAllowedBidTime(_setToken)
    {
        _bid(_setToken, _tick, _virtualAmount);
    }

    /**
     * @notice  Cancel in bulk.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _ticks  The minimum price is used as the criterion to interval the number of spaces.
     */
    function batchCancelBid(
        ISetToken _setToken,
        int24[] memory _ticks
    )
        external
        nonReentrant
        onlyValidAndInitializedSet(_setToken)
        onlyAllowedBidTime(_setToken)
    {
        require(_ticks.length > 0, "Must have at least 1 tick");
        for (uint256 i = 0; i < _ticks.length; i++) {
            _cancelBid(_setToken, _ticks[i]);
        }
    }

    /**
     * @notice  While the auction is in progress, the user can choose to cancel the auction and return the mortgage for the auction.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     */
    function cancelBid(
        ISetToken _setToken,
        int24 _tick
    )
        external
        nonReentrant
        onlyValidAndInitializedSet(_setToken)
        onlyAllowedBidTime(_setToken)
    {
        _cancelBid(_setToken, _tick);
    }

    // There is no check of setToken legitimacy here
    // The expectation is that you will be able to claim historical transactions even if the module is removed
    /**
     * @notice  Perform claim operations in batches.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialIds  The serial number of the auction, in increments.
     * @param   _ticks  The minimum price is used as the criterion to interval the number of spaces.
     */
    function batchClaim(
        ISetToken _setToken,
        uint256[] memory _serialIds,
        int24[] memory _ticks
    ) external nonReentrant {
        require(_serialIds.length > 0, "Must have at least 1 serial id");
        require(
            _serialIds.length == _ticks.length,
            "Ticks and serial ids lengths must be the same"
        );
        for (uint256 i = 0; i < _serialIds.length; i++) {
            _claim(_setToken, _serialIds[i], _ticks[i]);
        }
    }

    /**
     * @notice  Collect the auction results, and return the auction if the auction does not win the bid or the auction fails.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialId  The serial number of the auction, in increments.
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     */
    function claim(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick
    ) external nonReentrant {
        _claim(_setToken, _serialId, _tick);
    }

    /**
     * @notice  If you want to start the auction, you need to lock the sets in advance, and unlock them when the auction ends, which needs to be operated by the manager.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     */
    function lock(
        ISetToken _setToken
    ) external onlyManagerAndValidSet(_setToken) {
        // lock the SetToken
        _setToken.lock();
    }

    /**
     * @notice  If you want to start the auction, you need to lock the sets in advance, and unlock them when the auction ends, which needs to be operated by the manager.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     */
    function unlock(
        ISetToken _setToken
    ) external onlyManagerAndValidSet(_setToken) {
        // Unlock the SetToken
        _setToken.unlock();
    }

    /**
     * @notice  Initialize the module.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
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

    /**
     * @notice  .
     * @dev     .
     */
    function removeModule() external override {
        ISetToken setToken = ISetToken(msg.sender);
        uint256 serialId = serialIds[setToken];
        require(
            rebalanceInfos[setToken][serialId].status !=
                RebalanceStatus.PROGRESSING,
            "Latest bid is progressing"
        );
    }

    /* ============ External View Functions ============ */

    /**
     * @notice  Get the number of sets or rewards based on the virtual quantity of the target.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialId  The serial number of the auction, in increments.
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     * @param   _virtualAmount  The fictitious amount is a proportion, convenient to calculate, and the base is a standard unit.
     * @return  amount  If the amount is positive, it needs to be transferred, and if it is negative, it is the amount of rewards.
     */
    function getRequiredOrRewardsSetsAmountsOnTickForBid(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick,
        int256 _virtualAmount
    ) external view returns (int256 amount) {
        require(_virtualAmount > 0, "Virtual amount must be positive number");
        require(_tick >= 0, "Tick need be bigger than 0");
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        amount = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
            info.minBasePrice,
            info.priceSpacing,
            _tick,
            _virtualAmount
        );
        if (amount >= 0) {
            amount = amount.add(1);
        }
    }

    /**
     * @notice  Get the actual number of auction tokens based on the target virtual quantity.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialId  The serial number of the auction, in increments.
     * @param   _virtualAmount  The fictitious amount is a proportion, convenient to calculate, and the base is a standard unit.
     * @return  components  List of addresses of components for tranfer or send.
     * @return  amounts  If the amount is positive, contract send to user, and if it is negative, user send to contract.
     */
    function getRequiredOrRewardComponentsAndAmountsForBid(
        ISetToken _setToken,
        uint256 _serialId,
        int256 _virtualAmount
    )
        external
        view
        returns (address[] memory components, int256[] memory amounts)
    {
        require(_virtualAmount > 0, "Virtual amount must be positive number");
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        components = info.rebalanceComponents;
        int256[] memory rebalanceAmounts = info.rebalanceAmounts;
        uint256 componentsLength = components.length;
        amounts = new int256[](componentsLength);
        for (uint256 i = 0; i < componentsLength; i++) {
            int256 amount = rebalanceAmounts[i].preciseMul(_virtualAmount);
            if (amount < 0) {
                amounts[i] = amount.add(-1);
            } else {
                amounts[i] = amount;
            }
        }
    }

    /**
     * @notice  Get the tick that won the bid.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialId  The serial number of the auction, in increments.
     * @return  winTick  Winning bid tick.
     */
    function getFinalWinningTick(
        ISetToken _setToken,
        uint256 _serialId
    ) external view returns (int24 winTick) {
        winTick = _winningBidTick[_setToken][_serialId];
    }

    /**
     * @notice  Dynamically calculates the tick that wins the bid in real time.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialId  The serial number of the auction, in increments.
     * @return  winTick  .
     * @return  totalVirtualAmount  .
     * @return  lastTickVirtualAmount  .
     */
    function getPreCalculatedWinningTick(
        ISetToken _setToken,
        uint256 _serialId
    )
        external
        view
        returns (
            int24 winTick,
            int256 totalVirtualAmount,
            int256 lastTickVirtualAmount
        )
    {
        (
            winTick,
            totalVirtualAmount,
            lastTickVirtualAmount
        ) = _searchWinningBidTick(_setToken, _serialId);
    }

    /**
     * @notice  Get the total number of bids a user has made on a tick.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation..
     * @param   _serialId  The serial number of the auction, in increments.
     * @param   _account  Bidder account address.
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     * @return  int256  Returns the total amount the user invested on a tick.
     */
    function getAccountTotalVirtualAmountOnTick(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick
    ) external view returns (int256) {
        return
            _getAccountVirtualAmountOnTick(
                _setToken,
                _serialId,
                _account,
                _tick
            );
    }

    /**
     * @notice  Get the total number of bids on a tick.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation.
     * @param   _serialId  The serial number of the auction, in increments.
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     * @return  int256  Returns the total number of bids on a tick.
     */
    function getTotalVirtualAmountsOnTick(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick
    ) external view returns (int256) {
        return _virtualAmountsOnTicks[_setToken][_serialId][_tick];
    }

    /**
     * @notice  Get the proportion of users who actually win bids.
     * @dev     .
     * @param   _setToken  The target sets contract address of the operation.
     * @param   _serialId  The serial number of the auction, in increments.
     * @param   _account  Bidder account address.
     * @param   _tick  The minimum price is used as the criterion to interval the number of spaces.
     * @return  int256  Returns the number of virtual bids won by actual users.
     */
    function getActualBiddedVirtualAmount(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick
    ) external view returns (int256) {
        require(_tick >= 0, "Tick need be bigger than 0");
        (
            int24 winTick,
            int256 totalVirtualAmount,
            int256 lastTickVirtualAmount
        ) = _searchWinningBidTick(_setToken, _serialId);
        int256 exactTickProportion = VIRTUAL_BASE_AMOUNT;
        if (totalVirtualAmount > VIRTUAL_BASE_AMOUNT && winTick == _tick) {
            int256 overBidVirtualAmount = totalVirtualAmount.sub(
                VIRTUAL_BASE_AMOUNT
            );
            exactTickProportion = lastTickVirtualAmount
                .sub(overBidVirtualAmount)
                .preciseDiv(lastTickVirtualAmount);
        }
        if (_tick < winTick) {
            return 0;
        }
        int256 accountVirtualAmount = _getAccountVirtualAmountOnTick(
            _setToken,
            _serialId,
            _account,
            _tick
        );
        return accountVirtualAmount.preciseMul(exactTickProportion);
    }

    /* ============ Internal Functions ============ */

    function _bid(
        ISetToken _setToken,
        int24 _tick,
        int256 _virtualAmount
    ) internal {
        require(_tick >= 0, "Tick need be bigger than 0");
        require(_tick <= MAXTICK, "Tick too big");
        uint256 serialId = serialIds[_setToken];
        RebalanceInfo storage info = rebalanceInfos[_setToken][serialId];
        require(
            _virtualAmount >= info.minBidVirtualAmount,
            "Virtual quantity not meeting the requirements"
        );
        int256 setsTokenAmountNeeded = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
                info.minBasePrice,
                info.priceSpacing,
                _tick,
                _virtualAmount
            );

        // tranfer token if needed
        _transferBidSets(_setToken, msg.sender, setsTokenAmountNeeded);
        _transferBidToken(
            msg.sender,
            _virtualAmount,
            info.rebalanceComponents,
            info.rebalanceAmounts
        );

        ValuePosition.Info storage _valuePosition = _valuePositions[_setToken]
            .get(serialId, msg.sender, _tick);
        _valuePosition.add(_virtualAmount);

        mapping(int16 => uint256) storage tickBitmap = tickBitmaps[_setToken][
            serialId
        ];
        // make sure this tick 0
        (int24 next, bool inited) = tickBitmap.nextInitializedTickWithinOneWord(
            _tick,
            1,
            true
        );
        if (!(inited && next == _tick)) {
            tickBitmap.flipTick(_tick, 1);
        }
        _updateTotalVirtualAmountsOnTick(
            _setToken,
            serialId,
            _tick,
            _virtualAmount
        );
        _updateMaxTick(_setToken, serialId, _tick);
        emit Bid(
            address(_setToken),
            msg.sender,
            serialId,
            _tick,
            _virtualAmount
        );
    }

    function _cancelBid(ISetToken _setToken, int24 _tick) internal {
        require(_tick >= 0, "Tick need be bigger than 0");
        uint256 serialId = serialIds[_setToken];
        ValuePosition.Info storage _valuePosition = _valuePositions[_setToken]
            .get(serialId, msg.sender, _tick);
        int256 virtualAmount = _valuePosition.virtualAmount;
        _valuePosition.sub(virtualAmount);
        require(virtualAmount > 0, "There is no corresponding asset");
        RebalanceInfo memory info = rebalanceInfos[_setToken][serialId];
        int256 setsTokenAmountNeeded = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
                info.minBasePrice,
                info.priceSpacing,
                _tick,
                virtualAmount
            );

        _rollbackBidSets(_setToken, msg.sender, setsTokenAmountNeeded);
        _rollbackBidToken(
            msg.sender,
            virtualAmount,
            info.rebalanceComponents,
            info.rebalanceAmounts
        );
        int256 afterRollback = _updateTotalVirtualAmountsOnTick(
            _setToken,
            serialId,
            _tick,
            virtualAmount.neg()
        );

        if (afterRollback == 0) {
            mapping(int16 => uint256) storage tickBitmap = tickBitmaps[
                _setToken
            ][serialId];
            tickBitmap.flipTick(_tick, 1);
        }
        emit CancelBid(
            address(_setToken),
            msg.sender,
            serialId,
            _tick,
            virtualAmount
        );
    }

    function _claim(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick
    ) internal {
        require(_tick >= 0, "Tick need be bigger than 0");
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        require(
            info.status == RebalanceStatus.SUCCESSED ||
                info.status == RebalanceStatus.FAILURED,
            "Bid's status must be finished status"
        );

        ValuePosition.Info storage _valuePosition = _valuePositions[_setToken]
            .get(_serialId, msg.sender, _tick);
        require(!_valuePosition.claimed, "Already been claimed");
        int256 virtualAmount = _valuePosition.virtualAmount;
        require(virtualAmount > 0, "There is no corresponding asset");
        _valuePosition.claimed = true;

        if (info.status == RebalanceStatus.FAILURED) {
            _bidRollbackAllAssets(
                _setToken,
                _serialId,
                msg.sender,
                _tick,
                virtualAmount
            );
        } else if (info.status == RebalanceStatus.SUCCESSED) {
            _bidSuccessClaimRewards(
                _setToken,
                _serialId,
                msg.sender,
                _tick,
                virtualAmount
            );
        }
        emit Claim(address(_setToken), msg.sender, _serialId, _tick);
    }

    function _bidRollbackAllAssets(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick,
        int256 _virtualAmount
    ) internal {
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        int256 setsTokenAmountNeeded = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
                info.minBasePrice,
                info.priceSpacing,
                _tick,
                _virtualAmount
            );
        _rollbackBidSets(_setToken, _account, setsTokenAmountNeeded);
        _rollbackBidToken(
            _account,
            _virtualAmount,
            info.rebalanceComponents,
            info.rebalanceAmounts
        );
    }

    function _bidSuccessClaimRewards(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick,
        int256 _virtualAmount
    ) internal {
        RebalanceInfo memory info = rebalanceInfos[_setToken][_serialId];
        int256 setsTokenAmountNeeded = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
                info.minBasePrice,
                info.priceSpacing,
                _tick,
                _virtualAmount
            );
        int24 winTick = _winningBidTick[_setToken][_serialId];

        if (_tick < winTick) {
            // no win bid
            _rollbackBidSets(_setToken, _account, setsTokenAmountNeeded);
            _rollbackBidToken(
                _account,
                _virtualAmount,
                info.rebalanceComponents,
                info.rebalanceAmounts
            );
        } else {
            int256 biddedVirtualAmount = _virtualAmount;
            if (
                info._totalVirtualAmount > VIRTUAL_BASE_AMOUNT &&
                winTick == _tick
            ) {
                biddedVirtualAmount = _exactTickAboveGetProportion[_setToken][
                    _serialId
                ].preciseMul(_virtualAmount);
            }
            int256 ultimatelyConsumedSets = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
                    info.minBasePrice,
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
                _virtualAmount.sub(biddedVirtualAmount),
                info.rebalanceComponents,
                info.rebalanceAmounts
            );

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
            IERC20(_setToken).transfer(_account, uint256(_amount));
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
                IERC20(_components[i]).transfer(
                    _account,
                    amount2Transfer.abs()
                );
            }
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
                int256 amount2Transfer = totalAmount.preciseMul(_virtualAmount);

                IERC20(_components[i]).transfer(
                    _account,
                    amount2Transfer.toUint256()
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
                    .add(-1); // trik, Why didn't you choose to subtract one from the time of withdrawal, because it is possible that the user will deposit multiple times, but only once withdraw.
                transferFrom(
                    IERC20(_components[i]),
                    _account,
                    address(this),
                    amount2Transfer.abs()
                );
            }
        }
    }

    function _excutionBidResult(ISetToken _setToken, bool validated) internal {
        uint256 serialId = serialIds[_setToken];
        RebalanceInfo storage info = rebalanceInfos[_setToken][serialId];
        require(
            info.status == RebalanceStatus.PROGRESSING,
            "Auction status must be progressing"
        );
        int24 winTickRecord;
        if (validated) {
            require(
                info.rebalanceStartTime + info.rebalanceDuration <=
                    block.timestamp,
                "Not excution time"
            );
            (
                int24 winTick,
                int256 totalVirtualAmount,
                int256 lastTickVirtualAmount
            ) = _searchWinningBidTick(_setToken, serialId);

            winTickRecord = winTick;
            if (totalVirtualAmount > VIRTUAL_BASE_AMOUNT) {
                int256 overBidVirtualAmount = totalVirtualAmount.sub(
                    VIRTUAL_BASE_AMOUNT
                );
                _exactTickAboveGetProportion[_setToken][
                    serialId
                ] = lastTickVirtualAmount.sub(overBidVirtualAmount).preciseDiv(
                    lastTickVirtualAmount
                );
            }
            info._totalVirtualAmount = totalVirtualAmount;
            info.status = RebalanceStatus.SUCCESSED;
            _winningBidTick[_setToken][serialId] = winTick;
            // for caculate
            if (totalVirtualAmount > VIRTUAL_BASE_AMOUNT) {
                totalVirtualAmount = VIRTUAL_BASE_AMOUNT;
            }

            int256 ultimatelyConsumedSets = _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
                    info.minBasePrice,
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
        emit AuctionResultSet(
            address(_setToken),
            serialId,
            validated,
            winTickRecord
        );
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
    ) internal view returns (int24, int256, int256) {
        int24 maxTick = _maxTicks[_setToken][_serialId];
        mapping(int16 => uint256) storage tickBitmap = tickBitmaps[_setToken][
            _serialId
        ];
        int24 currentTick = maxTick;
        int24 winTick = maxTick;
        int256 totalVirtualAmount = 0;
        int256 lastTickVirtualAmount = 0;
        // if tick < 0, bid not full the pool. if tick >=0 and totalVirtualAmount >= VIRTUAL_BASE_AMOUNT, bid success.
        while (totalVirtualAmount < VIRTUAL_BASE_AMOUNT) {
            (int24 next, bool inited) = tickBitmap
                .nextInitializedTickWithinOneWord(currentTick, 1, true);
            // Went through all the ticks and didn't get full
            if (inited) {
                lastTickVirtualAmount = _virtualAmountsOnTicks[_setToken][
                    _serialId
                ][next];
                totalVirtualAmount += lastTickVirtualAmount; // if user cancel bid, virtual amount maybe zero.
                winTick = next;
            }
            currentTick = next - 1;
            if (currentTick < 0) {
                winTick = 0;
                break;
            }
        }
        return (winTick, totalVirtualAmount, lastTickVirtualAmount);
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

        _disposeSetToken(_setToken, _setsAmount);
        uint256 currentSetTotalSupply = _setToken.totalSupply();
        int256 newPositionMultiplier = _setToken
            .positionMultiplier()
            .mul(preSetTotalSupply.toInt256())
            .div(currentSetTotalSupply.toInt256());
        _setToken.editPositionMultiplier(newPositionMultiplier);
    }

    function _updateTotalVirtualAmountsOnTick(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick,
        int256 _virtualAmount
    ) internal returns (int256 totalVirtualAmountAfter) {
        int256 totalVirtualAmountBefore = _virtualAmountsOnTicks[_setToken][
            _serialId
        ][_tick];
        totalVirtualAmountAfter = totalVirtualAmountBefore + _virtualAmount;
        require(totalVirtualAmountAfter >= 0, "Nerver less than zero");
        _virtualAmountsOnTicks[_setToken][_serialId][
            _tick
        ] = totalVirtualAmountAfter;
    }

    function _getAccountVirtualAmountOnTick(
        ISetToken _setToken,
        uint256 _serialId,
        address _account,
        int24 _tick
    ) internal view returns (int256) {
        ValuePosition.Info memory _valuePosition = _valuePositions[_setToken]
            .get(_serialId, _account, _tick);
        return _valuePosition.virtualAmount;
    }

    function _caculateRequiredOrRewardsSetsAmountsOnTickForBid(
        int256 minBasePrice,
        int256 _priceSpacing,
        int24 _tick,
        int256 _virtualAmount
    ) internal pure returns (int256) {
        int256 targetPrice = _caculateTargetPriceWithTick(
            minBasePrice,
            _priceSpacing,
            _tick
        );
        return _virtualAmount.preciseMul(targetPrice);
    }

    function _caculateTargetPriceWithTick(
        int256 minBasePrice,
        int256 _priceSpacing,
        int24 _tick
    ) internal pure returns (int256) {
        return minBasePrice.add(int256(_tick).mul(_priceSpacing));
    }

    function _updateMaxTick(
        ISetToken _setToken,
        uint256 _serialId,
        int24 _tick
    ) internal {
        int24 lastTick = _maxTicks[_setToken][_serialId];
        if (lastTick < _tick) {
            _maxTicks[_setToken][_serialId] = _tick;
        }
    }

    /* ============== Modifier Helpers =============== */

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
                info.rebalanceStartTime + info.rebalanceDuration >
                block.timestamp,
            "Not bidding time"
        );
    }
}
