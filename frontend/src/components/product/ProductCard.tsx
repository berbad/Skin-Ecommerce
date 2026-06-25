"use client";

import { normalizeImageSrc } from "@/lib/images";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { addToCart, type Product } from "./product";

export function ProductCard({
  product,
  onView,
}: {
  product: Product;
  onView: (product: Product) => void;
}) {
  return (
    <Card className="flex h-full flex-col justify-between overflow-hidden border-border">
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_18%,var(--card))] p-6">
        <img
          src={normalizeImageSrc(product.image)}
          alt={product.name}
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>

      <CardHeader className="p-4">
        <CardTitle className="text-base font-medium">{product.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {product.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto p-4 pt-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold tabular-nums">
            ${product.price.toFixed(2)}
          </p>
          {product.category && (
            <span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-medium text-brand">
              {product.category}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2 p-4 pt-0">
        <Button size="sm" variant="outline" onClick={() => addToCart(product)}>
          Add to cart
        </Button>
        <Button size="sm" onClick={() => onView(product)}>
          View
        </Button>
      </CardFooter>
    </Card>
  );
}
