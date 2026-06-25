"use client";

import { normalizeImageSrc } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { addToCart, type Product } from "./product";

export function ProductCard({
  product,
  onView,
}: {
  product: Product;
  onView: (product: Product) => void;
}) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_18%,var(--card))] transition-shadow hover:shadow-lg">
      <div className="flex aspect-square items-center justify-center overflow-hidden p-6">
        <img
          src={normalizeImageSrc(product.image)}
          alt={product.name}
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="text-base font-medium">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-semibold tabular-nums">
            ${product.price.toFixed(2)}
          </p>
          {product.category && (
            <span className="rounded-full bg-card px-2 py-1 text-xs font-medium text-brand">
              {product.category}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => addToCart(product)}
          >
            Add to cart
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onView(product)}>
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
