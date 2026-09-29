"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  aiGenerateAnnouncementAction,
  aiGenerateCampaignAction,
  aiGenerateProductAction,
  aiGenerateSeoAction,
} from "@/features/ai/actions";

export default function AICenterPage() {
  const { toast } = useToast();
  const [brief, setBrief] = React.useState(
    "Bu hafta sonu yaz ürünlerinde %20 indirim kampanyası oluştur.",
  );
  const [output, setOutput] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  async function run(
    kind: "campaign" | "product" | "announcement" | "seo",
  ) {
    setLoading(true);
    try {
      let result: unknown;
      if (kind === "campaign") result = await aiGenerateCampaignAction(brief);
      if (kind === "product")
        result = await aiGenerateProductAction({
          name: "ASUS TUF Gaming A15",
          features: "RTX 3050, 144Hz",
        });
      if (kind === "announcement")
        result = await aiGenerateAnnouncementAction(brief);
      if (kind === "seo")
        result = await aiGenerateSeoAction({ name: "ASUS TUF Gaming A15" });
      setOutput(JSON.stringify(result, null, 2));
      toast({
        tone: "success",
        title: "AI çıktısı hazır",
        description: "Önizleyip düzenledikten sonra yayınlayın.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "AI üretimi başarısız",
        description:
          error instanceof Error
            ? error.message.includes("GEMINI")
              ? "GEMINI_API_KEY tanımlayın."
              : "Bir sorun oluştu. Lütfen tekrar deneyin."
            : "Bir sorun oluştu.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">AI Center</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Kampanya, ürün açıklaması, duyuru ve SEO üretimi. Çıktılar önce
          önizlenir; doğrudan yayınlanmaz.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <Input
            label="Brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              disabled={loading}
              onClick={() => run("campaign")}
            >
              AI Kampanya Oluştur
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => run("product")}
            >
              Ürün açıklaması
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => run("announcement")}
            >
              Duyuru
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => run("seo")}
            >
              SEO
            </Button>
          </div>
          <p className="text-xs text-[var(--bv-muted)]">
            Provider: {process.env.NEXT_PUBLIC_AI_PROVIDER ?? "gemini"} (server)
          </p>
        </div>
        <pre className="max-h-[28rem] overflow-auto rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-[var(--bv-ink)] p-4 text-xs text-[var(--bv-concrete)]">
          {output || "// AI çıktısı burada önizlenir"}
        </pre>
      </div>
    </div>
  );
}
