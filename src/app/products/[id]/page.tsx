import { ProductDetailView } from "@/features/catalog";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProductDetailView params={params} />;
}
