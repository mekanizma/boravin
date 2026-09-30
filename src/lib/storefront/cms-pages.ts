import type { AppLocale } from "../../i18n/config";
import { siteContact, siteContactAddress } from "./site-contact";

export type CmsPageCopy = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  html: string;
};

const CMS_SLUGS = [
  "hakkimizda",
  "kvkk",
  "gizlilik",
  "kullanim-sartlari",
  "iade",
  "kargo",
  "sss",
] as const;

export type CmsSlug = (typeof CMS_SLUGS)[number];

export function isCmsSlug(slug: string): slug is CmsSlug {
  return (CMS_SLUGS as readonly string[]).includes(slug);
}

const phone = siteContact.phones[0];
const phoneAlt = siteContact.phones[1];
const service = siteContact.phones.find((item) => item.label === "Servis") ?? phone;
const weekday = siteContact.hours[0];
const saturday = siteContact.hours[1];

function a(href: string, label: string) {
  return `<a href="${href}">${label}</a>`;
}

const mail = a(`mailto:${siteContact.email}`, siteContact.email);
const telMain = a(`tel:${phone.tel}`, phone.display);
const telAlt = phoneAlt ? a(`tel:${phoneAlt.tel}`, phoneAlt.display) : "";
const telService = a(`tel:${service.tel}`, service.display);

function facts(locale: AppLocale) {
  if (locale === "en") {
    return `<ul>
<li><strong>Legal name:</strong> ${siteContact.companyName}</li>
<li><strong>Trade registry no:</strong> ${siteContact.tradeRegistryNo}</li>
<li><strong>Tax office:</strong> ${siteContact.taxOffice} · Tax no: ${siteContact.taxNumber}</li>
<li><strong>Address:</strong> ${siteContactAddress}</li>
<li><strong>Phone:</strong> ${telMain}${telAlt ? ` · ${telAlt}` : ""}</li>
<li><strong>Service:</strong> ${telService}</li>
<li><strong>Email:</strong> ${mail}</li>
<li><strong>Hours:</strong> Weekdays ${weekday.value} · Saturday ${saturday.value}</li>
</ul>`;
  }
  return `<ul>
<li><strong>Ünvan:</strong> ${siteContact.companyName}</li>
<li><strong>Ticaret sicil no:</strong> ${siteContact.tradeRegistryNo}</li>
<li><strong>Vergi dairesi:</strong> ${siteContact.taxOffice} · V.No: ${siteContact.taxNumber}</li>
<li><strong>Adres:</strong> ${siteContactAddress}</li>
<li><strong>Telefon:</strong> ${telMain}${telAlt ? ` · ${telAlt}` : ""}</li>
<li><strong>Servis:</strong> ${telService}</li>
<li><strong>E-posta:</strong> ${mail}</li>
<li><strong>Mesai:</strong> Hafta içi ${weekday.value} · Cumartesi ${saturday.value}</li>
</ul>`;
}

const pages: Record<CmsSlug, Record<AppLocale, CmsPageCopy>> = {
  hakkimizda: {
    tr: {
      title: "Hakkımızda",
      seoTitle: "Hakkımızda",
      seoDescription:
        "Boravin Bilişim Ltd., 2003’ten beri Girne’de. Kıbrıs’ın teknoloji merkezi.",
      html: `<p>${siteContact.tagline}. ${siteContact.companyName}, Girne’de bilgisayar, telefon, yazıcı ve tüketici elektroniği satan bir teknoloji mağazasıdır.</p>
<p>2003 yılında internet kafe ile başlayan işimiz, 2008 yılından beri Boravin Bilişim Ltd. unvanıyla devam ediyor. Hedefimiz Kuzey Kıbrıs’ta teknoloji ürünlerinde fiyat ve performansı birlikte değerlendiren, müşteri güvenine dayanan bir satış anlayışı sunmaktır.</p>
<p>Mağazamızda ve bu sitede dizüstü bilgisayar, masaüstü ve bileşen, monitör, çevre birimleri, yazıcı ve sarf, telefon, televizyon, oyun ve ev elektroniği ile kondisyonu belirtilmiş 2. el ürünler bulunur. Satış sonrası arıza ve garanti başvuruları servis hattından alınır.</p>
<p>En iyi fiyat ve kaliteyle hizmetinizdeyiz.</p>
<h2>Firma künyesi</h2>
${facts("tr")}`,
    },
    en: {
      title: "About us",
      seoTitle: "About us",
      seoDescription:
        "Boravin Bilişim Ltd. has traded in Kyrenia since 2003. Northern Cyprus technology shop.",
      html: `<p>${siteContact.tagline}. ${siteContact.companyName} is a technology shop in Kyrenia selling computers, phones, printers and consumer electronics.</p>
<p>The business started as an internet café in 2003 and has traded as Boravin Bilişim Ltd. since 2008. We aim to sell technology in Northern Cyprus on price and performance, with a policy built on customer trust.</p>
<p>The shop and this site carry laptops, desktops and components, monitors, peripherals, printers and supplies, phones, televisions, gaming and home electronics, plus used items sold with their condition stated. After-sales faults and warranty visits go through the service line.</p>
<p>We are here with fair prices and solid products.</p>
<h2>Company details</h2>
${facts("en")}`,
    },
  },
  kargo: {
    tr: {
      title: "Kargo",
      seoTitle: "Kargo ve teslimat",
      seoDescription:
        "KKTC içi teslimat. 5.000 TL ve üzeri alışverişlerde kargo ücretsiz. Girne mağazasından teslim.",
      html: `<p>Siparişler Girne’deki mağazamızdan hazırlanır ve Kuzey Kıbrıs Türk Cumhuriyeti içinde teslim edilir. Yurt dışına gönderim yapılmaz.</p>
<h2>Kargo ücreti</h2>
<p>5.000 TL ve üzeri alışverişlerde KKTC içi kargo ücretsizdir. Bu tutarın altındaki siparişlerde kargo bedeli, ödemeyi onaylamadan önce sipariş özetinde görünür.</p>
<h2>Süre</h2>
<p>Stoktaki ürünler genellikle 1–3 iş günü içinde teslim edilir. Süre; stok teyidi, hazırlık ve ada içi dağıtıma göre değişebilir. Sipariş hazır olduğunda kayıtlı telefon veya e-posta üzerinden haber verilir.</p>
<h2>Mağazadan teslim</h2>
<p>Ürünü kargo beklemeden mağazadan alabilirsiniz. Teslimat adresi: ${siteContactAddress}. Mesai saatleri hafta içi ${weekday.value}, cumartesi ${saturday.value}. Teslim sırasında sipariş numarası istenir.</p>
<h2>Hasarlı veya eksik paket</h2>
<p>Paketi teslim alırken dış kutuyu kontrol edin. Hasar, eksik parça veya yanlış ürün varsa aynı gün ${mail} adresine ya da ${telMain} numarasına yazın. Sipariş numarasını ve mümkünse fotoğrafı ekleyin.</p>`,
    },
    en: {
      title: "Shipping",
      seoTitle: "Shipping and delivery",
      seoDescription:
        "Delivery inside the TRNC. Free shipping on orders of 5,000 TL and above. Pickup in Kyrenia.",
      html: `<p>Orders are prepared at our Kyrenia shop and delivered inside the Turkish Republic of Northern Cyprus. We do not ship abroad.</p>
<h2>Shipping fee</h2>
<p>Shipping inside the TRNC is free on orders of 5,000 TL and above. Below that amount, the shipping fee is shown in the order summary before you pay.</p>
<h2>Timing</h2>
<p>In-stock items are usually delivered within 1–3 business days. Timing depends on stock confirmation, packing and island delivery. We contact you by the phone number or email on the order when it is ready.</p>
<h2>Store pickup</h2>
<p>You can collect the order at the shop instead of waiting for a courier. Address: ${siteContactAddress}. Hours: weekdays ${weekday.value}, Saturday ${saturday.value}. Please bring the order number.</p>
<h2>Damaged or incomplete parcels</h2>
<p>Check the outer box when it arrives. If something is damaged, missing or not what you ordered, write the same day to ${mail} or call ${telMain}. Include the order number and a photo when you can.</p>`,
    },
  },
  iade: {
    tr: {
      title: "İade şartları",
      seoTitle: "İade şartları",
      seoDescription:
        "Teslimattan itibaren 14 gün içinde, kullanılmamış ürünlerde iade. Ayıplı üründe servis hattı.",
      html: `<p>Bu şartlar ${siteContact.companyName} üzerinden verilen siparişler için geçerlidir. Başvuruda sipariş numaranızı yazın.</p>
<h2>14 gün içinde cayma</h2>
<p>Ürünü teslim aldığınız tarihten itibaren 14 gün içinde, kullanılmamış ve yeniden satılabilir durumdaki ürünü iade edebilirsiniz. Ürün; aksesuarları, varsa faturası ve orijinal ambalajıyla birlikte olmalıdır. Kurulum, aktivasyon veya kullanım izi varsa cayma hakkı düşer.</p>
<h2>İade edilmeyen ürünler</h2>
<ul>
<li>Ambalajı açılmış kulak içi kulaklık ve hijyen mührü bozulmuş kişisel ürünler</li>
<li>Etkinleştirilmiş yazılım, dijital lisans ve oyun kodu</li>
<li>Ambalajı açılmış kartuş, toner ve benzeri sarf malzemesi</li>
<li>İsteğinize göre kurulan veya özelleştirilen sistemler</li>
</ul>
<h2>Ayıplı, eksik veya yanlış ürün</h2>
<p>Ürün kusurluysa, eksikse veya sipariş ettiğinizden farklıysa iade ya da değişim kargosu bize aittir. Servis kaydı için ${telService} numaralı hattı arayın. Üretici garantisi, ürünün kendi garanti belgesindeki süre ve koşullarla geçerlidir; ek bir garanti süresi taahhüt edilmez.</p>
<h2>2. el ürünler</h2>
<p>2. el ürünler, ürün sayfasında yazan kondisyonla satılır. İlandaki durumla uyuşmayan veya çalışmayan ürünlerde değişim ya da iade değerlendirilir.</p>
<h2>Başvuru ve ücret iadesi</h2>
<p>${mail} veya ${telMain} üzerinden başvurun. Onaydan sonra ürünü mağazaya getirebilir ya da size bildirilen şekilde kargolayabilirsiniz. Ürün kontrol edildikten sonra bedel, ödemenin yapıldığı yönteme iade edilir. Cayma iadelerinde, ürün ayıplı değilse iade kargosu alıcıya aittir.</p>`,
    },
    en: {
      title: "Returns",
      seoTitle: "Returns policy",
      seoDescription:
        "Return unused products within 14 days of delivery. Faulty goods go through the service line.",
      html: `<p>These terms apply to orders placed with ${siteContact.companyName}. Include your order number when you contact us.</p>
<h2>14-day withdrawal</h2>
<p>You may return an unused, resaleable product within 14 days of the day you received it. Send it back with its accessories, invoice if you have one, and original packaging. Withdrawal does not apply once the item has been installed, activated or used.</p>
<h2>Products we cannot take back</h2>
<ul>
<li>In-ear headphones and personal items whose hygiene seal has been broken</li>
<li>Activated software, digital licences and game codes</li>
<li>Opened cartridges, toner and similar consumables</li>
<li>Systems built or configured to your specification</li>
</ul>
<h2>Faulty, missing or wrong items</h2>
<p>If the product is faulty, incomplete or not what you ordered, we cover the return or exchange shipping. Call the service line on ${telService}. Manufacturer warranty follows the period and conditions on the product’s own warranty card. We do not add a separate warranty term.</p>
<h2>Used products</h2>
<p>Used items are sold in the condition described on the product page. If the item does not match that description or does not work, we will look at an exchange or a refund.</p>
<h2>How to apply, and refunds</h2>
<p>Write to ${mail} or call ${telMain}. After we confirm the return, you can bring the product to the shop or ship it the way we describe. Once it has been checked, the amount is refunded to the original payment method. On a change-of-mind return, return shipping is yours unless the product is faulty.</p>`,
    },
  },
  sss: {
    tr: {
      title: "Sıkça sorulan sorular",
      seoTitle: "Sıkça sorulan sorular",
      seoDescription:
        "Adres, mesai, kargo, iade, servis ve sipariş takibi. Boravin Bilişim Ltd., Girne.",
      html: `<h2>Mağaza nerede?</h2>
<p>${siteContactAddress}. Harita bağlantısı iletişim sayfasındadır.</p>
<h2>Çalışma saatleri nedir?</h2>
<p>Hafta içi ${weekday.value}, cumartesi ${saturday.value}. Pazar günleri mağaza kapalıdır.</p>
<h2>Nasıl ulaşırım?</h2>
<p>Telefon ${telMain}${telAlt ? ` ve ${telAlt}` : ""}. E-posta ${mail}. Arıza ve garanti için servis hattı ${telService}.</p>
<h2>Kargo ücretli mi?</h2>
<p>5.000 TL ve üzeri siparişlerde KKTC içi kargo ücretsizdir. Altındaki tutarlarda bedel ödeme sayfasında görünür. İsterseniz ürünü Girne mağazasından da teslim alabilirsiniz. Ayrıntı <a href="/sayfa/kargo">kargo</a> sayfasında.</p>
<h2>Teslimat ne kadar sürer?</h2>
<p>Stoktaki ürünler genellikle 1–3 iş günü içinde KKTC içinde teslim edilir. Yurt dışına gönderim yoktur.</p>
<h2>İade süresi ne kadar?</h2>
<p>Kullanılmamış ürünlerde teslimattan itibaren 14 gündür. Ayıplı ürün ve istisnalar <a href="/sayfa/iade">iade şartları</a> sayfasında yazılıdır.</p>
<h2>2. el ürün alabilir miyim?</h2>
<p>Evet. 2. el ürünler ayrı kategoridedir ve kondisyonu ürün sayfasında belirtilir.</p>
<h2>Garanti ve servis nasıl işler?</h2>
<p>Garanti, üreticinin belgelediği süre ve koşullarla geçerlidir. Arıza kaydı için ${telService} numarasını arayın ya da ürünü mesai saatlerinde mağazaya getirin.</p>
<h2>Siparişimi nereden görürüm?</h2>
<p>Üye girişi yaptıysanız siparişler Hesabım sayfasındadır. Üye olmadan verdiyseniz sipariş numaranızı saklayın ve ${mail} üzerinden sorun.</p>
<h2>Üyelik zorunlu mu?</h2>
<p>Hayır. Üye olarak adresinizi kaydedebilir ve siparişlerinizi tek yerden izleyebilirsiniz; üyelik alışveriş için şart değildir.</p>`,
    },
    en: {
      title: "FAQ",
      seoTitle: "FAQ",
      seoDescription:
        "Address, hours, shipping, returns, service and order tracking for Boravin in Kyrenia.",
      html: `<h2>Where is the shop?</h2>
<p>${siteContactAddress}. The contact page has a map link.</p>
<h2>What are the opening hours?</h2>
<p>Weekdays ${weekday.value}, Saturday ${saturday.value}. The shop is closed on Sunday.</p>
<h2>How do I reach you?</h2>
<p>Phone ${telMain}${telAlt ? ` and ${telAlt}` : ""}. Email ${mail}. Faults and warranty: service line ${telService}.</p>
<h2>Is shipping charged?</h2>
<p>Shipping inside the TRNC is free on orders of 5,000 TL and above. Below that, the fee appears on the checkout page. You can also collect from the Kyrenia shop. Details are on the <a href="/sayfa/kargo">shipping</a> page.</p>
<h2>How long does delivery take?</h2>
<p>In-stock items are usually delivered inside the TRNC within 1–3 business days. We do not ship abroad.</p>
<h2>How long do I have to return something?</h2>
<p>14 days from delivery for unused products. Faulty goods and exceptions are on the <a href="/sayfa/iade">returns</a> page.</p>
<h2>Do you sell used products?</h2>
<p>Yes. Used products are in their own category, and the condition is written on the product page.</p>
<h2>How do warranty and service work?</h2>
<p>Warranty follows the period and conditions on the manufacturer’s card. For a fault, call ${telService} or bring the product to the shop during opening hours.</p>
<h2>Where do I see my order?</h2>
<p>If you checked out as a member, orders are on the Account page. If you checked out as a guest, keep the order number and write to ${mail}.</p>
<h2>Do I have to create an account?</h2>
<p>No. An account lets you save an address and see orders in one place. It is not required to buy.</p>`,
    },
  },
  kvkk: {
    tr: {
      title: "KVKK aydınlatma metni",
      seoTitle: "KVKK aydınlatma metni",
      seoDescription: `${siteContact.companyName} kişisel verilerin korunmasına ilişkin aydınlatma metni. Başvuru: ${siteContact.email}.`,
      html: `<p>Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu’ndaki ilkelere göre ${siteContact.companyName} tarafından hazırlanmıştır. Veri sorumlusu, Kuzey Kıbrıs Türk Cumhuriyeti’nde kayıtlı olan şirketimizdir. Eski sitede yer alan ve başka bir firmayı veri sorumlusu gösteren metin bu mağaza için geçerli değildir.</p>
<h2>Veri sorumlusu</h2>
${facts("tr")}
<h2>Hangi veriler, hangi amaçla</h2>
<p>Sipariş, teslimat, fatura, garanti, servis ve müşteri desteği için ad, soyad, telefon, e-posta, teslimat adresi ve sipariş geçmişi işlenir. Üyelikte hesap bilgileriniz; sitede gezinirken sepet, dil tercihi ve oturum için zorunlu çerezler ile ilk taraf ziyaret kayıtları tutulur. Kart numarası sipariş kaydına yazılmaz. Ödeme, ödeme adımındaki yöntemle tamamlanır.</p>
<p>Veriler; sözleşmenin kurulması ve ifası, yasal saklama yükümlülükleri, meşru menfaat kapsamında hizmetin güvenliği ve —ayrı onay verdiyseniz— kampanya duyuruları için işlenir. Onayınızı ${mail} adresine yazarak geri alabilirsiniz.</p>
<h2>Kimlere aktarılır</h2>
<p>Veriler satılmaz. Teslimat için kargo veya kurye firmasına, tahsilat için ödeme kuruluşuna ve yasal zorunluluk halinde yetkili mercilere, yalnızca ilgili işlemi tamamlamak için gerekli kadarıyla aktarılır.</p>
<h2>Saklama</h2>
<p>Sipariş ve fatura kayıtları, ticari defterler için öngörülen yasal süre boyunca saklanır. Destek yazışmaları, talebin sonuçlanması için gereken süre kadar tutulur. Süre dolunca veriler silinir, yok edilir veya anonim hale getirilir.</p>
<h2>Haklarınız</h2>
<p>Kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi isteme, amacını ve aktarıldığı tarafları öğrenme, eksik veya yanlışsa düzeltilmesini isteme, sebepleri ortadan kalkmışsa silinmesini veya yok edilmesini isteme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.</p>
<p>Başvurunuzu ${mail} adresine, kimliğinizi doğrulamamıza yetecek bilgi ve sipariş numaranızla gönderin. Taleplere gerekçeli olarak en geç 30 gün içinde yanıt verilir.</p>`,
    },
    en: {
      title: "Personal data notice",
      seoTitle: "Personal data notice",
      seoDescription: `Personal data notice for ${siteContact.companyName}. Requests: ${siteContact.email}.`,
      html: `<p>This notice is written by ${siteContact.companyName} in line with the principles of Turkish Law No. 6698 on the Protection of Personal Data. The controller is our company, registered in the Turkish Republic of Northern Cyprus. A previous page that named a different company as controller does not apply to this shop.</p>
<h2>Controller</h2>
${facts("en")}
<h2>Which data, and why</h2>
<p>For orders, delivery, invoices, warranty, service and customer support we process name, phone, email, delivery address and order history. An account stores your membership details. While you browse, we keep cookies required for the cart, language and session, plus first-party visit records. Card numbers are not written into the order record. Payment is completed in the checkout step.</p>
<p>Data is used to form and perform the contract, to meet legal retention duties, for the legitimate interest of keeping the service secure and — only if you opted in — for campaign messages. You can withdraw that opt-in by writing to ${mail}.</p>
<h2>Who receives it</h2>
<p>We do not sell personal data. It is shared with a courier only to deliver the order, with a payment provider only to take payment, and with public authorities only when the law requires it, and only as far as that step needs.</p>
<h2>Retention</h2>
<p>Order and invoice records are kept for the legal period that applies to commercial books. Support messages are kept for as long as the request needs to be resolved. After that, data is deleted, destroyed or anonymised.</p>
<h2>Your rights</h2>
<p>You may ask whether your personal data is processed, request information if it is, learn the purpose and the recipients, ask for incorrect data to be corrected, ask for erasure when the reason for processing has ended, and claim compensation where processing was unlawful.</p>
<p>Send the request to ${mail} with enough detail for us to confirm your identity and, if you have one, your order number. We answer with reasons within 30 days.</p>`,
    },
  },
  gizlilik: {
    tr: {
      title: "Gizlilik ve çerezler",
      seoTitle: "Gizlilik ve çerezler",
      seoDescription:
        "Boravin sitesinde zorunlu çerezler, hesap oturumu ve kişisel verilerin kullanımı.",
      html: `<p>${siteContact.companyName} bu siteyi mağaza satışı için işletir. Kişisel verilerin amaçları, aktarımı ve haklarınız <a href="/sayfa/kvkk">KVKK aydınlatma metni</a> içindedir. Bu sayfa çerezleri ve günlük kullanımı özetler.</p>
<h2>Zorunlu çerezler</h2>
<ul>
<li><strong>bv_cart:</strong> sepetinizin bu tarayıcıda durması için</li>
<li><strong>NEXT_LOCALE:</strong> Türkçe veya İngilizce dil seçiminiz için</li>
<li><strong>Oturum çerezleri:</strong> üye girişi yaptığınızda hesabınızın açık kalması için</li>
</ul>
<p>Bu çerezler olmadan sepet, dil ve üyelik çalışmaz. Reklam amaçlı üçüncü taraf çerezleri kullanılmaz.</p>
<h2>Ziyaret kayıtları</h2>
<p>Sayfa ve ürün görüntüleme gibi olaylar, hizmeti işletmek için kendi sistemimizde tutulabilir. Bu kayıtlar reklam ağlarına satılmaz.</p>
<h2>İletişim</h2>
<p>Gizlilikle ilgili sorular için ${mail}. Telefon ${telMain}.</p>`,
    },
    en: {
      title: "Privacy and cookies",
      seoTitle: "Privacy and cookies",
      seoDescription:
        "Essential cookies, account session and how Boravin uses personal data on this site.",
      html: `<p>${siteContact.companyName} runs this site for shop sales. Purposes, sharing and your rights are in the <a href="/sayfa/kvkk">personal data notice</a>. This page summarises cookies and everyday use.</p>
<h2>Essential cookies</h2>
<ul>
<li><strong>bv_cart:</strong> keeps your cart in this browser</li>
<li><strong>NEXT_LOCALE:</strong> stores Turkish or English</li>
<li><strong>Session cookies:</strong> keep you signed in after you log in</li>
</ul>
<p>The cart, language and account do not work without these cookies. We do not use third-party advertising cookies.</p>
<h2>Visit records</h2>
<p>Events such as page and product views may be stored on our own systems so we can run the shop. Those records are not sold to ad networks.</p>
<h2>Contact</h2>
<p>Privacy questions: ${mail}. Phone ${telMain}.</p>`,
    },
  },
  "kullanim-sartlari": {
    tr: {
      title: "Kullanım şartları",
      seoTitle: "Kullanım şartları",
      seoDescription: `${siteContact.companyName} sitesini kullanma ve sipariş şartları.`,
      html: `<p>Bu siteyi kullanarak aşağıdaki şartları kabul etmiş olursunuz. Siteyi ${siteContact.companyName} işletir.</p>
<h2>Sipariş ve fiyat</h2>
<p>Fiyatlar Türk lirasıdır ve ödeme anındaki tutar geçerlidir. Stok, ürün sayfasında görünür. Ödeme onaylanmadan sipariş kesinleşmez. Yanlışlıkla yayınlanan bariz fiyat hatalarında siparişi hazırlamadan önce size haber verir, onayınız olmadan tahsilat yapmayız.</p>
<h2>Hesap</h2>
<p>Üyelik bilgilerinizin doğru olmasından ve şifrenizin sizde kalmasından siz sorumlusunuz. Hesabınızı ${mail} üzerinden kapatılmasını isteyebilirsiniz.</p>
<h2>İçerik</h2>
<p>Ürün görselleri ve açıklamaları bilgilendirme amaçlıdır. Marka adları ilgili hak sahiplerine aittir. Site metinleri ve düzeni Boravin’e aittir; izinsiz kopyalanamaz.</p>
<h2>Uyuşmazlık</h2>
<p>Uyuşmazlıklarda ${siteContact.companyName} kayıtlı merkezinin bulunduğu Girne esas alınır. Teslimat, iade ve kişisel veriler için <a href="/sayfa/kargo">kargo</a>, <a href="/sayfa/iade">iade</a> ve <a href="/sayfa/kvkk">KVKK</a> sayfalarına bakın.</p>`,
    },
    en: {
      title: "Terms of use",
      seoTitle: "Terms of use",
      seoDescription: `Terms for using the ${siteContact.companyName} website and placing orders.`,
      html: `<p>By using this site you accept the terms below. The site is operated by ${siteContact.companyName}.</p>
<h2>Orders and prices</h2>
<p>Prices are in Turkish lira and the amount at payment is the one that applies. Stock is shown on the product page. An order is not final until payment is accepted. If a price is published by obvious mistake, we tell you before packing the order and we do not take payment without your confirmation.</p>
<h2>Account</h2>
<p>You are responsible for keeping your membership details accurate and your password private. You can ask us to close the account by writing to ${mail}.</p>
<h2>Content</h2>
<p>Product images and descriptions are there to inform you. Brand names belong to their owners. The text and layout of the site belong to Boravin and may not be copied without permission.</p>
<h2>Disputes</h2>
<p>Disputes are handled with reference to Kyrenia, where ${siteContact.companyName} is registered. For delivery, returns and personal data, see <a href="/sayfa/kargo">shipping</a>, <a href="/sayfa/iade">returns</a> and <a href="/sayfa/kvkk">the data notice</a>.</p>`,
    },
  },
};

export function getCmsPage(slug: string, locale: string): CmsPageCopy | null {
  if (!isCmsSlug(slug)) return null;
  const language: AppLocale = locale === "en" ? "en" : "tr";
  return pages[slug][language];
}

export function cmsPagesForDatabase() {
  return CMS_SLUGS.map((slug) => {
    const page = pages[slug].tr;
    return {
      title: page.title,
      slug,
      content: page.html,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
    };
  });
}
