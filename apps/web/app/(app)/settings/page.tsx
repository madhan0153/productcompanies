import { redirect } from "next/navigation";

// /settings has no content of its own — redirect to the Privacy sub-page.
export default function SettingsPage() {
  redirect("/settings/privacy");
}
