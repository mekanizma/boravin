import Link from "next/link";
import { siteContact, siteContactMapUrl } from "@/lib/storefront/site-contact";

const columns = [
  {
    title: "Mağaza",
    links: [
      { href: "/urunler", label: "Tüm ürünler" },
      { href: "/kategori/bilgisayar", label: "Bilgisayar" },
      { href: "/kategori/telefon", label: "Telefonlar" },
      { href: "/kategori/yazicilar", label: "Yazıcılar" },
      { href: "/kategori/2-el-urunler", label: "2. El Ürünler" },
    ],
  },
  {
    title: "Hizmet",
    links: [
      { href: "/sayfa/kargo", label: "Kargo" },
      { href: "/sayfa/iade", label: "İade" },
      { href: "/sayfa/sss", label: "SSS" },
      { href: "/sayfa/iletisim", label: "İletişim" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { href: "/sayfa/hakkimizda", label: "Hakkımızda" },
      { href: "/sayfa/kvkk", label: "KVKK" },
      { href: "/sayfa/gizlilik", label: "Gizlilik" },
      { href: "/admin", label: "Yönetim" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#e7e7e7] bg-[#f7f7f7]">
      <div className="container-bv py-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-14">
          <div>
            <p className="text-[13px] font-medium text-[#161616]">
              {siteContact.companyName}
            </p>
            <p className="mt-0.5 text-xs text-[#737373]">{siteContact.tagline}</p>
            <a
              href={siteContactMapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block max-w-[16rem] text-xs leading-5 text-[#3f3f3f] hover:text-[#111]"
            >
              {siteContact.addressLines[0]}
              <br />
              {siteContact.addressLines[1]}
            </a>
            <ul className="mt-2.5">
              {siteContact.phones.map((phone) => (
                <li key={phone.tel}>
                  <a
                    href={`tel:${phone.tel}`}
                    className="inline-flex min-h-7 items-baseline gap-1.5 text-xs leading-5 text-[#161616] hover:text-[var(--bv-teal)]"
                  >
                    {phone.label === "Servis" ? (
                      <span className="text-[#8a8a8a]">Servis</span>
                    ) : null}
                    {phone.display}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={`mailto:${siteContact.email}`}
              className="mt-1 inline-flex min-h-7 items-center text-xs font-medium text-[#161616] hover:text-[var(--bv-teal)]"
            >
              {siteContact.email}
            </a>
            <p className="mt-1.5 text-[11px] leading-5 text-[#8a8a8a]">
              {siteContact.hours.map((row) => `${row.label} ${row.value}`).join(" · ")}
            </p>
          </div>

          <nav
            aria-label="Alt menü"
            className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:pt-1"
          >
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-[#8a8a8a] uppercase">
                  {col.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-7 items-center text-[13px] leading-5 text-[#3a3a3a] hover:text-[#111]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-[#e6e6e6] pt-3 text-[11px] text-[#8a8a8a] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Boravin Bilişim Ltd.</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {siteContact.social.map((item) => (
              <li key={item.name}>
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-7 items-center tracking-wide uppercase hover:text-[#111]"
                  >
                    {item.name}
                  </a>
                ) : (
                  <span className="inline-flex min-h-7 items-center tracking-wide uppercase">
                    {item.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p>Girne, KKTC</p>
        </div>
      </div>
    </footer>
  );
}
