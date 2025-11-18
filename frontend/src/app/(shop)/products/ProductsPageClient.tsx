"use client";

import { useState, useEffect } from "react";
import axios from "@/lib/axios";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams, useRouter } from "next/navigation";
import { normalizeImageSrc } from "@/lib/images";

interface Product {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  featured: boolean;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
}

export default function ProductsPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortOption, setSortOption] = useState<string>("");
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromQuery = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    if (categoryFromQuery) {
      setSelectedCategory(categoryFromQuery);
    } else {
      setSelectedCategory("All");
    }
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

  const categories = Array.from(
    new Set(products.map((p) => p.category))
  ).sort();

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

  return (
    <div className="w-full max-w-[1600px] mx-auto py-8 px-4 flex">
      <aside className="w-48 space-y-2 pr-4">
        <h2 className="font-bold">Categories</h2>
        <button
          className={`block w-full text-left px-2 py-1 rounded ${
            selectedCategory === "All" ? "bg-pink-200" : ""
          }`}
          onClick={() => router.push("/products")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`block w-full text-left px-2 py-1 rounded ${
              selectedCategory === cat ? "bg-pink-200" : ""
            }`}
            onClick={() =>
              router.push(`/products?category=${encodeURIComponent(cat)}`)
            }
          >
            {cat}
          </button>
        ))}
      </aside>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">
            {selectedCategory === "All" ? "All Products" : selectedCategory}
          </h1>
          <Select onValueChange={(val: string) => setSortOption(val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="flex flex-col h-full">
                <Skeleton className="aspect-square w-full" />
                <CardHeader className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-16" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <Card
                key={product._id ?? product.id}
                className="flex flex-col h-full justify-between"
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img
                    src={normalizeImageSrc(product.image)}
                    alt={product.name}
                    className="object-cover h-full w-full"
                  />
                </div>
                <CardHeader className="p-4">
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 mt-auto">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">${product.price.toFixed(2)}</p>
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                      {product.category}
                    </span>
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
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <div
            className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-8 w-full max-w-4xl shadow-lg relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl font-bold"
                aria-label="Close product details"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-6">
                {selectedProduct.name}
              </h2>
              <div className="flex flex-col md:flex-row gap-6">
                <img
                  onClick={() => {
                    setZoomedImageSrc(normalizeImageSrc(selectedProduct.image));
                    setIsZoomed(true);
                  }}
                  src={normalizeImageSrc(selectedProduct.image)}
                  alt={selectedProduct.name}
                  className="w-full md:w-64 h-auto object-cover rounded cursor-zoom-in transition-transform duration-300 ease-in-out hover:scale-105"
                />
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="text-muted-foreground">
                    {selectedProduct.description}
                  </p>
                  <div>
                    <span className="font-semibold">Price:</span> $
                    {selectedProduct.price.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-semibold">Category:</span>{" "}
                    {selectedProduct.category}
                  </div>
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
                    className="mt-4 bg-pink-600 text-white"
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
          </div>
        )}
      </AnimatePresence>

      {isZoomed && (
        <div
          className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          <img
            src={zoomedImageSrc}
            alt="Zoomed"
            className="max-w-[90%] max-h-[90%] rounded-lg cursor-zoom-out shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
