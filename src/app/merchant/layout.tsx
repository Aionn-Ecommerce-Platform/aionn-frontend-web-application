import ConsoleLayout from "@/components/layout/ConsoleLayout";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsoleLayout kind="merchant">{children}</ConsoleLayout>;
}
