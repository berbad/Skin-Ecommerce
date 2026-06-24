# Redesign Phase 2a — Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage (`src/app/page.tsx`) into the approved Modern Clinical design — a split hero, shop-by-concern chips, a restyled featured-products grid, and a science/trust strip — removing all hardcoded pink.

**Architecture:** The homepage is currently a 290-line client component doing data fetching, an inline product modal, and an image zoom. This plan extracts focused, reusable presentational components (`HeroSection`, `ConcernChips`, `ScienceStrip`, `ProductCard`) into `src/components/home/` and `src/components/product/`, then slims `page.tsx` to compose them. The existing product fetch, the "View" modal, and add-to-cart behavior are preserved (restyled), not removed. Builds on the Phase 1 token system (`brand`/`brand-soft`, `bg-card`, `text-muted-foreground`, tabular-nums).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind 4, shadcn/ui, Framer Motion, lucide-react. Tests: Vitest + React Testing Library (from Phase 1).

**Verification philosophy:** TDD for behavior (`ProductCard` price formatting + add-to-cart localStorage, `ConcernChips` hrefs). Pure presentational components (`HeroSection`, `ScienceStrip`) are verified by a passing build + browser screenshots. The homepage's product grid needs the backend API for data, so visual verification focuses on the hero/chips/science strip (which render without a backend) and the product card in isolation via its test.

All paths are relative to `frontend/`.

---

## Design Reference (approved mockup)

- **Hero:** left column — sage uppercase eyebrow "Dermatologist-grade · Clean actives", headline "Proven skincare, nothing extra.", muted subcopy, two CTAs (primary "Find your routine" → `/products`, ghost "Shop all products" → `/products`). Right column — a sage gradient stage (`--brand-soft` → a slightly deeper sage) with a floating "ingredient tag" card. Degrades gracefully without photography.
- **Concern chips:** horizontal pill row: All, Acne & Pores, Dryness, Fine Lines, Dullness, Sensitivity, SPF — each links to `/products` with a `concern` query (All → `/products`).
- **Featured products:** section heading "Bestsellers" + "View all" link; restyled `ProductCard` (sage category badge via `brand-soft`, tabular price, quiet add-to-cart).
- **Science strip:** three pillars (Clinically-studied actives / Full transparency / 30-day results guarantee) on a `bg-card` band.

Colors come from Phase 1 tokens. No hex literals in components — use token utilities (`bg-brand`, `text-brand`, `bg-brand-soft`, `text-muted-foreground`, `bg-card`, `border-border`).

---

## File Structure

- **Create** `src/components/product/ProductCard.tsx` — one product card (image, name, category badge, price, add-to-cart + view). Owns add-to-cart localStorage write.
- **Create** `src/components/product/product.ts` — shared `Product` type + `addToCart(product)` helper (extracted from page.tsx so it can be unit-tested).
- **Create** `src/components/home/HeroSection.tsx` — presentational hero.
- **Create** `src/components/home/ConcernChips.tsx` — concern pill links.
- **Create** `src/components/home/ScienceStrip.tsx` — presentational trust band.
- **Modify** `src/app/page.tsx` — compose the above; keep fetch + modal + zoom; remove all pink.
- **Create** tests: `src/components/product/product.test.ts`, `src/components/product/ProductCard.test.tsx`, `src/components/home/ConcernChips.test.tsx`.

---

## Task 1: Extract Product type + addToCart helper (TDD)

Pulls the cart logic out of `page.tsx` into a tested, reusable module.

**Files:**
- Create: `src/components/product/product.ts`
- Create: `src/components/product/product.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/product/product.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { addToCart, type Product } from "./product";

const product: Product = {
  _id: "abc",
  name: "Niacinamide 10%",
  description: "A serum",
  price: 18,
  image: "x.png",
};

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("addToCart", () => {
  it("adds a new product with quantity 1", () => {
    addToCart(product);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart).toEqual([
      { id: "abc", name: "Niacinamide 10%", price: 18, quantity: 1 },
    ]);
  });

  it("increments quantity when the product is already in the cart", () => {
    addToCart(product);
    addToCart(product);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("dispatches a cart-updated event", () => {
    const spy = vi.fn();
    window.addEventListener("cart-updated", spy);
    addToCart(product);
    expect(spy).toHaveBeenCalledOnce();
    window.removeEventListener("cart-updated", spy);
  });

  it("falls back to id when _id is absent", () => {
    addToCart({ ...product, _id: undefined, id: "fallback" });
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart[0].id).toBe("fallback");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- product.test`
Expected: FAIL — module `./product` does not exist.

- [ ] **Step 3: Implement the module**

Create `src/components/product/product.ts`:

```ts
export type Product = {
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

type CartItem = {
  id: string | undefined;
  name: string;
  price: number;
  quantity: number;
};

export function addToCart(product: Product): void {
  if (typeof window === "undefined") return;
  const existing = localStorage.getItem("cart");
  const cart: CartItem[] = existing ? JSON.parse(existing) : [];
  const id = product._id ?? product.id;
  const match = cart.find((item) => item.id === id);
  if (match) {
    match.quantity += 1;
  } else {
    cart.push({ id, name: product.name, price: product.price, quantity: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- product.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/product/product.ts src/components/product/product.test.ts
git commit -m "feat: extract tested Product type and addToCart helper"
```

---

## Task 2: ProductCard component (TDD)

A focused, reusable card using brand tokens — replaces the inline card markup in `page.tsx`.

**Files:**
- Create: `src/components/product/ProductCard.tsx`
- Create: `src/components/product/ProductCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/product/ProductCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "./product";

vi.mock("@/lib/images", () => ({
  normalizeImageSrc: (s: string) => s || "/placeholder.png",
}));

const product: Product = {
  _id: "abc",
  name: "Niacinamide 10%",
  description: "Oil control serum",
  price: 18,
  image: "n.png",
  category: "Serum",
};

beforeEach(() => {
  localStorage.clear();
});

describe("ProductCard", () => {
  it("renders name, category and a tabular-formatted price", () => {
    render(<ProductCard product={product} onView={() => {}} />);
    expect(screen.getByText("Niacinamide 10%")).toBeInTheDocument();
    expect(screen.getByText("Serum")).toBeInTheDocument();
    expect(screen.getByText("$18.00")).toBeInTheDocument();
  });

  it("uses no hardcoded pink classes", () => {
    const { container } = render(
      <ProductCard product={product} onView={() => {}} />
    );
    expect(container.innerHTML).not.toContain("pink-");
  });

  it("adds to cart when Add to cart is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} onView={() => {}} />);
    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    expect(cart[0].id).toBe("abc");
  });

  it("calls onView with the product when View is clicked", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<ProductCard product={product} onView={onView} />);
    await user.click(screen.getByRole("button", { name: /view/i }));
    expect(onView).toHaveBeenCalledWith(product);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- ProductCard`
Expected: FAIL — `./ProductCard` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/product/ProductCard.tsx`:

```tsx
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
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-brand-soft">
        <img
          src={normalizeImageSrc(product.image)}
          alt={product.name}
          className="h-full w-full object-cover"
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
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- ProductCard`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/product/ProductCard.tsx src/components/product/ProductCard.test.tsx
git commit -m "feat: add token-themed ProductCard component with tests"
```

---

## Task 3: ConcernChips component (TDD)

**Files:**
- Create: `src/components/home/ConcernChips.tsx`
- Create: `src/components/home/ConcernChips.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/home/ConcernChips.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConcernChips } from "./ConcernChips";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : (href?.pathname ?? "#")} {...props}>
      {children}
    </a>
  ),
}));

describe("ConcernChips", () => {
  it("renders an 'All' chip linking to /products", () => {
    render(<ConcernChips />);
    const all = screen.getByText("All");
    expect(all.getAttribute("href")).toBe("/products");
  });

  it("links a concern chip to /products with a concern query", () => {
    render(<ConcernChips />);
    const acne = screen.getByText("Acne & Pores");
    expect(acne.getAttribute("href")).toContain("/products?concern=");
  });

  it("uses no hardcoded pink classes", () => {
    const { container } = render(<ConcernChips />);
    expect(container.innerHTML).not.toContain("pink-");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- ConcernChips`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/home/ConcernChips.tsx`:

```tsx
import Link from "next/link";

const CONCERNS = [
  "Acne & Pores",
  "Dryness",
  "Fine Lines",
  "Dullness",
  "Sensitivity",
  "SPF",
];

export function ConcernChips() {
  return (
    <div className="flex flex-wrap justify-center gap-2 border-y border-border bg-card py-5">
      <Link
        href="/products"
        className="rounded-full border border-brand bg-brand-soft px-4 py-2 text-xs font-medium text-brand"
      >
        All
      </Link>
      {CONCERNS.map((concern) => (
        <Link
          key={concern}
          href={`/products?concern=${encodeURIComponent(concern)}`}
          className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
        >
          {concern}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npm test -- ConcernChips`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/home/ConcernChips.tsx src/components/home/ConcernChips.test.tsx
git commit -m "feat: add shop-by-concern chips with tests"
```

---

## Task 4: HeroSection component (presentational)

Verified by build + screenshot (no behavior to unit test).

**Files:**
- Create: `src/components/home/HeroSection.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/home/HeroSection.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Dermatologist-grade · Clean actives
        </p>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
          Proven skincare,
          <br />
          nothing extra.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Transparent formulas built around clinically-studied ingredients. Find
          what works for your skin — and skip what doesn&apos;t.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/products">Find your routine</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/products">Shop all products</Link>
          </Button>
        </div>
      </div>

      <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_25%,white)] md:min-h-[380px]">
        <div className="absolute bottom-6 right-6 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold tabular-nums">Niacinamide 10%</p>
          <p className="text-xs text-muted-foreground">Pores · Texture</p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: success, no errors. (The `color-mix` arbitrary value is valid CSS; if Tailwind rejects the bracket syntax, replace the gradient `to-` stop with `to-brand` and re-run.)

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HeroSection.tsx
git commit -m "feat: add Modern Clinical hero section"
```

---

## Task 5: ScienceStrip component (presentational)

**Files:**
- Create: `src/components/home/ScienceStrip.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/home/ScienceStrip.tsx`:

```tsx
import { FlaskConical, Eye, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: FlaskConical,
    title: "Clinically-studied actives",
    body: "Every formula is built around ingredients with published, peer-reviewed evidence.",
  },
  {
    icon: Eye,
    title: "Full transparency",
    body: "See every ingredient, its concentration, and why it's there — no proprietary blends.",
  },
  {
    icon: ShieldCheck,
    title: "30-day results guarantee",
    body: "If your skin doesn't respond, return it for a full refund. No questions.",
  },
];

export function ScienceStrip() {
  return (
    <section className="grid gap-8 border-t border-border bg-card px-6 py-10 sm:grid-cols-3">
      {PILLARS.map(({ icon: Icon, title, body }) => (
        <div key={title}>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="mb-1 text-sm font-semibold">{title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/ScienceStrip.tsx
git commit -m "feat: add science/trust strip section"
```

---

## Task 6: Assemble the homepage (remove all pink)

Rewrites `page.tsx` to compose the new components, keeping the fetch, the "View" modal, and the image zoom — restyled with tokens, no pink.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the hero + featured markup and imports**

In `src/app/page.tsx`:

1. Add imports near the top (after existing imports):

```tsx
import { HeroSection } from "@/components/home/HeroSection";
import { ConcernChips } from "@/components/home/ConcernChips";
import { ScienceStrip } from "@/components/home/ScienceStrip";
import { ProductCard } from "@/components/product/ProductCard";
import { addToCart, type Product } from "@/components/product/product";
```

2. Remove the local `type Product = {...}` block (now imported) and the local `handleAddToCart` function (now `addToCart`).

3. Replace the hero `<section className="bg-pink-50 ...">...</section>` with:

```tsx
      <HeroSection />
      <ConcernChips />
```

4. Replace the Featured Products section heading block:

```tsx
        <h2 className="text-3xl font-bold text-center">Featured Products</h2>
        <p className="mt-4 text-center text-muted-foreground">
          Discover our most popular skincare solutions
        </p>
```

with:

```tsx
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Bestsellers</h2>
          <Link href="/products" className="text-sm text-brand hover:underline">
            View all →
          </Link>
        </div>
```

5. Replace the entire non-loading product grid (`featuredProducts.map((product) => ( <Card ...> ... </Card> ))`) with:

```tsx
            {featuredProducts.map((product) => (
              <ProductCard
                key={product._id ?? product.id}
                product={product}
                onView={setSelectedProduct}
              />
            ))}
```

6. In the modal's "Add to Cart" button, replace `className="mt-4 bg-pink-600 text-white hover:bg-pink-700"` with `className="mt-4"` and change `onClick={() => { handleAddToCart(selectedProduct); ...}}` to `onClick={() => { addToCart(selectedProduct); ...}}`.

- [ ] **Step 2: Remove remaining pink + confirm**

Search and remove any leftover pink in this file (e.g., the modal close styles use neutral grays — leave those). Run:

```bash
grep -n "pink-" src/app/page.tsx || echo "clean"
```

Expected: `clean`.

- [ ] **Step 3: Verify build + full test suite**

Run: `npm run build` (expected: success).
Run: `npm test` (expected: all suites pass, including the new product/home tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble Modern Clinical homepage, remove pink"
```

---

## Task 7: Homepage verification gate

- [ ] **Step 1: Full suite + lint + build**

Run: `npm test` (all green), `npm run lint` (no NEW errors vs Phase 1 baseline), `npm run build` (success).

- [ ] **Step 2: No pink in homepage surface**

Run:

```bash
grep -rn "pink-" src/app/page.tsx src/components/home src/components/product || echo "no pink in homepage components"
```

Expected: `no pink in homepage components`.

- [ ] **Step 3: Visual pass**

Start the dev server. Load `/`. Screenshot at desktop and mobile.
Expected: split hero with "Proven skincare, nothing extra." headline, sage eyebrow + gradient stage + floating ingredient tag; concern chips row (All active in sage); "Bestsellers" heading; science strip on a card band. No pink. (The featured grid may be empty/skeleton without the backend — that is expected; the hero, chips, and science strip are the verification targets.)

---

## Self-Review Notes

- **Spec coverage:** Implements the "Storefront → Home" portion of the design spec (hero, concern entry points, restyled product cards, science strip). Product listing and product detail are deliberately separate sub-plans (2b, 2c).
- **Decomposition:** `page.tsx` shrinks from 290 lines of mixed concerns toward composition; cart logic and the card become independently testable units.
- **Carry-forward:** the "View" modal remains an inline modal this phase (restyled, de-pinked). A dedicated product-detail route with the ingredient panel from the mockup is plan 2c. Concern-query filtering on `/products` is wired here via links but the listing page consuming `?concern=` is plan 2b.
