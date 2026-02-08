/**
 * Structured errors for server use and API responses.
 */

export {
  CarrierErrorCode,
  CarrierIntegrationError,
  CarrierValidationError,
  CarrierUnavailableError,
  CarrierRateFetchError,
  CarrierTimeoutError,
  isCarrierIntegrationError,
  type CarrierErrorCodeType,
  type SerializedCarrierError,
} from "./carrier";
