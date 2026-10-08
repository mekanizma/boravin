import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  ReportBarChart,
  ReportDualAreaChart,
  ReportPieChart,
} from "@/components/admin/report-charts";
import { ReportKpi, ReportSection } from "@/components/admin/report-ui";
import { formatCurrency } from "@/lib/utils";
import {
  REPORT_PERIODS,
  parseReportPeriod,
  type ReportPeriod,
} from "@/lib/reports/ranges";
import { loadEcommerceReport } from "@/lib/reports/queries";

const SEGMENT_LABELS: Record<string, string> = {
  new: "Yeni",
  returning: "Geri dönen",
  vip: "VIP",
  inactive: "Pasif",
  corporate: "Kurumsal",
};

const getCachedReport = (period: ReportPeriod) =>
  unstable_cache(
    () => loadEcommerceReport(period),
    ["admin-reports-v1", period],
    { revalidate: 60, tags: ["admin-reports", "orders", "products"] },
  )();

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const report = await getCachedReport(period);

  const rangeLabel = `${new Date(report.range.start).toLocaleDateString("tr-TR")} – ${new Date(report.range.end).toLocaleDateString("tr-TR")}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Raporlar</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            E-ticaret yönetim özeti · {rangeLabel}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {REPORT_PERIODS.map((item) => {
            const active = period === item.id;
            return (
              <Link
                key={item.id}
                href={`/admin/reports?period=${item.id}`}
                className={
                  active
                    ? "shrink-0 rounded-[var(--radius-md)] bg-[var(--bv-ink)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white"
                    : "shrink-0 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <ReportKpi
          label="Ciro"
          value={formatCurrency(report.kpis.revenue)}
          change={report.kpis.revenueChange}
        />
        <ReportKpi
          label="Sipariş"
          value={report.kpis.orders}
          change={report.kpis.ordersChange}
          href="/admin/orders"
        />
        <ReportKpi
          label="Ort. sepet (AOV)"
          value={formatCurrency(report.kpis.aov)}
          change={report.kpis.aovChange}
        />
        <ReportKpi
          label="Yeni müşteri"
          value={report.kpis.newCustomers}
          change={report.kpis.newCustomersChange}
          href="/admin/customers"
        />
        <ReportKpi
          label="İptal oranı"
          value={`%${report.kpis.cancelRate}`}
          hint={`${report.kpis.cancelledOrders} iptal`}
          tone={report.kpis.cancelRate > 10 ? "danger" : "default"}
        />
        <ReportKpi
          label="Açık fatura"
          value={formatCurrency(report.invoices.openAmount)}
          hint={`${report.invoices.unpaidCount + report.invoices.partialCount} belge`}
          href="/admin/invoices?odeme=open"
          tone={report.invoices.openAmount > 0 ? "warning" : "success"}
        />
      </div>

      <ReportSection
        title="Satış trendi"
        description="Ödenen sipariş cirosu ve sipariş adedi"
      >
        <ReportDualAreaChart data={report.trend} />
      </ReportSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection
          title="Sipariş durumları"
          description="Seçilen dönemdeki sipariş dağılımı"
          action={
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
            >
              Siparişler
            </Link>
          }
        >
          <ReportBarChart
            data={report.ordersByStatus.map((row) => ({
              label: row.label,
              count: row.count,
            }))}
          />
        </ReportSection>

        <ReportSection
          title="Ödeme yöntemleri"
          description="Ödenen siparişlere göre ciro payı"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
            <ReportPieChart
              data={report.paymentMethods.map((row) => ({
                label: row.method,
                value: row.revenue,
              }))}
            />
            <ul className="space-y-2 text-sm">
              {report.paymentMethods.length === 0 ? (
                <li className="text-[var(--bv-muted)]">Veri yok</li>
              ) : (
                report.paymentMethods.map((row) => (
                  <li key={row.method} className="flex justify-between gap-3">
                    <span className="truncate text-[var(--bv-slate)]">
                      {row.method}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(row.revenue)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </ReportSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportSection
          title="En çok satan ürünler"
          description="Ciroya göre ilk 10"
          action={
            <Link
              href="/admin/products"
              className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
            >
              Ürünler
            </Link>
          }
        >
          {report.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--bv-muted)]">
              Bu dönemde satış yok
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--bv-border)] text-xs text-[var(--bv-muted)] uppercase">
                    <th className="py-2 pr-3 font-semibold">Ürün</th>
                    <th className="py-2 pr-3 font-semibold">Adet</th>
                    <th className="py-2 text-right font-semibold">Ciro</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((row, index) => (
                    <tr
                      key={`${row.productId ?? row.name}-${index}`}
                      className="border-b border-[var(--bv-border)] last:border-0"
                    >
                      <td className="py-2.5 pr-3">
                        <p className="max-w-[14rem] truncate font-medium sm:max-w-xs">
                          {row.name}
                        </p>
                        {row.sku ? (
                          <p className="text-xs text-[var(--bv-muted)]">
                            {row.sku}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3">{row.quantity}</td>
                      <td className="py-2.5 text-right font-medium">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>

        <ReportSection
          title="En değerli müşteriler"
          description="Toplam harcamaya göre"
          action={
            <Link
              href="/admin/customers"
              className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
            >
              Müşteriler
            </Link>
          }
        >
          {report.topCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--bv-muted)]">
              Müşteri kaydı yok
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--bv-border)] text-xs text-[var(--bv-muted)] uppercase">
                    <th className="py-2 pr-3 font-semibold">Müşteri</th>
                    <th className="py-2 pr-3 font-semibold">Sipariş</th>
                    <th className="py-2 text-right font-semibold">Harcama</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCustomers.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--bv-border)] last:border-0"
                    >
                      <td className="py-2.5 pr-3">
                        <p className="max-w-[14rem] truncate font-medium sm:max-w-xs">
                          {row.name}
                        </p>
                        <p className="text-xs text-[var(--bv-muted)]">
                          {row.accountType === "corporate" ? "Firma" : "Kişi"}
                          {row.email ? ` · ${row.email}` : ""}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">{row.orderCount}</td>
                      <td className="py-2.5 text-right font-medium">
                        {formatCurrency(row.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportSection
          title="Stok sağlığı"
          description="Anlık envanter durumu"
          action={
            <Link
              href="/admin/stock"
              className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
            >
              Stok
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bv-border)] p-3">
              <p className="text-xs text-[var(--bv-muted)]">Ürün</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {report.stock.total}
              </p>
            </div>
            <div className="border border-[var(--bv-border)] p-3">
              <p className="text-xs text-[var(--bv-muted)]">Toplam birim</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {report.stock.units}
              </p>
            </div>
            <div className="border border-[var(--bv-border)] p-3">
              <p className="text-xs text-[var(--bv-muted)]">Düşük stok</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--bv-warning)]">
                {report.stock.lowStock}
              </p>
            </div>
            <div className="border border-[var(--bv-border)] p-3">
              <p className="text-xs text-[var(--bv-muted)]">Tükenen</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--bv-danger)]">
                {report.stock.outOfStock}
              </p>
            </div>
          </div>
          {report.stock.movements.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-sm">
              {report.stock.movements.map((row) => (
                <li key={row.type} className="flex justify-between gap-2">
                  <span className="text-[var(--bv-muted)]">{row.label}</span>
                  <span className="font-medium">
                    {row.quantity} adet · {row.count} hareket
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </ReportSection>

        <ReportSection
          title="Fatura tahsilat"
          description="Açık bakiyeler ve dönem tahsilatı"
          action={
            <Link
              href="/admin/invoices?odeme=open"
              className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
            >
              Faturalar
            </Link>
          }
        >
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--bv-muted)]">Ödenmedi</dt>
              <dd className="font-medium">{report.invoices.unpaidCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--bv-muted)]">Kısmi</dt>
              <dd className="font-medium">{report.invoices.partialCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--bv-muted)]">Ödendi</dt>
              <dd className="font-medium">{report.invoices.paidCount}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[var(--bv-border)] pt-2">
              <dt className="text-[var(--bv-muted)]">Açık bakiye</dt>
              <dd className="font-semibold text-[var(--bv-sale)]">
                {formatCurrency(report.invoices.openAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--bv-muted)]">Dönem tahsilatı</dt>
              <dd className="font-semibold text-[var(--bv-teal)]">
                {formatCurrency(report.invoices.collectedInRange)}
              </dd>
            </div>
          </dl>
          {report.invoices.methods.length > 0 ? (
            <ul className="mt-4 space-y-1.5 border-t border-[var(--bv-border)] pt-3 text-sm">
              {report.invoices.methods.map((row) => (
                <li key={row.method} className="flex justify-between gap-2">
                  <span className="text-[var(--bv-muted)]">{row.method}</span>
                  <span className="font-medium">
                    {formatCurrency(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </ReportSection>

        <ReportSection
          title="Müşteri & yorum"
          description="Segment ve değerlendirme özeti"
        >
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
              Segmentler
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {report.customerSegments.length === 0 ? (
                <li className="text-[var(--bv-muted)]">Veri yok</li>
              ) : (
                report.customerSegments.map((row) => (
                  <li key={row.segment} className="flex justify-between gap-2">
                    <span className="text-[var(--bv-muted)]">
                      {SEGMENT_LABELS[row.segment] ?? row.segment}
                    </span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="border-t border-[var(--bv-border)] pt-3">
            <p className="text-xs font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
              Yorumlar
            </p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--bv-muted)]">Onay bekleyen</dt>
                <dd className="font-medium">{report.reviews.pending}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--bv-muted)]">Yayında</dt>
                <dd className="font-medium">{report.reviews.approved}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--bv-muted)]">Ort. puan</dt>
                <dd className="font-medium">
                  {report.reviews.avgRating
                    ? `${report.reviews.avgRating}/5`
                    : "—"}
                </dd>
              </div>
            </dl>
            {report.reviews.pending > 0 ? (
              <Link
                href="/admin/reviews"
                className="mt-3 inline-block text-xs font-medium text-[var(--bv-teal)] hover:underline"
              >
                Onay kuyruğuna git
              </Link>
            ) : null}
          </div>
        </ReportSection>
      </div>
    </div>
  );
}
