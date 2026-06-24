"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, User, Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { logout } from "@/lib/logout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "text-base font-semibold uppercase tracking-[0.18em] text-foreground",
        className
      )}
      aria-label="Eternal Botanic home"
    >
      Eternal Botanic
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    isAdmin?: boolean;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser({
            ...userData,
            isAdmin: userData.role === "admin",
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setUser(null);
      }
    };

    fetchUser();
  }, [pathname]);

  const routes = [
    { href: "/products", label: "Shop", active: pathname === "/products" },
    { href: "/about", label: "About", active: pathname === "/about" },
    { href: "/contact", label: "Contact", active: pathname === "/contact" },
    { href: "/orders", label: "Orders", active: pathname === "/orders" },
  ];

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setUser(null);
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="bg-foreground text-background">
        <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs tracking-wide">
          Complete ingredient list on every product — nothing hidden
        </p>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Wordmark className="flex-shrink-0" />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-brand",
                route.active ? "text-brand" : "text-muted-foreground"
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-full bg-brand text-brand-foreground h-8 w-8 p-0 font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs">
                  Signed in as
                </DropdownMenuLabel>
                <div className="px-2 py-1 text-sm font-medium">{user.email}</div>
                <DropdownMenuSeparator />
                <Link href="/account">
                  <DropdownMenuItem className="cursor-pointer">
                    My Account
                  </DropdownMenuItem>
                </Link>
                <Link href="/orders">
                  <DropdownMenuItem className="cursor-pointer">
                    My Orders
                  </DropdownMenuItem>
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      Admin Dashboard
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="cursor-pointer text-red-600"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" aria-label="Account">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link href="/cart">
            <Button variant="ghost" size="icon" aria-label="Cart" className="relative">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex flex-col space-y-4 pt-6">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-brand",
                    route.active ? "text-brand" : "text-muted-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {route.label}
                </Link>
              ))}

              <div className="pt-4 border-t border-border">
                {user ? (
                  <>
                    <span className="block text-sm text-muted-foreground pb-2">
                      Hi, {user.name}
                    </span>
                    <Link
                      href="/account"
                      className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-brand"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="mr-2 h-5 w-5" />
                      My Account
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-brand"
                      onClick={() => setIsOpen(false)}
                    >
                      My Orders
                    </Link>
                    {user?.isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-brand"
                        onClick={() => setIsOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      disabled={loggingOut}
                      className="flex items-center py-2 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-brand"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="mr-2 h-5 w-5" />
                    Account
                  </Link>
                )}
                <Link
                  href="/cart"
                  className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-brand relative"
                  onClick={() => setIsOpen(false)}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Cart
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
