"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, User, Menu, LogOut } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { logout } from "@/lib/logout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    isAdmin?: boolean;
  } | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((userData) => {
        if (userData) {
          setUser({
            ...userData,
            isAdmin: userData.role === "admin",
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const routes = [
    { href: "/", label: "Home", active: pathname === "/" },
    { href: "/products", label: "Products", active: pathname === "/products" },
    { href: "/about", label: "About", active: pathname === "/about" },
    { href: "/contact", label: "Contact", active: pathname === "/contact" },
    { href: "/orders", label: "Orders", active: pathname === "/orders" },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="border-b bg-background">
      <div className="container flex h-20 items-center justify-between max-w-7xl mx-auto px-4">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/images/EternalBotanic.png"
            alt="Eternal Botanic"
            width={105}
            height={60}
            priority
            className="object-contain"
          />
        </Link>

        <nav className="mx-6 hidden items-center space-x-6 md:flex">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-pink-600",
                route.active ? "text-pink-600" : "text-muted-foreground"
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center space-x-4 md:flex">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-full bg-pink-600 text-white h-8 w-8 p-0 font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">
                    Signed in as
                  </DropdownMenuLabel>
                  <div className="px-2 py-1 text-sm font-medium">
                    {user.email}
                  </div>
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
                    className="cursor-pointer text-red-600"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" aria-label="Account">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
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
            <div className="flex flex-col space-y-4 pt-6">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-pink-600",
                    route.active ? "text-pink-600" : "text-muted-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {route.label}
                </Link>
              ))}

              <div className="pt-4 border-t">
                {user ? (
                  <>
                    <span className="block text-sm text-muted-foreground pb-2">
                      Hi, {user.name}
                    </span>
                    <Link
                      href="/account"
                      className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-pink-600"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="mr-2 h-5 w-5" />
                      My Account
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-pink-600"
                      onClick={() => setIsOpen(false)}
                    >
                      🧾 My Orders
                    </Link>
                    {user?.isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-pink-600"
                        onClick={() => setIsOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="flex items-center py-2 text-sm font-medium text-red-600 hover:underline"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-pink-600"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="mr-2 h-5 w-5" />
                    Account
                  </Link>
                )}
                <Link
                  href="/cart"
                  className="flex items-center py-2 text-sm font-medium text-muted-foreground hover:text-pink-600 relative"
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
