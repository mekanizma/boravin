import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { siteContact, siteContactAddress } from "@/lib/storefront/site-contact";

async function loadSettings() {
  try {
    return await db.select().from(settings).limit(50);
  } catch {
    return [];
  }
}

export default async function AdminSettingsPage() {
  const rows = await loadSettings();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const storeName = typeof map.store_name === "string" ? map.store_name : "Boravin";
  const supportEmail = typeof map.support_email === "string" ? map.support_email : siteContact.email;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ayarlar</h1>
        <p className="text-sm text-[var(--bv-muted)]">Mağaza genel ayarları</p>
      </div>
      <form className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-6">
        <Input label="Mağaza adı" name="store_name" defaultValue={storeName} />
        <Input label="Destek e-posta" name="support_email" type="email" defaultValue={supportEmail} />
        <Input label="Para birimi" name="currency" defaultValue="TRY" />
        <Input label="Varsayılan dil" name="locale" defaultValue="tr" />
        <Button type="submit" variant="accent">Kaydet</Button>
      </form>
      <section className="space-y-3 border border-[var(--bv-border)] bg-white p-4 text-sm sm:p-6">
        <h2 className="font-display text-lg font-semibold">İletişim bilgileri</h2>
        <p className="text-[var(--bv-muted)]">boravin.com künyesinden aktarıldı.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--bv-muted)]">Ünvan</dt>
            <dd className="mt-1 font-medium">{siteContact.companyName}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--bv-muted)]">E-posta</dt>
            <dd className="mt-1 font-medium break-all">{siteContact.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--bv-muted)]">Adres</dt>
            <dd className="mt-1 font-medium">{siteContactAddress}</dd>
          </div>
          {siteContact.phones.map((phone) => (
            <div key={phone.tel}>
              <dt className="text-xs text-[var(--bv-muted)]">{phone.label}</dt>
              <dd className="mt-1 font-medium">{phone.display}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-[var(--bv-muted)]">Ticaret sicil / vergi</dt>
            <dd className="mt-1 font-medium">
              {siteContact.tradeRegistryNo} · {siteContact.taxOffice} V.No {siteContact.taxNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--bv-muted)]">Mesai</dt>
            <dd className="mt-1 font-medium">
              {siteContact.hours.map((row) => `${row.label} ${row.value}`).join(" · ")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--bv-muted)]">Sosyal medya</dt>
            <dd className="mt-1 font-medium">
              {siteContact.social
                .map((item) => (item.href ? `${item.name} (${item.href})` : item.name))
                .join(" · ")}
            </dd>
          </div>
        </dl>
      </section>
      <p className="text-xs text-[var(--bv-muted)]">{rows.length} ayar kaydı yüklendi.</p>
    </div>
  );
}
