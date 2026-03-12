import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Přihlášení – Inkio CRM",
  description: "Přihlaste se do Inkio CRM systému",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
