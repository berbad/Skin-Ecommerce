import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background max-w-7xl mx-auto px-4">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Eternal Botanic</h3>
            <p className="text-sm text-muted-foreground">
              Premium skincare products made with natural ingredients.
            </p>
          </div>

          {/* Shop Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="text-muted-foreground hover:text-foreground"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href={{ pathname: "/products", query: { category: "SPF" } }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  SPF
                </Link>
              </li>
              <li>
                <Link
                  href={{
                    pathname: "/products",
                    query: { category: "Cleanser and Toner" },
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cleansers
                </Link>
              </li>
              <li>
                <Link
                  href={{ pathname: "/products", query: { category: "Serum" } }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Serums
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                Email:{" "}
                <a
                  href="mailto:eternalbotanic@gmail.com"
                  className="hover:text-foreground"
                >
                  eternalbotanic@gmail.com
                </a>
              </li>
              <li>
                Instagram:{" "}
                <a
                  href="https://instagram.com/eternalbotanic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  @eternalbotanic
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Eternal Botanic. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
