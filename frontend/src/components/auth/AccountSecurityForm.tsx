"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { csrfFetch } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type Mode = "forgot" | "reset" | "confirm" | "email";
const settings = {
  forgot: {
    title: "Recover your account",
    description: "We’ll email you a link to reset your password.",
    button: "Send recovery link",
    endpoint: "forgot-password",
  },
  reset: {
    title: "Choose a new password",
    description:
      "Use at least 12 characters. Administrators also need an authenticator or recovery code.",
    button: "Reset password",
    endpoint: "reset-password",
  },
  confirm: {
    title: "Confirm your email",
    description:
      "Confirm this change to use your new email address. You’ll then sign in again.",
    button: "Confirm email",
    endpoint: "confirm-email",
  },
  email: {
    title: "Change your email",
    description:
      "Enter your current password. We’ll verify your new email before changing your account.",
    button: "Send verification link",
    endpoint: "email-change",
  },
};
export default function AccountSecurityForm({ mode }: { mode: Mode }) {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    if (mode === "reset" || mode === "confirm") {
      const value =
        new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
      setToken(value);
      window.history.replaceState(null, "", window.location.pathname);
      if (!/^[a-f0-9]{64}$/.test(value))
        setError("This link is missing or invalid. Request a new link.");
    }
  }, [mode]);
  const spec = settings[mode];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if ((mode === "reset" || mode === "confirm") && !token) return;
    if (
      mode === "reset" &&
      (password.length < 12 || new TextEncoder().encode(password).length > 72)
    ) {
      setError("Use at least 12 characters and no more than 72 bytes.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const body =
      mode === "forgot"
        ? { email }
        : mode === "confirm"
          ? { token }
          : mode === "reset"
            ? { token, password, ...(code ? { code } : {}) }
            : { email, password, ...(code ? { code } : {}) };
    try {
      const response = await csrfFetch("/api/auth/" + spec.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to complete this request. Try again.");
        return;
      }
      setMessage(data.message);
      setPassword("");
      setCode("");
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{spec.title}</h1>
        <p className="text-muted-foreground">{spec.description}</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        {(mode === "forgot" || mode === "email") && (
          <div className="space-y-2">
            <Label htmlFor="security-email">
              {mode === "email" ? "New email" : "Email"}
            </Label>
            <Input
              id="security-email"
              type="email"
              autoComplete="email"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}
        {(mode === "reset" || mode === "email") && (
          <>
            <div className="space-y-2">
              <Label htmlFor="security-password">
                {mode === "reset" ? "New password" : "Current password"}
              </Label>
              <Input
                id="security-password"
                type="password"
                autoComplete={
                  mode === "reset" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="security-code">
                Authenticator or recovery code
              </Label>
              <Input
                id="security-code"
                autoComplete="one-time-code"
                value={code}
                maxLength={32}
                onChange={(e) => setCode(e.target.value.trim())}
              />
              <p className="text-sm text-muted-foreground">
                Required for administrators.
              </p>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <Button
          type="submit"
          disabled={
            busy ||
            !!message ||
            ((mode === "reset" || mode === "confirm") && !token)
          }
        >
          {busy ? "Please wait…" : spec.button}
        </Button>
      </form>
      <Link href="/login" className="block text-brand underline">
        Back to sign in
      </Link>
    </main>
  );
}
