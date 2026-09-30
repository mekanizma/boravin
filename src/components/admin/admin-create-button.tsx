"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type CreateField =
  | {
      kind?: "text";
      name: string;
      label: string;
      placeholder?: string;
      hint?: string;
      required?: boolean;
      defaultValue?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
      type?: "text" | "number" | "url";
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      placeholder?: string;
      hint?: string;
      required?: boolean;
      defaultValue?: string;
      rows?: number;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      required?: boolean;
      defaultValue?: string;
      options: { value: string; label: string }[];
    };

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export function AdminCreateButton({
  label,
  title,
  submitLabel = "Kaydet",
  successTitle = "Kaydedildi",
  fields,
  onSubmit,
  className,
}: {
  label: string;
  title: string;
  submitLabel?: string;
  successTitle?: string;
  fields: CreateField[];
  onSubmit: (values: Record<string, string>) => Promise<ActionResult>;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    for (const field of fields) {
      values[field.name] = String(form.get(field.name) ?? "").trim();
    }
    setPending(true);
    setError(null);
    try {
      const result = await onSubmit(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({ tone: "success", title: successTitle });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Kayıt oluşturulamadı.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="accent"
        className={cn("w-full sm:w-auto", className)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            if (field.kind === "textarea") {
              return (
                <label
                  key={field.name}
                  className="flex flex-col gap-1.5 text-sm font-medium"
                >
                  {field.label}
                  <textarea
                    name={field.name}
                    required={field.required}
                    defaultValue={field.defaultValue}
                    placeholder={field.placeholder}
                    rows={field.rows ?? 3}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 py-2 text-sm font-normal placeholder:text-[var(--bv-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                  {field.hint ? (
                    <span className="text-xs font-normal text-[var(--bv-muted)]">
                      {field.hint}
                    </span>
                  ) : null}
                </label>
              );
            }
            if (field.kind === "select") {
              return (
                <label
                  key={field.name}
                  className="flex flex-col gap-1.5 text-sm font-medium"
                >
                  {field.label}
                  <select
                    name={field.name}
                    required={field.required}
                    defaultValue={field.defaultValue ?? ""}
                    className="h-10 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value || "__empty"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <Input
                key={field.name}
                name={field.name}
                label={field.label}
                placeholder={field.placeholder}
                hint={field.hint}
                required={field.required}
                defaultValue={field.defaultValue}
                type={field.type ?? "text"}
                inputMode={field.inputMode}
              />
            );
          })}
          {error ? (
            <p className="text-sm text-[var(--bv-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? "Kaydediliyor…" : submitLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
