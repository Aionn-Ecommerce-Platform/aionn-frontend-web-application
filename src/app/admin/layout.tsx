import ConsoleLayout from "@/components/layout/ConsoleLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsoleLayout kind="admin">{children}</ConsoleLayout>;
}
