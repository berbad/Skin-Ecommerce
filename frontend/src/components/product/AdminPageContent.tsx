"use client";

import AddProductForm from "./AddProductForm";
import AdminProductList from "./AdminProductList";

import { useState } from "react";
import AdminProductTable from "./AdminProductTable";

export default function AdminPageContent() {
  const [refresh, setRefresh] = useState(false);

  const handleProductAdded = () => setRefresh(!refresh);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Product Manager</h1>
      <AddProductForm onProductAdded={handleProductAdded} />
      <AdminProductList refresh={refresh} />
      <AdminProductTable refresh={refresh} />
    </main>
  );
}
