import { OrderDetailView } from "@/features/order";

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderDetailView params={params} />;
}
