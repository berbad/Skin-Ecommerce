"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/home/HeroSection";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { IngredientSpotlight } from "@/components/home/IngredientSpotlight";
import { ScienceStrip } from "@/components/home/ScienceStrip";
import { ProductCard } from "@/components/product/ProductCard";
import { type Product } from "@/components/product/product";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/products");
        const featured = res.data.products.filter((p: Product) => p.featured);
        setFeaturedProducts(
          featured.length > 0 ? featured : res.data.products.slice(0, 4)
        );
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const goToProduct = (product: Product) =>
    router.push(`/products/${product._id ?? product.id}`);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <HeroSection />
      <ShopByCategory />

      <section className="py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Bestsellers</h2>
          <Link href="/products" className="text-sm text-brand hover:underline">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="flex flex-col h-full">
                <Skeleton className="aspect-square w-full" />
                <CardHeader className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Skeleton className="h-6 w-20" />
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product._id ?? product.id}
                product={product}
                onView={goToProduct}
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button asChild variant="outline">
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      </section>

      <IngredientSpotlight />
      <ScienceStrip />
    </div>
  );
}
