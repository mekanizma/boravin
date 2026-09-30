"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrderLookupForm({
  labels,
}: {
  labels: {
    title: string;
    hint: string;
    orderNumber: string;
    email: string;
    submit: string;
    orderPlaceholder: string;
    emailPlaceholder: string;
  };
}) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [email, setEmail] = React.useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const no = orderNumber.trim();
    if (!no) return;
    const params = new URLSearchParams();
    if (email.trim()) params.set("email", email.trim());
    const qs = params.toString();
    router.push(`/siparis-takip/${encodeURIComponent(no)}${qs ? `?${qs}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border border-[#e3e8ec] bg-white p-4 sm:p-6"
    >
      <h2 className="font-display text-xl font-semibold tracking-tight text-[#111]">
        {labels.title}
      </h2>
      <p className="mt-1 text-sm text-[#6b7280]">{labels.hint}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {labels.orderNumber}
          <Input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder={labels.orderPlaceholder}
            required
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {labels.email}
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={labels.emailPlaceholder}
            autoComplete="email"
          />
        </label>
      </div>
      <Button type="submit" variant="accent" className="mt-4 h-12 w-full sm:w-auto">
        {labels.submit}
      </Button>
    </form>
  );
}
