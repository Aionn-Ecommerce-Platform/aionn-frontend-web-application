import { MerchantStoreView } from "@/features/merchant";

export default function MerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MerchantStoreView params={params} />;
}
