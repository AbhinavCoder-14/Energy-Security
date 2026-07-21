import { redirect } from "next/navigation";

/** Canonical dashboard is /dashboard (API-bound War Room). */
export default function LiveDashboardRedirect() {
  redirect("/dashboard");
}
