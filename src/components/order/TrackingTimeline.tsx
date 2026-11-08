import { trackingStatusLabel, trackWaybill } from "@/lib/shipping";

const dt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export async function TrackingTimeline({ waybill, courierCode }: { waybill: string; courierCode: string }) {
  const t = await trackWaybill(waybill, courierCode);
  if (!t) return <p className="mt-3 text-sm text-muted">Data pelacakan belum tersedia. Coba lagi beberapa saat lagi.</p>;
  return (
    <div className="mt-4">
      <p className="text-sm">
        Status: <strong className="text-plum">{trackingStatusLabel(t.status)}</strong>
        {t.link && (
          <a href={t.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-plum underline">Lihat di situs kurir</a>
        )}
      </p>
      <ol className="mt-3 space-y-3 border-l border-line pl-4">
        {t.history.map((h, i) => (
          <li key={i} className="relative text-sm">
            <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-plum" : "bg-line"}`} />
            <span className={i === 0 ? "text-ink" : "text-muted"}>{h.note}</span>
            <span className="block text-xs text-muted">{dt.format(new Date(h.at))} WIB</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
