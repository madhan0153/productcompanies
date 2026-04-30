import type { CompanyConfig } from "./_types.js";
import { googleConfig } from "./google.js";
import { microsoftConfig } from "./microsoft.js";
import { metaConfig } from "./meta.js";
import { amazonConfig } from "./amazon.js";
import { appleConfig } from "./apple.js";
import { atlassianConfig } from "./atlassian.js";
import { nvidiaConfig } from "./nvidia.js";
import { oracleConfig } from "./oracle.js";
import { salesforceConfig } from "./salesforce.js";
import { sapLabsConfig } from "./sap-labs.js";
import { razorpayConfig } from "./razorpay.js";
import { phonepeConfig } from "./phonepe.js";
import { zerodhaConfig } from "./zerodha.js";
import { credConfig } from "./cred.js";
import { growwConfig } from "./groww.js";
import { swiggyConfig } from "./swiggy.js";
import { zomatoConfig } from "./zomato.js";
import { flipkartConfig } from "./flipkart.js";

export const COMPANY_CONFIGS: Record<string, CompanyConfig> = {
  google: googleConfig,
  microsoft: microsoftConfig,
  meta: metaConfig,
  amazon: amazonConfig,
  apple: appleConfig,
  atlassian: atlassianConfig,
  nvidia: nvidiaConfig,
  oracle: oracleConfig,
  salesforce: salesforceConfig,
  "sap-labs": sapLabsConfig,
  razorpay: razorpayConfig,
  phonepe: phonepeConfig,
  zerodha: zerodhaConfig,
  cred: credConfig,
  groww: growwConfig,
  swiggy: swiggyConfig,
  zomato: zomatoConfig,
  flipkart: flipkartConfig,
};

export const ALL_SLUGS = Object.keys(COMPANY_CONFIGS);
