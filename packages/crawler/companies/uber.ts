// Uber — Workday tenant.
//   https://uber.wd1.myworkdayjobs.com/UberExternal
import { workdayConfig } from "./_workday.js";

export const uberConfig = workdayConfig({
  slug:   "uber",
  tenant: "uber",
  pod:    "wd1",
  site:   "UberExternal",
});
