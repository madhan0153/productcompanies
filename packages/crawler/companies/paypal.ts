// PayPal — Workday tenant.
//   https://paypal.wd1.myworkdayjobs.com/jobs
import { workdayConfig } from "./_workday.js";

export const paypalConfig = workdayConfig({
  slug:   "paypal",
  tenant: "paypal",
  pod:    "wd1",
  site:   "jobs",
});
