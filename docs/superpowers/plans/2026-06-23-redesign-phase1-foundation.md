# Redesign Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Modern Clinical design foundation — color tokens, typography, and the shared header/footer chrome — so every later phase builds on one consistent system.

**Architecture:** The project already uses Tailwind 4 + shadcn/ui (new-york, CSS-variable theming). This phase re-themes the existing token layer in `globals.css` with the approved Modern Clinical palette, adds a dedicated `brand` (sage) token family, swaps the font to Hanken Grotesk, and rebuilds the Navbar and Footer to use semantic tokens instead of hardcoded `pink-600`. No component library is added or removed in this phase (MUI removal happens in the Admin phase).

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind 4, shadcn/ui + Radix, lucide-react. Tests added this phase: Vitest + React Testing Library + jsdom.

**Verification philosophy:** TDD (test-first) is applied to behavior — the Navbar's active-link state, auth-conditional rendering, and mobile drawer toggle. Pure presentational work (color tokens, font wiring, Footer markup) is verified by a passing production build plus browser screenshots via the preview tools, because asserting on CSS-variable values is brittle theater, not a behavior test.

All paths are relative to `frontend/` unless noted.

---

## Approved Design Tokens (reference)

These hex values are used verbatim in Task 2. Light theme (storefront) and a dark variant (admin chrome) are both defined.

| Token | Light | Role |
|-------|-------|------|
| ink | `#1A1D1A` | text, primary buttons |
| paper | `#F4F5F3` | page background |
| surface | `#FFFFFF` | cards, popovers |
| muted-fg | `#6B716A` | secondary text |
| line | `#E3E6E2` | borders, inputs |
| sage | `#5E7A59` | brand accent |
| sage-soft | `#E7EDE5` | accent backgrounds, badges |

Typeface: **Hanken Grotesk**. Prices/percentages use tabular numerals.

---

## File Structure

- **Modify** `src/app/globals.css` — replace `:root` / `.dark` token values; register `--color-brand*` in `@theme inline`; add a `.tabular-nums` utility.
- **Modify** `src/app/layout.tsx` — replace Inter with Hanken Grotesk; wire `--font-sans`.
- **Modify** `src/components/layout/navbar.tsx` — replace `pink-600` with semantic/brand tokens; refine to the approved look.
- **Modify** `src/components/layout/footer.tsx` — restyle to tokens; fix the broken `terms` link.
- **Create** `vitest.config.mts`, `src/test/setup.ts` — test infrastructure.
- **Create** `src/components/layout/navbar.test.tsx` — Navbar behavior tests.
- **Modify** `package.json` — add `test` script + dev dependencies.

---

## Task 1: Test infrastructure

**Files:**
- Create: `vitest.config.mts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (scripts + devDependencies)
- Create: `src/test/smoke.test.ts` (temporary, deleted in Step 6)

- [ ] **Step 1: Install test dependencies**

Run from `frontend/`:

```bash
npm install -D vitest@^2 @vitejs/plugin-react@^4 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Create the test setup file**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write and run a smoke test**

Create `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Remove the smoke test and commit**

```bash
rm src/test/smoke.test.ts
git add package.json package-lock.json vitest.config.mts src/test/setup.ts
git commit -m "test: add vitest + react testing library infrastructure"
```

---

## Task 2: Modern Clinical color tokens

Replaces the neutral grayscale palette with the approved hex values and adds a dedicated `brand` (sage) token family. Hex is used directly in the CSS variables for exactness (Tailwind 4 accepts any color format).

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Register brand tokens in the theme**

In `src/app/globals.css`, inside the `@theme inline { ... }` block, add these lines just before the `--radius-sm:` line:

```css
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-brand-soft: var(--brand-soft);
```

- [ ] **Step 2: Replace the `:root` token values**

Replace the entire `:root { ... }` block with:

```css
:root {
  --radius: 0.625rem;
  --background: #f4f5f3;
  --foreground: #1a1d1a;
  --card: #ffffff;
  --card-foreground: #1a1d1a;
  --popover: #ffffff;
  --popover-foreground: #1a1d1a;
  --primary: #1a1d1a;
  --primary-foreground: #ffffff;
  --secondary: #e7ede5;
  --secondary-foreground: #1a1d1a;
  --muted: #ecefea;
  --muted-foreground: #6b716a;
  --accent: #ecefea;
  --accent-foreground: #1a1d1a;
  --destructive: #b3261e;
  --border: #e3e6e2;
  --input: #e3e6e2;
  --ring: #5e7a59;
  --brand: #5e7a59;
  --brand-foreground: #ffffff;
  --brand-soft: #e7ede5;
  --chart-1: #5e7a59;
  --chart-2: #8ba888;
  --chart-3: #3c5145;
  --chart-4: #c9a26b;
  --chart-5: #6b716a;
  --sidebar: #ffffff;
  --sidebar-foreground: #1a1d1a;
  --sidebar-primary: #5e7a59;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #ecefea;
  --sidebar-accent-foreground: #1a1d1a;
  --sidebar-border: #e3e6e2;
  --sidebar-ring: #5e7a59;
}
```

- [ ] **Step 3: Replace the `.dark` token values (admin chrome variant)**

Replace the entire `.dark { ... }` block with:

```css
.dark {
  --background: #14160f;
  --foreground: #f4f5f3;
  --card: #1b1e16;
  --card-foreground: #f4f5f3;
  --popover: #1b1e16;
  --popover-foreground: #f4f5f3;
  --primary: #f4f5f3;
  --primary-foreground: #1a1d1a;
  --secondary: #2a2f25;
  --secondary-foreground: #f4f5f3;
  --muted: #2a2f25;
  --muted-foreground: #a7ada1;
  --accent: #2a2f25;
  --accent-foreground: #f4f5f3;
  --destructive: #e06b62;
  --border: rgba(255, 255, 255, 0.1);
  --input: rgba(255, 255, 255, 0.15);
  --ring: #8ba888;
  --brand: #8ba888;
  --brand-foreground: #14160f;
  --brand-soft: #2a2f25;
  --chart-1: #8ba888;
  --chart-2: #5e7a59;
  --chart-3: #c9a26b;
  --chart-4: #a7ada1;
  --chart-5: #f4f5f3;
  --sidebar: #1b1e16;
  --sidebar-foreground: #f4f5f3;
  --sidebar-primary: #8ba888;
  --sidebar-primary-foreground: #14160f;
  --sidebar-accent: #2a2f25;
  --sidebar-accent-foreground: #f4f5f3;
  --sidebar-border: rgba(255, 255, 255, 0.1);
  --sidebar-ring: #8ba888;
}
```

- [ ] **Step 4: Add a tabular-nums utility**

At the end of `src/app/globals.css`, append:

```css
@layer utilities {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build completes with no CSS or type errors.

- [ ] **Step 6: Visually verify the new palette**

Start the dev server with the preview tooling, load `/`, and take a screenshot.
Expected: background is warm off-white `#F4F5F3`, text near-black, no leftover bright accent on default surfaces. (Navbar/footer still show pink until Tasks 4–5 — that is expected here.)

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: apply Modern Clinical color tokens and brand palette"
```

---

## Task 3: Typography — Hanken Grotesk + tabular numerals

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Swap the font in the root layout**

In `src/app/layout.tsx`, replace the Inter import and instance:

Replace:

```tsx
import { Inter } from "next/font/google";
```

with:

```tsx
import { Hanken_Grotesk } from "next/font/google";
```

Replace:

```tsx
const inter = Inter({ subsets: ["latin"] });
```

with:

```tsx
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
```

Replace the `<body>` opening tag:

```tsx
      <body className={inter.className}>
```

with:

```tsx
      <body className={`${hanken.variable} font-sans antialiased`}>
```

- [ ] **Step 2: Point the theme font token at the new variable**

In `src/app/globals.css`, inside `@theme inline`, replace:

```css
  --font-sans: var(--font-geist-sans);
```

with:

```css
  --font-sans: var(--font-sans);
```

(The `--font-mono` line may stay as-is; it is unused.)

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds; no missing-font errors.

- [ ] **Step 4: Visually verify the typeface loaded**

Reload `/` in the preview and screenshot a heading.
Expected: headings render in Hanken Grotesk (clearly not the system/Inter default), text is crisp.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: switch typeface to Hanken Grotesk and wire font token"
```

---

## Task 4: Navbar — semantic tokens + refined chrome (TDD)

Replaces every hardcoded `pink-600` with brand/semantic tokens and tightens the markup to the approved look, while preserving all existing behavior (auth dropdown, mobile sheet, logout). Behavior is locked with tests first.

**Files:**
- Create: `src/components/layout/navbar.test.tsx`
- Modify: `src/components/layout/navbar.tsx`

- [ ] **Step 1: Write the failing behavior tests**

Create `src/components/layout/navbar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";

// next/navigation
const pathname = { current: "/" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() }),
}));

// next/link -> plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? "#"} {...props}>
      {children}
    </a>
  ),
}));

// next/image -> plain img
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

// auth helpers: default to logged-out
const getCurrentUser = vi.fn();
vi.mock("@/lib/getCurrentUser", () => ({
  getCurrentUser: () => getCurrentUser(),
}));
vi.mock("@/lib/logout", () => ({ logout: vi.fn() }));

beforeEach(() => {
  pathname.current = "/";
  getCurrentUser.mockResolvedValue(null);
});

describe("Navbar", () => {
  it("marks the active route with brand text color", async () => {
    pathname.current = "/products";
    render(<Navbar />);
    const productsLinks = await screen.findAllByText("Products");
    // desktop link is the first; active link uses the brand token class
    expect(productsLinks[0].className).toContain("text-brand");
  });

  it("shows account and cart links when logged out", async () => {
    render(<Navbar />);
    expect(await screen.findByLabelText("Account")).toBeInTheDocument();
    // cart link points at /cart
    const cartLink = document.querySelector('a[href="/cart"]');
    expect(cartLink).not.toBeNull();
  });

  it("does NOT use a hardcoded pink class anywhere", async () => {
    const { container } = render(<Navbar />);
    await screen.findByLabelText("Account");
    expect(container.innerHTML).not.toContain("pink-600");
  });

  it("opens the mobile menu when the menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByLabelText("Menu"));
    // Sheet content renders the routes again; "Home" now appears in the drawer too
    const homeLinks = await screen.findAllByText("Home");
    expect(homeLinks.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- navbar`
Expected: FAIL — the "pink-600" and "text-brand" assertions fail because the current file still uses `text-pink-600`.

- [ ] **Step 3: Replace the active/hover link classes**

In `src/components/layout/navbar.tsx`, there are two identical `className={cn(...)}` blocks for routes (desktop nav and mobile sheet). In **both**, replace:

```tsx
                "text-sm font-medium transition-colors hover:text-pink-600",
                route.active ? "text-pink-600" : "text-muted-foreground"
```

with:

```tsx
                "text-sm font-medium transition-colors hover:text-brand",
                route.active ? "text-brand" : "text-muted-foreground"
```

- [ ] **Step 4: Replace the avatar button color**

Replace:

```tsx
                  <Button className="rounded-full bg-pink-600 text-white h-8 w-8 p-0 font-bold">
```

with:

```tsx
                  <Button className="rounded-full bg-brand text-brand-foreground h-8 w-8 p-0 font-bold">
```

- [ ] **Step 5: Replace remaining mobile-drawer pink hovers**

In the mobile sheet block there are several links/buttons with `hover:text-pink-600`. Replace every remaining occurrence of `hover:text-pink-600` in the file with `hover:text-brand`.

Run to confirm none remain:

```bash
grep -n "pink-600" src/components/layout/navbar.tsx || echo "clean"
```

Expected: `clean`.

- [ ] **Step 6: Refine the header shell to the approved look**

Replace the header opening tag:

```tsx
    <header className="border-b bg-background">
```

with:

```tsx
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- navbar`
Expected: PASS — all 4 tests green.

- [ ] **Step 8: Verify build + visual**

Run: `npm run build` (expected: success).
Reload `/` in the preview and screenshot the header.
Expected: nav links are muted gray; active/hover is sage `#5E7A59`; no pink anywhere; header is sticky with a subtle blur.

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/navbar.tsx src/components/layout/navbar.test.tsx
git commit -m "feat: retheme navbar to sage brand tokens with tests"
```

---

## Task 5: Footer — token restyle + link fix

Mostly presentational, so verified by build + a light render test and a screenshot. Also fixes the broken relative `terms` link.

**Files:**
- Create: `src/components/layout/footer.test.tsx`
- Modify: `src/components/layout/footer.tsx`

- [ ] **Step 1: Write a render test**

Create `src/components/layout/footer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./footer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href?.pathname ?? "#"} {...props}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  it("renders brand, shop, company and contact sections", () => {
    render(<Footer />);
    expect(screen.getByText("Eternal Botanic")).toBeInTheDocument();
    expect(screen.getByText("All Products")).toBeInTheDocument();
    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.getByText(/eternalbotanic@gmail.com/)).toBeInTheDocument();
  });

  it("links Terms with an absolute path", () => {
    render(<Footer />);
    const terms = screen.getByText("Terms & Conditions");
    expect(terms.getAttribute("href")).toBe("/terms");
  });

  it("shows the current year", () => {
    render(<Footer />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- footer`
Expected: FAIL on the Terms test — current code uses `href="terms"` (relative), so the rendered href is `terms`, not `/terms`.

- [ ] **Step 3: Fix the Terms link**

In `src/components/layout/footer.tsx`, replace:

```tsx
                <Link
                  href="terms"
```

with:

```tsx
                <Link
                  href="/terms"
```

- [ ] **Step 4: Restyle the footer shell and brand copy**

Replace the footer opening tag:

```tsx
    <footer className="border-t bg-background max-w-7xl mx-auto px-4">
```

with:

```tsx
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4">
```

Then, at the very end of the component, add the matching closing `</div>` before `</footer>`. Replace:

```tsx
        </div>
      </div>
    </footer>
  );
```

with:

```tsx
        </div>
      </div>
      </div>
    </footer>
  );
```

Update the brand description to match the clinical positioning. Replace:

```tsx
            <p className="text-sm text-muted-foreground">
              Premium skincare products made with natural ingredients.
            </p>
```

with:

```tsx
            <p className="text-sm text-muted-foreground">
              Dermatologist-grade formulas built around clinically-studied,
              fully-transparent ingredients.
            </p>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- footer`
Expected: PASS — all 3 tests green.

- [ ] **Step 6: Verify build + visual**

Run: `npm run build` (expected: success).
Reload `/` in the preview, scroll to the footer, screenshot.
Expected: footer sits on a white `--card` surface against the off-white page, links hover to foreground, no pink.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/footer.tsx src/components/layout/footer.test.tsx
git commit -m "feat: retheme footer to tokens and fix terms link"
```

---

## Task 6: Foundation verification gate

Confirms the whole foundation is coherent before later phases build on it.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all Navbar + Footer tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. (Fix any new warnings introduced by this phase.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 4: Confirm no hardcoded pink remains anywhere**

Run:

```bash
grep -rn "pink-600" src || echo "no pink remaining"
```

Expected: `no pink remaining` (any results outside navbar/footer are out of Phase 1 scope — note them for the storefront phase rather than fixing here).

- [ ] **Step 5: Final visual pass**

In the preview, screenshot the homepage top (header + hero area) and bottom (footer) at desktop and mobile widths.
Expected: cohesive Modern Clinical palette, Hanken Grotesk type, sage accents, sticky header, no pink. Hero/body content is unstyled-old — that is expected; it is rebuilt in the Storefront phase.

- [ ] **Step 6: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: phase 1 foundation verification fixes" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** This plan covers the spec's "Foundation" phase in full — color tokens (incl. dark/admin variant), Hanken Grotesk + tabular numerals, core shared chrome (header/footer). The spec's "core shadcn primitives" item needs no work: the primitives already exist and now inherit the new tokens automatically; they are exercised in later phases.
- **Deferred to later phases:** product/listing/commerce/admin pages, MUI removal, motion, full accessibility pass — all out of scope here by design.
- **Tabular numerals** are wired this phase (utility + token) but first *used* on the product page (Storefront phase), where prices/percentages appear.
