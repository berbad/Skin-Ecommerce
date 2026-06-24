"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/components/product/product";

export default function ProductsPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sortOption, setSortOption] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromQuery = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    setSelectedCategory(categoryFromQuery ?? "All");
  }, [categoryFromQuery]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/products");
        setProducts(res.data.products);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  let filtered =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  if (sortOption === "alphabetical") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOption === "price-low") {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (sortOption === "price-high") {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  }

  const goToProduct = (product: Product) =>
    router.push(`/products/${product._id ?? product.id}`);

  const filterButton = (label: string, value: string, href: string) => (
    <button
      key={value}
      onClick={() => router.push(href)}
      className={cn(
        "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
        selectedCategory === value
          ? "bg-brand-soft font-medium text-brand"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10">
      <aside className="hidden w-52 flex-none md:block">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Categories
        </h2>
        <div className="space-y-1">
          {filterButton("All products", "All", "/products")}
          {categories.map((cat) =>
            filterButton(cat, cat, `/products?category=${encodeURIComponent(cat)}`)
          )}
        </div>
      </aside>

      <div className="flex-1">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {selectedCategory === "All" ? "All products" : selectedCategory}
            </h1>
            {!loading && (
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {filtered.length}{" "}
                {filtered.length === 1 ? "product" : "products"}
              </p>
            )}
          </div>
          <Select onValueChange={(val: string) => setSortOption(val)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical (A–Z)</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="flex h-full flex-col">
                <Skeleton className="aspect-square w-full" />
                <CardHeader className="p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Skeleton className="h-6 w-20" />
                </CardContent>
                <CardFooter className="flex gap-2 p-4 pt-0">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-16" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center">
            <p className="text-sm text-muted-foreground">
              No products in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product._id ?? product.id}
                product={product}
                onView={goToProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
