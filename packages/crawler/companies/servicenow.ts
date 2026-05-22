// ServiceNow — Workday tenant.
//   https://servicenow.wd1.myworkdayjobs.com/External_Career_Site
import { workdayConfig } from "./_workday.js";

export const servicenowConfig = workdayConfig({
  slug:   "servicenow",
  tenant: "servicenow",
  pod:    "wd1",
  site:   "External_Career_Site",
});
