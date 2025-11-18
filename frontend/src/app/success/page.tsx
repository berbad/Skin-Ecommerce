import { Suspense } from "react";
import SuccessPageClient from "./SuccessPageClient";

export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SuccessPageClient />
    </Suspense>
  );
}
