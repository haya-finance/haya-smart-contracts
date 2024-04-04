// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

import {IController} from "../../interfaces/IController.sol";
import {IIntegrationRegistry} from "../../interfaces/IIntegrationRegistry.sol";
import {IPriceOracle} from "../../interfaces/IPriceOracle.sol";
import {ISetValuer} from "../../interfaces/ISetValuer.sol";

/**
 * @title ResourceIdentifier
 * @author Set Protocol
 *
 * A collection of utility functions to fetch information related to Resource contracts in the system
 */
library ResourceIdentifier {
    // IntegrationRegistry will always be resource ID 0 in the system
    uint256 internal constant INTEGRATION_REGISTRY_RESOURCE_ID = 0;
    // PriceOracle will always be resource ID 1 in the system
    uint256 internal constant PRICE_ORACLE_RESOURCE_ID = 1;
    // SetValuer resource will always be resource ID 2 in the system
    uint256 internal constant SET_VALUER_RESOURCE_ID = 2;

    /* ============ Internal ============ */

    /**
     * Gets the instance of integration registry stored on Controller. Note: IntegrationRegistry is stored as index 0 on
     * the Controller
     */
    function getIntegrationRegistry(
        IController _controller
    ) internal view returns (IIntegrationRegistry) {
        return
            IIntegrationRegistry(
                _controller.resourceId(INTEGRATION_REGISTRY_RESOURCE_ID)
            );
    }

    /**
     * Gets instance of price oracle on Controller. Note: PriceOracle is stored as index 1 on the Controller
     */
    function getPriceOracle(
        IController _controller
    ) internal view returns (IPriceOracle) {
        return IPriceOracle(_controller.resourceId(PRICE_ORACLE_RESOURCE_ID));
    }

    /**
     * Gets the instance of Set valuer on Controller. Note: SetValuer is stored as index 2 on the Controller
     */
    function getSetValuer(
        IController _controller
    ) internal view returns (ISetValuer) {
        return ISetValuer(_controller.resourceId(SET_VALUER_RESOURCE_ID));
    }
}
