"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = { name: string; email: string; message: string; hp: string };
type Errors = Partial<Record<keyof FormState, string>> & { form?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    message: "",
    hp: "",
  });

  const [errors, setErrors] = useState<Errors>({});

  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);

  const confirmRef = useRef<HTMLParagraphElement>(null);

  const idempotencyKey = useMemo(() => cryptoRandomString(24), []);

  useEffect(() => {
    if (sent) confirmRef.current?.focus();
  }, [sent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = (f: FormState): Errors => {
    const err: Errors = {};
    if (!f.name.trim()) err.name = "Name is required.";
    if (!EMAIL_RE.test(f.email)) err.email = "Enter a valid email.";
    if (f.message.trim().length < 10)
      err.message = "Message must be at least 10 characters.";
    if (f.name.length > 120) err.name = "Keep under 120 characters.";
    if (f.email.length > 120) err.email = "Keep under 120 characters.";
    if (f.message.length > 5000) err.message = "Keep under 5000 characters.";
    if (f.hp) err.form = "Spam detected.";
    return err;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    setErrors({});

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = "Something went wrong.";
        try {
          const data = await res.json();
          if (typeof data?.message === "string") msg = data.message;
        } catch {}
        setErrors({ form: msg });
        return;
      }

      setSent(true);
      setForm({ name: "", email: "", message: "", hp: "" });
    } catch (err: any) {
      setErrors({
        form:
          err?.name === "AbortError"
            ? "Request timed out. Try again."
            : "Network error. Try again.",
      });
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6 text-pink-900">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Questions or feedback? Send a message and we’ll respond shortly.
      </p>

      {sent ? (
        <p
          ref={confirmRef}
          tabIndex={-1}
          className="text-green-600 font-medium outline-none"
          aria-live="polite"
        >
          Message sent successfully.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Hidden honeypot field that bots often fill */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="hp">Company</label>
            <Input
              id="hp"
              name="hp"
              autoComplete="organization"
              value={form.hp}
              onChange={handleChange}
              tabIndex={-1}
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={120}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-err" : undefined}
              autoComplete="name"
            />
            {errors.name && (
              <p id="name-err" className="mt-1 text-sm text-red-600">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              maxLength={120}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-err" : undefined}
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && (
              <p id="email-err" className="mt-1 text-sm text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              placeholder="How can we help?"
              value={form.message}
              onChange={handleChange}
              rows={6}
              required
              maxLength={5000}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-err" : undefined}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{form.message.length}/5000</span>
            </div>
            {errors.message && (
              <p id="message-err" className="mt-1 text-sm text-red-600">
                {errors.message}
              </p>
            )}
          </div>

          {errors.form && (
            <p className="text-sm text-red-600" aria-live="assertive">
              {errors.form}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      )}
    </div>
  );
}

function cryptoRandomString(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
