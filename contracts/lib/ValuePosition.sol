// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.6.10;

library ValuePosition {
    // info stored for each user's bid value
    struct Info {
        // the amount of bid owned by this position
        int256 virtualAmount;
        // bid assets or rewards be claimed, status success or failed
        bool claimed;
    }

    function get(
        mapping(bytes32 => Info) storage self,
        uint256 serialId,
        address owner,
        int24 tick
    ) internal view returns (ValuePosition.Info storage position) {
        position = self[keccak256(abi.encodePacked(serialId, owner, tick))];
    }

    function add(
        Info storage self,
        int256 virtualAmount
    ) internal returns (int256 virtualAmountAfter) {
        int256 virtualAmountBefore = self.virtualAmount;
        int256 virtualAmountAfter = virtualAmountBefore + virtualAmount;
        self.virtualAmount = virtualAmountAfter;
    }

    function sub(
        Info storage self,
        int256 virtualAmount
    ) internal returns (int256 virtualAmountAfter) {
        int256 virtualAmountBefore = self.virtualAmount;
        int256 virtualAmountAfter = virtualAmountBefore - virtualAmount;
        self.virtualAmount = virtualAmountAfter;
    }
    function setClaimed(Info storage self) internal {
        self.claimed = true;
    }
}
