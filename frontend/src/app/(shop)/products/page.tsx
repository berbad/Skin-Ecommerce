import { Suspense } from "react";
import ProductsPageClient from "./ProductsPageClient";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading products...</div>}>
      <ProductsPageClient />
    </Suspense>
  );
}
