"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "@/lib/axios";
import { normalizeImageSrc } from "@/lib/images";
import { addToCart, type Product } from "@/components/product/product";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function parseIngredients(raw?: string): { list: string[]; note?: string } {
  if (!raw) return { list: [] };
  const [main, ...rest] = raw.split("\n");
  const note = rest.join(" ").trim() || undefined;
  const list = main
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  return { list, note };
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/products/${id}`);
        if (active) setProduct(res.data.product ?? res.data);
      } catch (err) {
        console.error("Error loading product:", err);
        if (active) setMissing(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    );
  }

  if (missing || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find that product.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Back to all products</Link>
        </Button>
      </div>
    );
  }

  const { list: ingredients, note } = parseIngredients(product.ingredients);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Shop
        </Link>
        <span className="px-1.5">→</span>
        <Link
          href={`/products?category=${encodeURIComponent(product.category ?? "")}`}
          className="hover:text-foreground"
        >
          {product.category}
        </Link>
        <span className="px-1.5">→</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-brand-soft">
          <img
            src={normalizeImageSrc(product.image)}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {product.category}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            ${product.price.toFixed(2)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Button size="lg" onClick={handleAdd}>
              {added ? "Added ✓" : "Add to cart"}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/cart">View cart</Link>
            </Button>
          </div>

          {product.benefits && (
            <div className="mt-8">
              <h2 className="mb-2 text-sm font-semibold">Benefits</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.benefits}
              </p>
            </div>
          )}

          {product.howToUse && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold">How to use</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.howToUse}
              </p>
            </div>
          )}
        </div>
      </div>

      {ingredients.length > 0 && (
        <section className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Full ingredient list (INCI)</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {ingredients.length} ingredients
            </span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {ingredients.map((ing, i) => (
              <li
                key={`${ing}-${i}`}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              >
                {ing}
              </li>
            ))}
          </ul>
          {note && (
            <p className="mt-4 text-xs italic text-muted-foreground">{note}</p>
          )}
        </section>
      )}
    </div>
  );
}
