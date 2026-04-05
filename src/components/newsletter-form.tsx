"use client";

import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; added?: boolean } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Kayıt yapılamadı.");
      }

      setMessage(data?.added ? "E-bültene kaydoldun." : "Bu e-posta zaten kayıtlı.");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="E-posta adresin"
          className="h-11 flex-1 rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#D4AF37]"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition disabled:opacity-45"
        >
          {loading ? "Kaydediliyor..." : "Abone Ol"}
        </button>
      </div>
      {message && <p className="text-xs text-emerald-200">{message}</p>}
      {error && <p className="text-xs text-red-200">{error}</p>}
    </form>
  );
}

