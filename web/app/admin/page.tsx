import type { Metadata } from "next";
import { AdminAnalytics } from "../_components/admin-analytics";

export const metadata: Metadata = {
  title: "Admin Analytics",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminAnalytics />;
}
