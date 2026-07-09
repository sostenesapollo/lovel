import type { Metadata } from "next";
import ListTablePage from "./page-client";

export const metadata: Metadata = {
  title: "Admin — LOVEL",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ListTablePage />;
}
