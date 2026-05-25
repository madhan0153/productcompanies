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
// Workday-backed tenants (Phase L expansion). Each shares the generic
// _workday.ts adapter — adding more Workday employers is one file each.
import { adobeConfig } from "./adobe.js";
import { intuitConfig } from "./intuit.js";
import { uberConfig } from "./uber.js";
import { paypalConfig } from "./paypal.js";
import { servicenowConfig } from "./servicenow.js";
import { browserstackConfig } from "./browserstack.js";
// Greenhouse-backed (boards-api.greenhouse.io/v1/boards/<token>).
import { stripeConfig } from "./stripe.js";
import { inmobiConfig } from "./inmobi.js";
import { postmanConfig } from "./postman.js";
// Lever-backed (api.lever.co/v0/postings/<org>).
import { meeshoConfig } from "./meesho.js";
import { dream11Config } from "./dream11.js";
// SmartRecruiters-backed (api.smartrecruiters.com/v1/companies/<company>).
import { freshworksConfig } from "./freshworks.js";
import { unacademyConfig } from "./unacademy.js";
import { cars24Config } from "./cars24.js";
import { arcesiumConfig } from "./arcesium.js";
import { chargebeeConfig } from "./chargebee.js";
import { clevertapConfig } from "./clevertap.js";
import { delhiveryConfig } from "./delhivery.js";
import { lenskartConfig } from "./lenskart.js";
import { myntraConfig } from "./myntra.js";
import { nykaaConfig } from "./nykaa.js";
import { olaConfig } from "./ola.js";
import { paytmConfig } from "./paytm.js";
import { policybazaarConfig } from "./policybazaar.js";
import { zohoConfig } from "./zoho.js";
import { moengageConfig } from "./moengage.js";
import { nobrokerConfig } from "./nobroker.js";
import { pineLabsConfig } from "./pine-labs.js";
import { practoConfig } from "./practo.js";
import { sharechatConfig } from "./sharechat.js";
import { udaanConfig } from "./udaan.js";
import { wingifyConfig } from "./wingify.js";
import { yellowAiConfig } from "./yellow-ai.js";

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
  adobe: adobeConfig,
  intuit: intuitConfig,
  uber: uberConfig,
  paypal: paypalConfig,
  servicenow: servicenowConfig,
  browserstack: browserstackConfig,
  stripe: stripeConfig,
  inmobi: inmobiConfig,
  postman: postmanConfig,
  meesho: meeshoConfig,
  dream11: dream11Config,
  freshworks: freshworksConfig,
  unacademy: unacademyConfig,
  cars24: cars24Config,
  arcesium: arcesiumConfig,
  chargebee: chargebeeConfig,
  clevertap: clevertapConfig,
  delhivery: delhiveryConfig,
  lenskart: lenskartConfig,
  myntra: myntraConfig,
  nykaa: nykaaConfig,
  ola: olaConfig,
  paytm: paytmConfig,
  policybazaar: policybazaarConfig,
  zoho: zohoConfig,
  moengage: moengageConfig,
  nobroker: nobrokerConfig,
  "pine-labs": pineLabsConfig,
  practo: practoConfig,
  sharechat: sharechatConfig,
  udaan: udaanConfig,
  wingify: wingifyConfig,
  "yellow-ai": yellowAiConfig,
};

export const ALL_SLUGS = Object.keys(COMPANY_CONFIGS);
