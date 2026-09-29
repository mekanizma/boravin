/** Official contact details from https://www.boravin.com/iletisim */

export type SitePhone = {
  label: string;
  display: string;
  tel: string;
};

export type SiteSocial = {
  name: "Facebook" | "Instagram" | "YouTube" | "Twitter";
  /** Empty when boravin.com lists the network but the icon href is "#". */
  href: string;
};

export const siteContact = {
  companyName: "Boravin Bilişim Ltd.",
  tagline: "Kıbrısın Teknoloji Merkezi",
  tradeRegistryNo: "13291",
  taxOffice: "Girne Vd.",
  taxNumber: "13291",
  addressLines: [
    "Mustafa Çağatay Cd. Zehra Nevzat Apt. No: 3",
    "Girne, KKTC",
  ],
  phones: [
    { label: "Telefon", display: "+90 (392) 815 68 05", tel: "+903928156805" },
    { label: "Telefon", display: "+90 (392) 815 87 87", tel: "+903928158787" },
    { label: "Servis", display: "+90 (392) 815 33 25", tel: "+903928153325" },
  ] satisfies SitePhone[],
  email: "info@boravin.com",
  hours: [
    { label: "Hafta içi", value: "08:30 – 18:00" },
    { label: "Cumartesi", value: "08:30 – 14:00" },
  ],
  social: [
    { name: "Facebook", href: "" },
    { name: "Instagram", href: "" },
    { name: "YouTube", href: "" },
    { name: "Twitter", href: "" },
  ] satisfies SiteSocial[],
};

export const siteContactAddress = siteContact.addressLines.join(", ");

export const siteContactMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${siteContact.addressLines[0]} ${siteContact.addressLines[1]}`,
)}`;

export function siteContactSettingsValue() {
  return {
    companyName: siteContact.companyName,
    tagline: siteContact.tagline,
    email: siteContact.email,
    phones: siteContact.phones.map((phone) => ({
      label: phone.label,
      display: phone.display,
      tel: phone.tel,
    })),
    phone: siteContact.phones[0]?.display ?? "",
    servicePhone: siteContact.phones.find((phone) => phone.label === "Servis")?.display ?? "",
    address: siteContactAddress,
    tradeRegistryNo: siteContact.tradeRegistryNo,
    taxOffice: siteContact.taxOffice,
    taxNumber: siteContact.taxNumber,
    workingHours: siteContact.hours
      .map((row) => `${row.label}: ${row.value}`)
      .join(" · "),
    social: siteContact.social.map((item) => ({
      name: item.name,
      href: item.href,
    })),
  };
}

export function siteContactPageHtml() {
  const phones = siteContact.phones
    .map(
      (phone) =>
        `<p><strong>${phone.label}:</strong> <a href="tel:${phone.tel}">${phone.display}</a></p>`,
    )
    .join("");
  const hours = siteContact.hours
    .map((row) => `<li>${row.label}: ${row.value}</li>`)
    .join("");
  const social = siteContact.social
    .map((item) =>
      item.href
        ? `<li><a href="${item.href}" rel="noreferrer" target="_blank">${item.name}</a></li>`
        : `<li>${item.name}</li>`,
    )
    .join("");

  return [
    `<p>${siteContact.tagline}</p>`,
    `<p><strong>Ünvan:</strong> ${siteContact.companyName}</p>`,
    `<p><strong>Ticaret Sicil No:</strong> ${siteContact.tradeRegistryNo}</p>`,
    `<p><strong>Vergi Dairesi:</strong> ${siteContact.taxOffice} V.No: ${siteContact.taxNumber}</p>`,
    `<p><strong>Merkez Adresi:</strong> ${siteContactAddress}</p>`,
    phones,
    `<p><strong>E-posta:</strong> <a href="mailto:${siteContact.email}">${siteContact.email}</a></p>`,
    `<p><strong>Mesai saatleri</strong></p><ul>${hours}</ul>`,
    `<p><strong>Sosyal medya</strong></p><ul>${social}</ul>`,
  ].join("");
}
