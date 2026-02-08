/**
 * Domain types and logic.
 */

export {
  addressSchema,
  parseAddress,
  type Address,
} from "./address";

export {
  packageSchema,
  parsePackage,
  dimensionsSchema,
  weightSchema,
  type Package,
  type Dimensions,
  type Weight,
} from "./package";
