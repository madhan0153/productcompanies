// ServiceNow currently mirrors its official careers jobs through
// SmartRecruiters; the older Workday CXS endpoint now returns HTTP 422.
import { smartRecruitersConfig } from "./_smartrecruiters.js";

export const servicenowConfig = smartRecruitersConfig({
  slug: "servicenow",
  company: "ServiceNow",
  maxJobs: 700,
});
