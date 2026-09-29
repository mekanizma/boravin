import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  siteContact,
  siteContactMapUrl,
} from "@/lib/storefront/site-contact";

function SocialMark({ name }: { name: string }) {
  return (
    <span className="inline-flex min-h-11 items-center rounded-full border border-[#d7dee4] bg-white px-4 text-sm font-semibold text-[#121417]">
      {name}
    </span>
  );
}

export async function ContactDetails() {
  const t = await getTranslations("Contact");
  const tc = await getTranslations("SiteContact");

  const phoneLabel = (label: string) =>
    label === "Servis" ? tc("serviceLabel") : tc("phoneLabel");

  const hourLabel = (label: string) =>
    label === "Cumartesi" ? tc("hoursSaturday") : tc("hoursWeekday");

  return (
    <section className="container-bv py-6 sm:py-10">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6b7280] uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#111] sm:text-4xl">
          {tc("companyName")}
        </h1>
        <p className="mt-2 text-sm text-[#444] sm:text-base">{tc("tagline")}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
        <article className="border border-[#e3e8ec] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#111]">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">{t("addressTitle")}</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#222]">
            {tc("addressLine1")}
            <br />
            {tc("addressLine2")}
          </p>
          <a
            href={siteContactMapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--bv-teal)]"
          >
            {t("openMap")}
          </a>
        </article>

        <article className="border border-[#e3e8ec] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#111]">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">{t("phoneTitle")}</h2>
          </div>
          <ul className="mt-2">
            {siteContact.phones.map((phone) => (
              <li key={phone.tel}>
                <a
                  href={`tel:${phone.tel}`}
                  className="flex min-h-11 items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[#6b7280]">{phoneLabel(phone.label)}</span>
                  <span className="font-semibold text-[#111]">{phone.display}</span>
                </a>
              </li>
            ))}
          </ul>
        </article>

        <article className="border border-[#e3e8ec] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#111]">
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">{t("emailTitle")}</h2>
          </div>
          <a
            href={`mailto:${siteContact.email}`}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#111]"
          >
            {siteContact.email}
          </a>
          <div className="mt-4 flex items-center gap-2 text-[#111]">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">{t("hoursTitle")}</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {siteContact.hours.map((row) => (
              <li key={row.label} className="flex justify-between gap-3">
                <span className="text-[#6b7280]">{hourLabel(row.label)}</span>
                <span className="font-semibold text-[#111]">{row.value}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="border border-[#e3e8ec] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[#111]">{t("companyInfo")}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">{t("tradeRegistry")}</dt>
              <dd className="font-semibold text-[#111]">{siteContact.tradeRegistryNo}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">{t("taxOffice")}</dt>
              <dd className="text-right font-semibold text-[#111]">
                {tc("taxOffice")}
                <span className="mt-0.5 block font-medium text-[#444]">
                  {t("taxNoPrefix", { number: siteContact.taxNumber })}
                </span>
              </dd>
            </div>
          </dl>
          <h2 className="mt-5 text-sm font-semibold text-[#111]">{t("socialTitle")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {siteContact.social.map((item) =>
              item.href ? (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full border border-[#d7dee4] bg-white px-4 text-sm font-semibold text-[#121417]"
                >
                  {item.name}
                </a>
              ) : (
                <SocialMark key={item.name} name={item.name} />
              ),
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
