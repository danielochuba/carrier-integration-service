import type { Address, Package, RateRequest } from "@/src/server/domain";

const PACKAGING_TYPE_CODE = "02";
const PACKAGING_TYPE_DESC = "Package";
const PAYMENT_TYPE = "01";
const WEIGHT_LBS = "LBS";
const WEIGHT_KGS = "KGS";
const DIM_IN = "IN";
const DIM_CM = "CM";

export interface UpsAddress {
  AddressLine: string[];
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
}

export interface UpsPackage {
  PackagingType: {
    Code: string;
    Description: string;
  };
  Dimensions: {
    UnitOfMeasurement: { Code: string; Description: string };
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: { Code: string; Description: string };
    Weight: string;
  };
}

export interface UpsRateRequestPayload {
  RateRequest: {
    Request: {
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: {
        Name: string;
        Address: UpsAddress;
      };
      ShipTo: {
        Name: string;
        Address: UpsAddress;
      };
      ShipFrom: {
        Name: string;
        Address: UpsAddress;
      };
      PaymentDetails: {
        ShipmentCharge: Array<{
          Type: string;
          BillShipper: { AccountNumber: string };
        }>;
      };
      Service?: { Code: string; Description: string };
      NumOfPieces: string;
      Package: UpsPackage | UpsPackage[];
    };
  };
}

function mapAddressToUps(address: Address): UpsAddress {
  const lines: string[] = [address.addressLine1];
  if (address.addressLine2) lines.push(address.addressLine2);
  return {
    AddressLine: lines,
    City: address.city,
    StateProvinceCode: address.stateOrProvinceCode,
    PostalCode: address.postalCode,
    CountryCode: address.countryCode,
  };
}

function mapPackageToUps(pkg: Package): UpsPackage {
  const weightCode = pkg.weight.unit === "lb" ? WEIGHT_LBS : WEIGHT_KGS;
  const dimCode = pkg.dimensions?.unit === "in" ? DIM_IN : DIM_CM;

  const dimensions = pkg.dimensions
    ? {
        UnitOfMeasurement: { Code: dimCode, Description: dimCode === DIM_IN ? "Inches" : "Centimeters" },
        Length: String(pkg.dimensions.length),
        Width: String(pkg.dimensions.width),
        Height: String(pkg.dimensions.height),
      }
    : {
        UnitOfMeasurement: { Code: DIM_IN, Description: "Inches" },
        Length: "1",
        Width: "1",
        Height: "1",
      };

  return {
    PackagingType: { Code: PACKAGING_TYPE_CODE, Description: PACKAGING_TYPE_DESC },
    Dimensions: dimensions,
    PackageWeight: {
      UnitOfMeasurement: { Code: weightCode, Description: weightCode },
      Weight: String(pkg.weight.value),
    },
  };
}

export function mapRateRequestToUpsPayload(request: RateRequest): UpsRateRequestPayload {
  const originAddr = mapAddressToUps(request.origin);
  const destAddr = mapAddressToUps(request.destination);

  const upsPackages = request.packages.map(mapPackageToUps);
  const packageField = upsPackages.length === 1 ? upsPackages[0]! : upsPackages;

  const shipment = {
    Shipper: {
      Name: request.origin.addressLine1,
      Address: originAddr,
    },
    ShipTo: {
      Name: request.destination.addressLine1,
      Address: destAddr,
    },
    ShipFrom: {
      Name: request.origin.addressLine1,
      Address: originAddr,
    },
    PaymentDetails: {
      ShipmentCharge: [
        { Type: PAYMENT_TYPE, BillShipper: { AccountNumber: "" } },
      ],
    },
    ...(request.serviceLevel && {
      Service: { Code: request.serviceLevel, Description: request.serviceLevel },
    }),
    NumOfPieces: String(request.packages.length),
    Package: packageField,
  };

  return {
    RateRequest: {
      Request: {},
      Shipment: shipment,
    },
  };
}
