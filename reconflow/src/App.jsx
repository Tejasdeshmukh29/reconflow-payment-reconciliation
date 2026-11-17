import React, { useMemo, useState } from "react";
import { Activity, ArrowDownToLine, CheckCircle2, CircleAlert, FileUp, LayoutDashboard, RefreshCw, Search, ShieldCheck, Table2, ClipboardList, SlidersHorizontal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { generateSampleData } from "./services/datasetGenerator.js";
import { reconcile, applySafeCorrections } from "./services/reconciliationEngine.js";
import { downloadCsv, parseCsvFile, validateHeaders } from "./services/csvService.js";
import { inr } from "./services/currency.js";

const initial = generateSampleData();
const nav = [
  ["Dashboard", LayoutDashboard], ["Import Data", FileUp], ["Transactions", Table2],
  ["Reconciliation", RefreshCw], ["Discrepancies", CircleAlert], ["Before & After", Activity],
  ["Audit Log", ClipboardList], ["Assumptions", ShieldCheck]
];
const requiredPlatform = ["transaction_id","customer_id","transaction_date","transaction_amount","transaction_type","payment_status","original_transaction_id","currency"];
const requiredBank = ["settlement_id","transaction_id","settlement_date","gross_amount","settlement_fee","net_amount","settlement_status","currency"];
const money = n => inr(n);

function Metric({ label, value, sub, icon: Icon, tone = "green" }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={18}/></div><div><div className="muted small">{label}</div><div className="metric-value">{value}</div>{sub && <div className="muted tiny">{sub}</div>}</div></div>;
}
function Status({ children }) {
  const c = String(children).toLowerCase();
  return <span className={`status ${c.includes("orphan") || c.includes("missing") || c.includes("duplicate") ? "red" : c.includes("timing") || c.includes("rounding") ? "amber" : "green"}`}>{children}</span>;
}
function App() {
  const [page, setPage] = useState("Dashboard");
  const [platform, setPlatform] = useState(initial.platform);
  const [bank, setBank] = useState(initial.bank);
  const [result, setResult] = useState(null);
  const [corrected, setCorrected] = useState(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Sample datasets loaded. Four discrepancy types are planted in the raw data.");
  const [tab, setTab] = useState("Platform");
  const [busy, setBusy] = useState(false);

  const filteredPlatform = useMemo(() => platform.filter(r => JSON.stringify(r).toLowerCase().includes(query.toLowerCase())), [platform, query]);
  const filteredBank = useMemo(() => bank.filter(r => JSON.stringify(r).toLowerCase().includes(query.toLowerCase())), [bank, query]);
  const run = () => {
    setBusy(true);
    const r = reconcile(platform, bank);
    setResult(r); setCorrected(null); setBusy(false);
    setNotice(`Reconciliation completed: ${r.issues.length} discrepancy records classified.`);
  };
  const apply = () => {
    if (!result) return;
    setCorrected(applySafeCorrections(platform, bank, result));
    setNotice("Safe corrections applied to a separate output dataset. Raw records remain unchanged.");
  };
  const upload = async (kind, file) => {
    if (!file) return;
    try {
      const parsed = await parseCsvFile(file);
      const missing = validateHeaders(parsed.fields, kind === "platform" ? requiredPlatform : requiredBank);
      if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);
      if (kind === "platform") setPlatform(parsed.data); else setBank(parsed.data);
      setResult(null); setCorrected(null);
      setNotice(`${file.name} loaded: ${parsed.data.length} records. Run reconciliation again.`);
    } catch (e) { setNotice(`Upload error: ${e.message}`); }
  };
  const summary = result?.summary;
  const issueData = result ? ["TIMING DIFFERENCE","ROUNDING DIFFERENCE","DUPLICATE","ORPHAN REFUND","MISSING SETTLEMENT"].map(name => ({ name: name.replace(" DIFFERENCE",""), count: result.issues.filter(x => x.type === name).length })) : [];
  const pageTitle = page;
  const downloadRows = (name, rows) => downloadCsv(name, rows);
  const table = (rows, cols) => <div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c.replaceAll("_"," ")}</th>)}</tr></thead><tbody>{rows.slice(0,250).map((r,i)=><tr key={i}>{cols.map(c=><td key={c}>{String(r[c] ?? "—")}</td>)}</tr>)}</tbody></table>{rows.length > 250 && <p className="muted tiny">Showing first 250 of {rows.length} records.</p>}</div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">R</div><div><b>ReconFlow</b><div className="muted tiny">PAYMENT OPERATIONS</div></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([name, Icon]) => <button key={name} className={`nav-item ${page===name?"active":""}`} onClick={()=>setPage(name)}><Icon size={17}/>{name}</button>)}
      <div className="sidebar-bottom"><div className="secure"><ShieldCheck size={16}/><span>Browser-based processing<br/><small>Your data stays in this session</small></span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">PAYMENT RECONCILIATION</div><h1>{pageTitle}</h1></div><div className="top-actions"><span className="live-dot"></span><span className="muted small">Demo dataset · INR</span><button className="button secondary" onClick={()=>{setPlatform(initial.platform);setBank(initial.bank);setResult(null);setCorrected(null);setNotice("Deterministic sample datasets restored.");}}><RefreshCw size={15}/> Reset sample</button></div></header>
      <div className="notice"><span className="notice-dot"></span>{notice}</div>

      {page==="Dashboard" && <section className="content">
        <div className="welcome"><div><h2>Month-end reconciliation overview</h2><p>Compare platform activity against bank settlements and investigate every variance.</p></div><button className="button primary" onClick={run} disabled={busy}><RefreshCw size={16}/>{busy?"Processing…":"Run reconciliation"}</button></div>
        <div className="metrics-grid">
          <Metric label="Platform transactions" value={platform.length} sub="Imported payment and refund rows" icon={Table2}/>
          <Metric label="Bank settlement records" value={bank.length} sub="Including raw duplicate rows" icon={Activity}/>
          <Metric label="Matched transactions" value={summary?.matchedCount ?? "—"} sub="Confirmed same-period matches" icon={CheckCircle2}/>
          <Metric label="Discrepancies found" value={summary ? result.issues.length : "—"} sub="Run reconciliation to calculate" icon={CircleAlert} tone="amber"/>
        </div>
        <div className="grid-two">
          <div className="panel"><div className="panel-head"><div><h3>Discrepancy distribution</h3><p className="muted small">Detected issue categories</p></div><span className="tag">Live results</span></div>
            {result ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={issueData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" fill="#16a34a" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div> : <div className="empty"><Activity size={28}/><b>No reconciliation results yet</b><span>Run reconciliation to populate the chart.</span></div>}
          </div>
          <div className="panel"><div className="panel-head"><div><h3>Financial position</h3><p className="muted small">Gross amount comparison (not net bank payout)</p></div></div>
            {summary ? <><div className="amount-line"><span>Platform gross</span><b>{money(summary.platformGrossPaise)}</b></div><div className="amount-line"><span>Bank gross, duplicate excluded</span><b>{money(summary.bankGrossPaise)}</b></div><div className="amount-line total"><span>Gross variance</span><b>{money(summary.grossDifferencePaise)}</b></div><div className="callout">Bank net settlement totals are reported separately because fees are deducted from gross.</div></> : <div className="empty"><ShieldCheck size={28}/><b>Awaiting reconciliation</b><span>Financial totals will appear after processing.</span></div>}
          </div>
        </div>
        <div className="panel"><div className="panel-head"><div><h3>Known planted scenarios</h3><p className="muted small">The sample data intentionally includes these assessment cases.</p></div><Status>4 scenarios</Status></div><div className="scenario-grid">{[["Timing","31 Oct payment settles 1 Nov"],["Rounding","Three one-paise bank gross variances"],["Duplicate","Repeated bank settlement reference"],["Orphan refund","Refund points to missing original payment"]].map(([a,b])=><div className="scenario" key={a}><b>{a}</b><span>{b}</span></div>)}</div></div>
      </section>}

      {page==="Import Data" && <section className="content"><div className="page-intro"><h2>Import source files</h2><p>Upload CSVs with the required headers, or continue with deterministic sample data.</p></div><div className="grid-two">
        {[["Platform transactions","platform",requiredPlatform,platform.length],["Bank settlements","bank",requiredBank,bank.length]].map(([label,kind,headers,count])=><div className="panel upload-panel" key={kind}><div className="upload-icon"><FileUp/></div><h3>{label}</h3><p className="muted small">{count} records currently loaded</p><label className="button primary file-button">Choose CSV<input type="file" accept=".csv,text/csv" onChange={e=>upload(kind,e.target.files?.[0])}/></label><div className="required"><b>Required columns</b><span>{headers.join(", ")}</span></div></div>)}
      </div><div className="panel"><h3>Sample dataset files</h3><p className="muted small">The raw CSVs contain the four planted discrepancy types.</p><div className="download-list"><button className="button secondary" onClick={()=>downloadRows("platform_transactions_raw.csv",platform)}>Download platform CSV <ArrowDownToLine size={15}/></button><button className="button secondary" onClick={()=>downloadRows("bank_settlements_raw.csv",bank)}>Download bank CSV <ArrowDownToLine size={15}/></button></div></div></section>}

      {page==="Transactions" && <section className="content"><div className="toolbar"><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transaction ID, customer, date…"/></div><div className="tabs"><button className={tab==="Platform"?"selected":""} onClick={()=>setTab("Platform")}>Platform ({platform.length})</button><button className={tab==="Bank"?"selected":""} onClick={()=>setTab("Bank")}>Bank ({bank.length})</button></div><button className="button secondary" onClick={()=>downloadRows(tab==="Platform"?"platform_transactions_raw.csv":"bank_settlements_raw.csv",tab==="Platform"?platform:bank)}><ArrowDownToLine size={15}/> Export CSV</button></div><div className="panel">{tab==="Platform"?table(filteredPlatform,requiredPlatform):table(filteredBank,requiredBank)}</div></section>}

      {page==="Reconciliation" && <section className="content"><div className="welcome"><div><h2>Reconciliation engine</h2><p>Deterministic matching, cross-month checks, duplicate detection and variance classification.</p></div><button className="button primary" onClick={run}><RefreshCw size={16}/> Run reconciliation</button></div>{result ? <><div className="metrics-grid compact"><Metric label="Matched" value={summary.matchedCount} icon={CheckCircle2}/><Metric label="Timing" value={summary.timingCount} icon={Activity} tone="amber"/><Metric label="Duplicates" value={summary.duplicateCount} icon={CircleAlert} tone="red"/><Metric label="Orphan refunds" value={summary.orphanRefundCount} icon={CircleAlert} tone="red"/></div><div className="panel"><div className="panel-head"><h3>Reconciliation summary</h3><Status>Completed</Status></div>{result.issues.length ? table(result.issues.map(x=>({transaction_id:x.id,type:x.type,source:x.source,amount_difference:(x.amountPaise/100).toFixed(2),detail:x.detail})),["transaction_id","type","source","amount_difference","detail"]) : <p>No discrepancies found.</p>}<div className="action-row"><button className="button primary" onClick={apply}><ShieldCheck size={16}/> Apply safe corrections</button><span className="muted tiny">Raw source data is never overwritten.</span></div></div></> : <div className="panel empty"><RefreshCw size={30}/><b>Ready to reconcile</b><span>Click “Run reconciliation” to analyze the loaded datasets.</span></div>}</section>}

      {page==="Discrepancies" && <section className="content"><div className="page-intro"><h2>Discrepancy register</h2><p>Each issue includes its source, evidence and recommended treatment.</p></div>{result ? <div className="panel">{result.issues.length ? <div className="issue-list">{result.issues.map((x,i)=><div className="issue" key={i}><div className="issue-top"><div><Status>{x.type}</Status><b>{x.id}</b></div><span className="money">{money(x.amountPaise)}</span></div><p>{x.detail}</p><div className="recommend"><b>Recommended action:</b> {x.action}</div></div>)}</div> : <p>No discrepancies detected.</p>}</div> : <div className="panel empty"><CircleAlert size={28}/><b>Run reconciliation first</b><span>Discrepancies will be listed here.</span></div>}</section>}

      {page==="Before & After" && <section className="content"><div className="page-intro"><h2>Before & after correction</h2><p>Compare the original records with the safe corrected output.</p></div>{result ? <><div className="grid-two"><div className="panel"><span className="eyebrow">BEFORE</span><h3>Raw dataset</h3><div className="amount-line"><span>Platform gross</span><b>{money(summary.platformGrossPaise)}</b></div><div className="amount-line"><span>Bank gross incl. duplicate</span><b>{money(bank.reduce((s,r)=>s+Math.round(Number(r.gross_amount)*100),0))}</b></div><div className="amount-line total"><span>Issue records</span><b>{result.issues.length}</b></div></div><div className="panel"><span className="eyebrow">AFTER</span><h3>Corrected output</h3>{corrected ? <><div className="amount-line"><span>Platform rows preserved</span><b>{corrected.correctedPlatform.length}</b></div><div className="amount-line"><span>Bank rows after duplicate exclusion</span><b>{corrected.correctedBank.length}</b></div><div className="amount-line total"><span>Open investigation items</span><b>{result.missing.length + result.orphanRefunds.length}</b></div></> : <div className="empty compact-empty"><span>Apply safe corrections to generate the output datasets.</span><button className="button primary" onClick={apply}>Apply safe corrections</button></div>}</div></div>{corrected && <div className="panel"><h3>Download corrected files</h3><div className="download-list"><button className="button secondary" onClick={()=>downloadRows("platform_transactions_corrected.csv",corrected.correctedPlatform)}>Corrected platform CSV <ArrowDownToLine size={15}/></button><button className="button secondary" onClick={()=>downloadRows("bank_settlements_corrected.csv",corrected.correctedBank)}>Corrected bank CSV <ArrowDownToLine size={15}/></button><button className="button secondary" onClick={()=>downloadRows("reconciliation_report.csv",corrected.report)}>Reconciliation report <ArrowDownToLine size={15}/></button></div><div className="callout">The orphan refund and missing settlements remain visible as investigation items. They are not silently deleted or fabricated.</div></div>}</> : <div className="panel empty"><Activity/><b>Run reconciliation first</b></div>}</section>}

      {page==="Audit Log" && <section className="content"><div className="page-intro"><h2>Audit trail</h2><p>Traceable actions generated by the reconciliation run.</p></div><div className="panel">{result?.audit.length ? <>{table(result.audit,["id","action","reason","from","to"])}<button className="button secondary" onClick={()=>downloadRows("audit_log.csv",result.audit)}><ArrowDownToLine size={15}/> Export audit log</button></> : <div className="empty"><ClipboardList/><b>No audit events yet</b><span>Run reconciliation to generate an audit trail.</span></div>}</div></section>}

      {page==="Assumptions" && <section className="content"><div className="page-intro"><h2>Reconciliation assumptions</h2><p>Explicit policy choices and safety boundaries for this assessment.</p></div><div className="panel assumptions">{[["Transaction matching","Transaction reference is the primary key. Amount equality alone is never sufficient to match records."],["Settlement timing","T+1 and T+2 are normal. Cross-month settlement is classified as a timing difference, not a permanent failure."],["Currency precision","All comparisons convert INR values to integer paise. Source amounts are never silently overwritten."],["Rounding","Small variances are reported explicitly. This demo records the observed difference; it does not invent balancing entries."],["Duplicates","Repeated bank transaction references are excluded from confirmed totals while the raw row is preserved."],["Refunds","Refunds must reference an existing original payment. Orphan refunds are flagged for manual investigation."],["Data preservation","Raw datasets remain unchanged. Corrections are generated as separate downloadable outputs."],["Production boundary","This demo uses browser memory and sample CSVs. It is not a bank-connected accounting system."]].map(([h,p])=><div className="assumption" key={h}><CheckCircle2 size={18}/><div><b>{h}</b><p>{p}</p></div></div>)}</div></section>}
      <footer>ReconFlow · Assessment demo · All processing runs locally in your browser.</footer>
    </main>
  </div>;
}
export default App;