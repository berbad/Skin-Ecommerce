"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import { normalizeImageSrc } from "@/lib/images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { HeroSection } from "@/components/home/HeroSection";
import { ShopByCategory } from "@/components/home/ShopByCategory";
import { IngredientSpotlight } from "@/components/home/IngredientSpotlight";
import { ScienceStrip } from "@/components/home/ScienceStrip";
import { ProductCard } from "@/components/product/ProductCard";
import { addToCart, type Product } from "@/components/product/product";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState("");

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
                onView={setSelectedProduct}
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

      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-4xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close product details"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-6 pr-8">
                {selectedProduct.name}
              </h2>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-64 flex-shrink-0">
                  <img
                    onClick={() => {
                      setZoomedImageSrc(
                        normalizeImageSrc(selectedProduct.image)
                      );
                      setIsZoomed(true);
                    }}
                    src={normalizeImageSrc(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-auto object-cover rounded cursor-zoom-in transition-transform duration-200 hover:scale-105"
                  />
                </div>
                <div className="flex-1 space-y-4 text-sm text-gray-700">
                  <p className="text-muted-foreground">
                    {selectedProduct.description}
                  </p>
                  <div>
                    <span className="font-semibold">Price:</span> $
                    {selectedProduct.price.toFixed(2)}
                  </div>
                  {selectedProduct.category && (
                    <div>
                      <span className="font-semibold">Category:</span>{" "}
                      {selectedProduct.category}
                    </div>
                  )}
                  {selectedProduct.ingredients && (
                    <div>
                      <span className="font-semibold">Ingredients:</span>{" "}
                      {selectedProduct.ingredients}
                    </div>
                  )}
                  {selectedProduct.benefits && (
                    <div>
                      <span className="font-semibold">Benefits:</span>{" "}
                      {selectedProduct.benefits}
                    </div>
                  )}
                  {selectedProduct.howToUse && (
                    <div>
                      <span className="font-semibold">How to Use:</span>{" "}
                      {selectedProduct.howToUse}
                    </div>
                  )}
                  <Button
                    className="mt-4"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4"
            onClick={() => setIsZoomed(false)}
          >
            <img
              src={zoomedImageSrc}
              alt="Zoomed"
              className="max-w-[90%] max-h-[90%] rounded-lg cursor-zoom-out shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
