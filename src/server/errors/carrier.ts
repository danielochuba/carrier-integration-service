export const CarrierErrorCode = {
  Validation: "CARRIER_VALIDATION",
  Unavailable: "CARRIER_UNAVAILABLE",
  RateFetchFailed: "CARRIER_RATE_FETCH_FAILED",
  Timeout: "CARRIER_TIMEOUT",
} as const;

export type CarrierErrorCodeType =
  (typeof CarrierErrorCode)[keyof typeof CarrierErrorCode];

export interface SerializedCarrierError {
  code: CarrierErrorCodeType;
  message: string;
  details?: Record<string, unknown>;
}

export class CarrierIntegrationError extends Error {
  readonly code: CarrierErrorCodeType;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CarrierErrorCodeType,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CarrierIntegrationError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CarrierIntegrationError.prototype);
  }

  toJSON(): SerializedCarrierError {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && Object.keys(this.details).length > 0 && { details: this.details }),
    };
  }
}

export class CarrierValidationError extends CarrierIntegrationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(CarrierErrorCode.Validation, message, details);
    this.name = "CarrierValidationError";
    Object.setPrototypeOf(this, CarrierValidationError.prototype);
  }
}

export class CarrierUnavailableError extends CarrierIntegrationError {
  constructor(message: string = "Carrier is temporarily unavailable", details?: Record<string, unknown>) {
    super(CarrierErrorCode.Unavailable, message, details);
    this.name = "CarrierUnavailableError";
    Object.setPrototypeOf(this, CarrierUnavailableError.prototype);
  }
}

export class CarrierRateFetchError extends CarrierIntegrationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(CarrierErrorCode.RateFetchFailed, message, details);
    this.name = "CarrierRateFetchError";
    Object.setPrototypeOf(this, CarrierRateFetchError.prototype);
  }
}

export class CarrierTimeoutError extends CarrierIntegrationError {
  constructor(message: string = "Carrier request timed out", details?: Record<string, unknown>) {
    super(CarrierErrorCode.Timeout, message, details);
    this.name = "CarrierTimeoutError";
    Object.setPrototypeOf(this, CarrierTimeoutError.prototype);
  }
}

export function isCarrierIntegrationError(
  error: unknown
): error is CarrierIntegrationError {
  return error instanceof CarrierIntegrationError;
}
