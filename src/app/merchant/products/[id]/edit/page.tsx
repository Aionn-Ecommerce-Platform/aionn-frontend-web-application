import { MerchantProductEditView } from "@/features/merchant";

export default function MerchantProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MerchantProductEditView params={params} />;
}
