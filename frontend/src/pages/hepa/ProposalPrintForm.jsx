import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProposalDetail } from '../../hooks/useProposalDetail';
import { formatDateTime, formatMoney, formatTimeRange } from '../../utils/format';
import { proposalCode } from '../../utils/proposalCode';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

const FORM_BUDGET_LIMIT = 5000;
const LINE = 16;
const CHARS_PER_LINE = 52;

const PAGE_STYLE = `
  @page { size: A4; margin: 0; }
  .bhep-sheet {
    font-family: 'Century Gothic', 'URW Gothic', 'Avant Garde', Futura, 'Segoe UI', sans-serif;
    color: #000; box-sizing: border-box; width: 210mm; min-height: 297mm;
    padding: 12mm 15mm 10mm 28mm;
  }
  @media print {
    html, body { background: #fff !important; }
    .bhep-screen-bg { background: #fff !important; padding: 0 !important; }
    .bhep-scroll { overflow: visible !important; }
    .bhep-sheet { box-shadow: none !important; margin: 0 !important; min-height: 0 !important; }
    .bhep-page-break { break-before: page; }
  }
`;

function dmy(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Ruled({ children, lines = 1, className = '', style }) {
  const text = children == null ? '' : String(children);
  const count = Math.max(lines, Math.ceil(text.length / CHARS_PER_LINE));
  return (
    <div className={`relative ${className}`} style={{ minHeight: count * LINE, lineHeight: `${LINE}px`, ...style }}>
      {Array.from({ length: count }, (_, k) => (
        <div key={k} aria-hidden="true" className="absolute inset-x-0 border-b border-black" style={{ top: (k + 1) * LINE - 1 }} />
      ))}
      <div className="relative break-words pl-1">{text || ' '}</div>
    </div>
  );
}

function Item({ n, label, note, gap = 12, children }) {
  return (
    <div className="grid grid-cols-[23px_185px_10px_1fr] items-start text-[12px]" style={{ lineHeight: `${LINE}px`, marginTop: gap }}>
      <span>{n ? `${n}.` : ''}</span>
      <span>
        {label}
        {note && <span className="block italic">{note}</span>}
      </span>
      <span>:</span>
      <div>{children}</div>
    </div>
  );
}

function SignatureLine({ caption, width, space }) {
  return (
    <div className="text-center" style={{ paddingTop: space }}>
      <div className="mx-auto border-t border-black" style={{ width }} />
      <div className="text-[11.5px] font-bold" style={{ lineHeight: '15px' }}>{caption}</div>
    </div>
  );
}

function OfficeField({ label, bold = false, ruled = false, lineWidth, children, pitch = 14 }) {
  return (
    <div className="flex items-end text-[11.5px]" style={{ lineHeight: `${pitch}px` }}>
      <span className={`shrink-0 ${bold ? 'font-bold' : ''}`}>{label}</span>
      {ruled && (
        <div className="relative ml-1" style={{ width: lineWidth, height: pitch }}>
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 border-b border-black" />
          <span className="relative pl-1">{children}</span>
        </div>
      )}
    </div>
  );
}

function ColonLine({ label, width }) {
  return (
    <div className="flex items-end text-[11.5px]" style={{ lineHeight: '15px' }}>
      <span className="w-[138px] shrink-0">{label}</span>
      <span>:</span>
      <div className={`relative ml-1 ${width ? '' : 'mr-[26px] flex-1'}`} style={{ width, height: 15 }}>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 border-b border-black" />
      </div>
    </div>
  );
}

export default function ProposalPrintForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error } = useProposalDetail(id);
  const back = `/hepa/proposals/${id}`;

  if (error) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Link to={back} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to proposal
        </Link>
        <Alert variant="error">{error}</Alert>
      </main>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading proposal" />
      </div>
    );
  }

  const { proposal: p, budget_items: items, activity } = data;
  const code = proposalCode(p);
  const firstSubmit = activity.find((a) => a.action === 'PROPOSAL_SUBMITTED');
  const appliedOn = firstSubmit?.created_at || p.created_at;
  const lastSubmit = activity.filter((a) => a.action === 'PROPOSAL_SUBMITTED' || a.action === 'PROPOSAL_RESUBMITTED').at(-1);
  const submittedOn = lastSubmit?.created_at || appliedOn;
  const organizer = p.organizer_name || p.club_name;
  const time = formatTimeRange(p.event_time, p.end_time);
  const overLimit = Number(p.budget_amount) > FORM_BUDGET_LIMIT;

  return (
    <div className="bhep-screen-bg min-h-screen bg-slate-100 pb-10">
      <style>{PAGE_STYLE}</style>

      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to={back} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to proposal
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-slate-500 sm:block">Print it, or choose “Save as PDF” in the print dialog.</p>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
            </Button>
          </div>
        </div>
        {overLimit && (
          <p className="mx-auto flex max-w-[210mm] items-start gap-2 px-4 pb-3 text-sm text-amber-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This proposal asks for {formatMoney(p.budget_amount)}. This form is for budgets under RM5,000.00, so check whether a different approval route applies.
          </p>
        )}
      </div>

      <div className="bhep-scroll overflow-x-auto">
        <article className="bhep-sheet relative mx-auto mt-6 bg-white shadow-md">
          <p className="absolute right-[15mm] top-[12mm] text-[13px]">BHEP.ML.01.04A-00</p>
          <div className="flex justify-center pl-[4%]">
            <img src="/uptm-logo.png" alt="Universiti Poly-Tech Malaysia" className="h-[64px] w-auto" />
          </div>

          <h1 className="mt-[23px] text-center text-[12.5px] font-bold" style={{ lineHeight: '17px' }}>
            PERMOHONAN PERUNTUKAN BAJET ATAP KOS DI BAWAH RM5,000.00 UNTUK KELULUSAN
            <br />
            PENGERUSI JAWATANKUASA ATAP KOLEJ
          </h1>

          <div className="mt-[20px] flex justify-center pl-[8%]">
            <h2 className="flex h-[27px] w-[193px] items-center justify-center border border-black text-[13.5px] font-bold">MAKLUMAT PEMOHON</h2>
          </div>

          <div className="ml-[42px] mr-[62px] mt-[14px]">
            <Item n={1} label="TARIKH PERMOHONAN" gap={0}><Ruled>{dmy(appliedOn)}</Ruled></Item>
            <Item n={2} label="NAMA PEMOHON" gap={0}><Ruled>{p.contact_person || p.submitted_by_name}</Ruled></Item>
            <Item n={3} label="NO ID PELAJAR" gap={0}>
              <div className="flex items-end">
                <Ruled className="w-[100px] shrink-0">{p.applicant_id_number}</Ruled>
                <span className="shrink-0 px-1">NO. KP :</span>
                <Ruled className="min-w-0 flex-1">{p.applicant_ic_number}</Ruled>
              </div>
            </Item>
            <Item n={4} label="NAMA PROGRAM" gap={0}><Ruled>{p.title}</Ruled></Item>
            <Item n={5} label="PENGANJUR" gap={0}><Ruled>{organizer}</Ruled></Item>
            <Item n={6} label="TARIKH PROGRAM" gap={0}><Ruled>{`${dmy(p.event_date)}${time ? `  (${time})` : ''}`}</Ruled></Item>
            <Item n={7} label="LOKASI PROGRAM" note="(Jika Berkenaan)" gap={0}><Ruled>{p.venue}</Ruled></Item>
            <Item n={8} label="BIL PESERTA" note="(Anggaran)" gap={9}><Ruled>{p.estimated_participants}</Ruled></Item>
            <Item n={9} label="OBJEKTIF" gap={0}><Ruled lines={3}>{p.objective}</Ruled></Item>

            <div className="mt-[16px] grid grid-cols-[23px_1fr] text-[12px]" style={{ lineHeight: `${LINE}px` }}>
              <span>10.</span>
              <span>IMPLIKASI KEWANGAN<span className="inline-block w-[16px]" />: SILA SERTAKAN LAMPIRAN / DOKUMEN SOKONGAN</span>
            </div>

            <Item n={11} label="TANDATANGAN PEMOHON" gap={12}><Ruled className="w-[150px]" /></Item>
            <Item label="JAWATAN" gap={12}><Ruled>{p.applicant_position}</Ruled></Item>
            <Item label="NO. H/P" gap={12}>
              <div className="flex items-end">
                <Ruled className="w-[133px] shrink-0">{p.contact_info || p.submitted_by_phone}</Ruled>
                <span className="shrink-0 px-1">TARIKH :</span>
                <Ruled className="min-w-0 flex-1">{dmy(submittedOn)}</Ruled>
              </div>
            </Item>
          </div>

          <p className="ml-[17px] mt-[14px] text-[12px] italic">Untuk Kegunaan Pejabat</p>
          <div className="mt-[8px] border border-black">
            <div className="grid grid-cols-[48.6%_1fr]">
              <div className="border-r border-black px-[8px] pb-[6px] pt-[6px]">
                <p className="text-center text-[11.5px] font-bold">DISOKONG / TIDAK DISOKONG</p>
                <SignatureLine caption="TANDATANGAN PENASIHAT/BHEP" width={210} space={62} />
                <div className="mt-[4px]">
                  <OfficeField label="NAMA:" />
                  <OfficeField label="JAWATAN:" />
                  <OfficeField label="TARIKH:" />
                </div>
              </div>
              <div className="px-[8px] pb-[6px] pt-[6px]">
                <OfficeField label="KATEGORI :" bold ruled lineWidth={180} />
                <OfficeField label="BAJET DIMOHON :" bold ruled lineWidth={146} />
                <OfficeField label="KOS PEPELAJAR :" bold ruled lineWidth={150} />
                <SignatureLine caption="TANDATANGAN SETIAUSAHA ATAP KOLEJ" width={245} space={40} />
                <div className="mt-[4px]">
                  <OfficeField label="NAMA:" />
                  <OfficeField label="JAWATAN:" />
                  <OfficeField label="TARIKH:" />
                </div>
              </div>
            </div>
            <div className="border-t border-black px-[8px] pb-[10px] pt-[6px]">
              <p className="text-center text-[11.5px] font-bold">LULUS / TIDAK DILULUSKAN</p>
              <SignatureLine caption="TANDATANGAN PENGARAH" width={184} space={34} />
              <p className="text-center text-[11.5px]" style={{ lineHeight: '15px' }}>COP NAMA &amp; JAWATAN</p>
              <div className="mt-[4px] space-y-[12px]">
                <ColonLine label="BAJET DILULUSKAN (RM)" width={116} />
                <ColonLine label="TARIKH" width={116} />
                <ColonLine label="CATATAN (Jika Ada)" />
              </div>
            </div>
          </div>
        </article>

        <article className="bhep-sheet bhep-page-break mx-auto mt-6 bg-white shadow-md">
          <div className="flex items-start justify-between text-[11.5px]">
            <span>Rujukan SEMS: {code}</span>
            <span>BHEP.ML.01.04A-00</span>
          </div>
          <h2 className="mt-6 text-center text-[13px] font-bold">LAMPIRAN A</h2>
          <p className="text-center text-[12.5px] font-bold">IMPLIKASI KEWANGAN: ANGGARAN PERBELANJAAN</p>
          <p className="mt-1 text-center text-[11.5px]">{p.title} · {organizer}</p>

          {items.length === 0 ? (
            <p className="mt-6 text-[12px]">
              Tiada pecahan perbelanjaan diberikan. Jumlah dipohon: <strong>{formatMoney(p.budget_amount)}</strong>
            </p>
          ) : (
            <table className="mt-5 w-full border-collapse text-[11.5px]">
              <thead>
                <tr>
                  {['Bil.', 'Perkara', 'Keterangan', 'Kuantiti', 'Harga Seunit (RM)', 'Jumlah (RM)'].map((h, i) => (
                    <th key={h} className={`border border-black px-2 py-1.5 font-bold ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((i, n) => (
                  <tr key={i.id} className="break-inside-avoid align-top">
                    <td className="border border-black px-2 py-1.5">{n + 1}</td>
                    <td className="border border-black px-2 py-1.5">{i.item}</td>
                    <td className="border border-black px-2 py-1.5">{i.description || '—'}</td>
                    <td className="border border-black px-2 py-1.5 text-right tabular-nums">{Number(i.quantity)}</td>
                    <td className="border border-black px-2 py-1.5 text-right tabular-nums">{Number(i.unit_price).toFixed(2)}</td>
                    <td className="border border-black px-2 py-1.5 text-right tabular-nums">{(Number(i.quantity) * Number(i.unit_price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={5} className="border border-black px-2 py-1.5 text-right">JUMLAH KESELURUHAN</td>
                  <td className="border border-black px-2 py-1.5 text-right tabular-nums">{Number(p.budget_amount).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          <h3 className="mt-8 text-[12.5px] font-bold">MAKLUMAT TAMBAHAN PROGRAM</h3>
          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <tbody>
              {[
                ['Masa program', time],
                ['Kumpulan sasaran', p.target_participants],
                ['Dihantar melalui akaun SEMS', p.submitted_by_name],
                ['Emel akaun', p.submitted_by_email],
                ['Penerangan program', p.description],
              ].map(([label, value]) => (
                <tr key={label} className="align-top">
                  <th scope="row" className="w-44 border border-black px-2 py-1.5 text-left font-semibold">{label}</th>
                  <td className="whitespace-pre-wrap border border-black px-2 py-1.5">{value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-8 border-t border-gray-400 pt-1.5 text-[9.5px] text-gray-600">
            Dijana oleh SEMS pada {formatDateTime(new Date().toISOString())}{user?.name ? ` oleh ${user.name}` : ''} · {code} · versi {p.version}.
            Maklumat di atas diisi oleh jawatankuasa kelab melalui SEMS.
          </p>
        </article>
      </div>
    </div>
  );
}
