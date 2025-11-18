"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import { normalizeImageSrc } from "@/lib/images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

type Product = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category?: string;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
  featured?: boolean;
};

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

  const handleAddToCart = (product: Product) => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem("cart");
    const cart = existing ? JSON.parse(existing) : [];
    const match = cart.find(
      (item: any) => item.id === (product._id ?? product.id)
    );
    if (match) {
      match.quantity += 1;
    } else {
      cart.push({
        id: product._id ?? product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <section className="bg-pink-50 py-20 text-center rounded-2xl mt-6">
        <h1 className="text-5xl font-bold text-pink-900 leading-tight">
          Natural Skincare for Healthy, Glowing Skin
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground">
          Our products use the finest natural ingredients to nurture and
          revitalize your skin.
        </p>
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Button asChild size="lg" className="bg-pink-600 hover:bg-pink-700">
            <Link href="/products">Shop Now</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </section>

      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">Featured Products</h2>
        <p className="mt-4 text-center text-muted-foreground">
          Discover our most popular skincare solutions
        </p>

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
              <Card
                key={product._id ?? product.id}
                className="flex flex-col h-full justify-between"
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={normalizeImageSrc(product.image)}
                    alt={product.name}
                    className="object-cover h-full w-full"
                    loading="lazy"
                  />
                </div>

                <CardHeader className="p-4">
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-0 mt-auto">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">${product.price.toFixed(2)}</p>
                    {product.category && (
                      <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                        {product.category}
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
                  </Button>
                  <Button size="sm" onClick={() => setSelectedProduct(product)}>
                    View
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button asChild variant="outline">
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      </section>

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
                    className="mt-4 bg-pink-600 text-white hover:bg-pink-700"
                    onClick={() => {
                      handleAddToCart(selectedProduct);
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
