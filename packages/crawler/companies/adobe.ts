// Adobe — Workday tenant.
//   https://adobe.wd5.myworkdayjobs.com/external_experienced
import { workdayConfig } from "./_workday.js";

export const adobeConfig = workdayConfig({
  slug:   "adobe",
  tenant: "adobe",
  pod:    "wd5",
  site:   "external_experienced",
});
