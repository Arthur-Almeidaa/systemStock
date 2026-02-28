/**
 * Analytics.jsx
 * Analytics avançado: saída por requisição, tempo de giro, rotatividade, tendências
 */

import { useState, useEffect } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, query, orderBy, limit,
} from "firebase/firestore";

const _cfg = {
  apiKey: "AIzaSyBH3hxzhFe1IWyIO58wE2kcnL1lpxBy8ZM",
  authDomain: "sytemstock.firebaseapp.com",
  projectId: "sytemstock",
  storageBucket: "sytemstock.firebasestorage.app",
  messagingSenderId: "643733507908",
  appId: "1:643733507908:web:1d3bce112d337534799111",
};
const _app = getApps().length ? getApps()[0] : initializeApp(_cfg);
const db   = getFirestore(_app);

// ─── helpers ─────────────────────────────────────────────────
const COLS = {
  ti:"estoque_ti", exfood:"estoque_exfood", limpeza:"estoque_limpeza",
  ferramentas:"estoque_ferramentas", fti:"estoque_ferramentas_ti",
  fmanutencao:"estoque_ferramentas_manutencao",
};
const LABELS = {
  ti:"TI", exfood:"X-food", limpeza:"Limpeza",
  ferramentas:"Ferramentas", fti:"Ferramentas TI", fmanutencao:"Manutenção",
};
const gc = (setor, type) => `${COLS[setor]}_${type}`;

const DEFAULT_THRESH = { baixo:5, medio:15 };
const getStatus = (qtd, thresh) => {
  const t = thresh || DEFAULT_THRESH;
  if (qtd <= 0) return "zero";
  if (qtd <= t.baixo) return "baixo";
  if (qtd <= t.medio) return "medio";
  return "alto";
};
const statusLabel = (st) => {
  const m = { zero:["badge-zero","ZERADO"], baixo:["badge-low","BAIXO"], medio:["badge-med","MÉDIO"] };
  const [cls, txt] = m[st] || ["badge-ok","OK"];
  return <span className={`badge ${cls}`}>{txt}</span>;
};
const tsMs = (l) => {
  if (!l.ts) return 0;
  if (l.ts.toDate) return l.ts.toDate().getTime();
  if (l.ts.seconds) return l.ts.seconds * 1000;
  return new Date(l.ts).getTime();
};

// ─── ícones ──────────────────────────────────────────────────
const Svg = ({ size=14, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"inline-block", flexShrink:0 }}>
    {children}
  </svg>
);
const IcoSearch = () => <Svg size={14}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>;
const IcoX      = () => <Svg size={13}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;
const IcoTrend  = () => <Svg size={14}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Svg>;
const IcoClock  = () => <Svg size={14}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>;
const IcoReq    = () => <Svg size={14}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="8" y1="16" x2="8.01" y2="16"/></Svg>;

function SearchA({ value, onChange, placeholder="Buscar..." }) {
  return (
    <div style={{ display:"flex", alignItems:"center", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:"var(--r)", overflow:"hidden", marginBottom:14 }}>
      <span style={{ padding:"0 10px", color:"var(--text-dim)", display:"flex" }}><IcoSearch/></span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--text)", fontFamily:"var(--mono)", fontSize:13, padding:"10px 0" }}/>
      {value && <button onClick={() => onChange("")} style={{ padding:"0 10px", background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", display:"flex" }}><IcoX/></button>}
    </div>
  );
}

// ─── Mini bar chart ──────────────────────────────────────────
function MiniBar({ data, colorKey = "var(--accent)", max, label }) {
  const m = max || Math.max(...data.map(d => d.val), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{ fontFamily:"var(--display)", fontSize:9, color:"var(--text-dim)", minHeight:12 }}>{d.val || ""}</div>
          <div style={{ width:"100%", background:colorKey, borderRadius:"2px 2px 0 0", height:`${(d.val/m)*100}%`, minHeight:d.val?2:0, opacity:d.val?1:.12, transition:"height .3s" }}/>
          <div style={{ fontFamily:"var(--mono)", fontSize:8, color:"var(--text-dim)", whiteSpace:"nowrap" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Calcula dias médios para esgotar estoque ─────────────────
function calcDiasGiro(nomeProd, estoqueAtual, saidasLogs, diasJanela = 30) {
  const agora = Date.now();
  const cutoff = agora - diasJanela * 86400000;
  const total = saidasLogs
    .filter(l => l.produto === nomeProd && tsMs(l) >= cutoff)
    .reduce((a, l) => a + (Number(l.quantidade) || 1), 0);
  if (total === 0) return null; // sem saída no período
  const mediaDia = total / diasJanela;
  if (mediaDia === 0) return null;
  return Math.round(estoqueAtual / mediaDia);
}

// ─── Tendência: compara período atual vs anterior ─────────────
function calcTendencia(produto, logs, periodoMs) {
  const agora = Date.now();
  const atual  = logs.filter(l => l.produto === produto && tsMs(l) >= agora - periodoMs).reduce((a,l)=>a+(Number(l.quantidade)||1),0);
  const ant    = logs.filter(l => l.produto === produto && tsMs(l) >= agora - 2*periodoMs && tsMs(l) < agora - periodoMs).reduce((a,l)=>a+(Number(l.quantidade)||1),0);
  if (ant === 0 && atual === 0) return 0;
  if (ant === 0) return 100;
  return Math.round(((atual - ant) / ant) * 100);
}

// ============================================================
// ANALYTICS
// ============================================================
export function Analytics({ setor, products }) {
  const [periodo, setPeriodo] = useState("semana");
  const [viewTab, setViewTab] = useState("geral"); // geral | rotatividade | requisicoes
  const [todos, setTodos]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    setLoading(true);
    getDocs(query(collection(db, gc(setor, "log")), orderBy("ts", "desc"), limit(3000)))
      .then(s => setTodos(s.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, [setor]);

  const agora  = Date.now();
  const MS     = { dia:86400000, semana:604800000, mes:2592000000 };
  const cutoff = agora - (MS[periodo] || MS.semana);

  // Separar por tipo
  const todasSaidas   = todos.filter(l => l.tipo === "saida");
  const todasEntradas = todos.filter(l => l.tipo === "entrada");
  // Saídas por origem
  const saidasReq     = todasSaidas.filter(l => l.origem === "requisicao");
  const saidasManuais = todasSaidas.filter(l => l.origem !== "requisicao");

  // Filtrar por período
  const saidasF    = todasSaidas.filter(l => tsMs(l) >= cutoff);
  const entradasF  = todasEntradas.filter(l => tsMs(l) >= cutoff);
  const saidasReqF = saidasReq.filter(l => tsMs(l) >= cutoff);
  const saidasManF = saidasManuais.filter(l => tsMs(l) >= cutoff);

  // Totais
  const totalS    = saidasF.reduce((a,l) => a+(Number(l.quantidade)||1), 0);
  const totalE    = entradasF.reduce((a,l) => a+(Number(l.quantidade)||1), 0);
  const totalReq  = saidasReqF.reduce((a,l) => a+(Number(l.quantidade)||1), 0);
  const totalMan  = saidasManF.reduce((a,l) => a+(Number(l.quantidade)||1), 0);

  // Top saídas no período
  const sMap = {};
  saidasF.forEach(l => {
    const qtd = Number(l.quantidade) || 1;
    if (!l.produto) return;
    if (!sMap[l.produto]) sMap[l.produto] = { nome:l.produto, cat:l.categoria||"", total:0, req:0, manual:0 };
    sMap[l.produto].total += qtd;
    if (l.origem === "requisicao") sMap[l.produto].req += qtd;
    else sMap[l.produto].manual += qtd;
  });
  const topAll    = Object.values(sMap).sort((a,b) => b.total - a.total).slice(0, 10);
  const q         = search.toLowerCase();
  const topFiltro = q ? topAll.filter(i => i.nome.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q)) : topAll;
  const maxS      = topFiltro[0]?.total || topAll[0]?.total || 1;

  // Gráfico 7 dias com saída manual vs por requisição
  const dias7 = Array.from({ length:7 }, (_,i) => {
    const d = new Date(agora - (6-i)*86400000);
    return {
      label: d.toLocaleDateString("pt-BR", { weekday:"short" }),
      ini: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      fim: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime(),
    };
  });
  const grafico = dias7.map(d => ({
    label: d.label,
    e:    todasEntradas.filter(l => { const t=tsMs(l); return t>=d.ini&&t<=d.fim; }).reduce((a,l)=>a+(Number(l.quantidade)||1),0),
    sMan: saidasManuais.filter(l => { const t=tsMs(l); return t>=d.ini&&t<=d.fim; }).reduce((a,l)=>a+(Number(l.quantidade)||1),0),
    sReq: saidasReq.filter(l  => { const t=tsMs(l); return t>=d.ini&&t<=d.fim; }).reduce((a,l)=>a+(Number(l.quantidade)||1),0),
  }));
  const maxG = Math.max(...grafico.map(g => Math.max(g.e, g.sMan+g.sReq)), 1);

  // Alertas
  const alertasAll = products.filter(p => (p.quantidade||0) <= 5).sort((a,b) => (a.quantidade||0)-(b.quantidade||0));
  const alertas    = q ? alertasAll.filter(p => p.nome?.toLowerCase().includes(q) || p.categoria?.toLowerCase().includes(q)) : alertasAll;

  // ── Rotatividade ──────────────────────────────────────────
  // Para cada produto em estoque, calcula dias até zerar e % uso no período
  const rotatividade = products.map(p => {
    const diasGiro = calcDiasGiro(p.nome, p.quantidade||0, todasSaidas, 30);
    const saidaTotal30d = todasSaidas
      .filter(l => l.produto === p.nome && tsMs(l) >= agora - 30*86400000)
      .reduce((a,l) => a+(Number(l.quantidade)||1), 0);
    const entradaTotal30d = todasEntradas
      .filter(l => l.produto === p.nome && tsMs(l) >= agora - 30*86400000)
      .reduce((a,l) => a+(Number(l.quantidade)||1), 0);
    const tendencia = calcTendencia(p.nome, todasSaidas, MS[periodo] || MS.semana);
    const reqTotal = todasSaidas.filter(l => l.produto === p.nome && l.origem === "requisicao").reduce((a,l)=>a+(Number(l.quantidade)||1),0);
    const manTotal = todasSaidas.filter(l => l.produto === p.nome && l.origem !== "requisicao").reduce((a,l)=>a+(Number(l.quantidade)||1),0);
    return { ...p, diasGiro, saidaTotal30d, entradaTotal30d, tendencia, reqTotal, manTotal };
  }).filter(p => p.saidaTotal30d > 0 || p.quantidade > 0);

  const rotFiltro = q ? rotatividade.filter(p => p.nome?.toLowerCase().includes(q) || p.categoria?.toLowerCase().includes(q)) : rotatividade;
  const rotSort   = [...rotFiltro].sort((a,b) => b.saidaTotal30d - a.saidaTotal30d);

  // ── Saídas por requisição ─────────────────────────────────
  const reqMap = {};
  saidasReqF.forEach(l => {
    if (!l.produto) return;
    if (!reqMap[l.produto]) reqMap[l.produto] = { nome:l.produto, cat:l.categoria||"", total:0, pedidos:new Set() };
    reqMap[l.produto].total += Number(l.quantidade)||1;
    if (l.reqCodigo) reqMap[l.produto].pedidos.add(l.reqCodigo);
  });
  const topReq     = Object.values(reqMap).sort((a,b)=>b.total-a.total).slice(0,10);
  const topReqFilt = q ? topReq.filter(i=>i.nome.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)) : topReq;
  const maxReq     = topReqFilt[0]?.total || 1;

  if (loading) return <div className="empty"><span className="spinner"/></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">ANALYTICS</div>
        <div className="page-sub">{LABELS[setor]||setor} · {todos.length} registros totais</div>
      </div>

      <SearchA value={search} onChange={setSearch} placeholder="Filtrar produto ou categoria..."/>

      {/* Tabs de view */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["geral","📊 Geral"],["rotatividade","🔄 Rotatividade"],["requisicoes","📋 Por Requisição"]].map(([k,l])=>(
          <button key={k} className={`btn ${viewTab===k?"btn-accent":"btn-outline"}`} style={{ fontSize:11,padding:"7px 14px" }} onClick={()=>setViewTab(k)}>{l}</button>
        ))}
      </div>

      {/* Período — apenas nas tabs que usam */}
      {viewTab !== "rotatividade" && (
        <div className="period-tabs">
          {[["dia","Hoje"],["semana","Semana"],["mes","Mês"]].map(([k,l])=>(
            <button key={k} className={`ptab ${periodo===k?"active":""}`} onClick={()=>setPeriodo(k)}>{l}</button>
          ))}
        </div>
      )}

      {/* ══════════ TAB GERAL ══════════ */}
      {viewTab === "geral" && (
        <>
          {/* Stats cards */}
          <div className="stats-grid" style={{ marginBottom:18 }}>
            <div className="stat-card" style={{ "--c":"var(--danger)" }}>
              <div className="stat-label">Saídas Totais</div>
              <div className="stat-value" style={{ color:"var(--danger)" }}>{totalS}</div>
              <div className="stat-sub">no período</div>
            </div>
            <div className="stat-card" style={{ "--c":"#f87171" }}>
              <div className="stat-label">Por Requisição</div>
              <div className="stat-value" style={{ color:"#f87171" }}>{totalReq}</div>
              <div className="stat-sub">{totalS>0?Math.round((totalReq/totalS)*100):0}% do total</div>
            </div>
            <div className="stat-card" style={{ "--c":"var(--success)" }}>
              <div className="stat-label">Entradas</div>
              <div className="stat-value" style={{ color:"var(--success)" }}>{totalE}</div>
              <div className="stat-sub">no período</div>
            </div>
            <div className="stat-card" style={{ "--c":"var(--warn)" }}>
              <div className="stat-label">Alertas</div>
              <div className="stat-value" style={{ color:"var(--warn)" }}>{alertasAll.length}</div>
              <div className="stat-sub">estoque baixo</div>
            </div>
          </div>

          {/* Gráfico 7 dias — com 3 barras: entrada / saída manual / saída req */}
          {!search && (
            <div className="table-card" style={{ marginBottom:16 }}>
              <div className="table-card-header">
                <div className="table-card-title">MOVIMENTAÇÃO — 7 DIAS</div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--success)" }}>■ Entrada</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--danger)" }}>■ Saída Manual</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#f97316" }}>■ Requisição</span>
                </div>
              </div>
              <div style={{ padding:"16px 12px" }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                  {grafico.map((g,i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ fontFamily:"var(--display)", fontSize:9, color:"var(--text-dim)", minHeight:14 }}>
                        {(g.sMan+g.sReq)||""}
                      </div>
                      <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:80 }}>
                        {/* Entrada */}
                        <div style={{ flex:1, background:"var(--success)", borderRadius:"2px 2px 0 0", height:`${(g.e/maxG)*100}%`, minHeight:g.e?2:0, opacity:g.e?1:.12 }}/>
                        {/* Saída manual */}
                        <div style={{ flex:1, background:"var(--danger)", borderRadius:"2px 2px 0 0", height:`${(g.sMan/maxG)*100}%`, minHeight:g.sMan?2:0, opacity:g.sMan?1:.12 }}/>
                        {/* Saída por requisição */}
                        <div style={{ flex:1, background:"#f97316", borderRadius:"2px 2px 0 0", height:`${(g.sReq/maxG)*100}%`, minHeight:g.sReq?2:0, opacity:g.sReq?1:.12 }}/>
                      </div>
                      <div style={{ fontFamily:"var(--mono)", fontSize:8, color:"var(--text-dim)" }}>{g.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top saídas */}
          <div className="table-card" style={{ marginBottom:16 }}>
            <div className="table-card-header">
              <div className="table-card-title">TOP SAÍDAS — {periodo.toUpperCase()}</div>
              {search && <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)" }}>"{search}" · {topFiltro.length}</span>}
            </div>
            {topFiltro.length === 0
              ? <div className="empty">{search?`Nenhum resultado para "${search}".`:"Sem saídas no período."}</div>
              : topFiltro.map((item, i) => (
                <div key={item.nome} className="rank-row">
                  <div className={`rank-num ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i+1}</div>
                  <div className="rank-info">
                    <div className="rank-name">{item.nome}</div>
                    <div className="rank-cat">{item.cat}</div>
                    {/* Origem breakdown */}
                    <div style={{ display:"flex", gap:8, marginTop:3 }}>
                      {item.req > 0 && <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#f97316" }}>📋 {item.req} req.</span>}
                      {item.manual > 0 && <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--danger)" }}>✋ {item.manual} manual</span>}
                    </div>
                  </div>
                  <div className="rank-bar-wrap">
                    {/* Barra empilhada req + manual */}
                    <div style={{ height:5, background:"var(--border2)", borderRadius:3, overflow:"hidden", marginBottom:3, display:"flex" }}>
                      <div style={{ width:`${(item.req/maxS)*100}%`, background:"#f97316", borderRadius:"3px 0 0 3px" }}/>
                      <div style={{ width:`${(item.manual/maxS)*100}%`, background:"var(--danger)" }}/>
                    </div>
                    <div className="rank-sub">{item.total} un.</div>
                  </div>
                  <div className="rank-val">{item.total}</div>
                </div>
              ))}
          </div>

          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="table-card">
              <div className="table-card-header">
                <div className="table-card-title">ALERTAS DE ESTOQUE</div>
                {search && <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)" }}>{alertas.length} result.</span>}
              </div>
              {alertas.map(p => (
                <div key={p.id} className="alert-row">
                  <div className="alert-days" style={{ color:(p.quantidade||0)===0?"var(--danger)":"var(--accent)" }}>{p.quantidade||0}</div>
                  <div className="alert-info"><div className="alert-name">{p.nome}</div><div className="alert-sub">{p.categoria}</div></div>
                  {statusLabel(getStatus(p.quantidade||0, DEFAULT_THRESH))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════ TAB ROTATIVIDADE ══════════ */}
      {viewTab === "rotatividade" && (
        <>
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:14, padding:"10px 14px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)" }}>
            Baseado nos últimos 30 dias. "Dias para zerar" = estoque atual ÷ média diária de saídas.
          </div>

          <div className="table-card" style={{ marginBottom:16 }}>
            <div className="table-card-header">
              <div className="table-card-title">ROTATIVIDADE DE PRODUTOS</div>
              <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>30 dias</span>
            </div>
            {rotSort.length === 0
              ? <div className="empty">Sem dados suficientes.</div>
              : rotSort.map((p, i) => {
                  const diasCorStr = p.diasGiro === null ? "—" : p.diasGiro > 999 ? "999+" : String(p.diasGiro);
                  const diasColor  = p.diasGiro === null ? "var(--text-dim)" : p.diasGiro <= 7 ? "var(--danger)" : p.diasGiro <= 30 ? "var(--warn)" : "var(--success)";
                  const pctReq     = (p.reqTotal + p.manTotal) > 0 ? Math.round((p.reqTotal/(p.reqTotal+p.manTotal))*100) : 0;
                  const tend       = p.tendencia;
                  return (
                    <div key={p.id||p.nome} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
                      {/* Posição */}
                      <div className={`rank-num ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`} style={{ fontSize:16 }}>{i+1}</div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"var(--sans)", fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.nome}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>{p.categoria}</div>
                        {/* Barra req vs manual */}
                        {(p.reqTotal + p.manTotal) > 0 && (
                          <div style={{ marginTop:5 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                              <div style={{ flex:1, height:4, background:"var(--border2)", borderRadius:2, overflow:"hidden", display:"flex" }}>
                                <div style={{ width:`${pctReq}%`, background:"#f97316" }}/>
                                <div style={{ flex:1, background:"var(--danger)" }}/>
                              </div>
                              <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#f97316", whiteSpace:"nowrap" }}>{pctReq}% req</span>
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              {p.reqTotal > 0 && <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#f97316" }}>📋 {p.reqTotal}</span>}
                              {p.manTotal > 0 && <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--danger)" }}>✋ {p.manTotal}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Saídas 30d */}
                      <div style={{ textAlign:"center", flexShrink:0 }}>
                        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", marginBottom:2 }}>30 DIAS</div>
                        <div style={{ fontFamily:"var(--display)", fontSize:20, color:"var(--danger)" }}>{p.saidaTotal30d}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)" }}>saídas</div>
                      </div>

                      {/* Tendência */}
                      <div style={{ textAlign:"center", flexShrink:0, minWidth:40 }}>
                        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", marginBottom:2 }}>TEND.</div>
                        <div style={{ fontFamily:"var(--display)", fontSize:16, color: tend > 0 ? "var(--danger)" : tend < 0 ? "var(--success)" : "var(--text-dim)" }}>
                          {tend > 0 ? `↑${tend}` : tend < 0 ? `↓${Math.abs(tend)}` : "—"}%
                        </div>
                      </div>

                      {/* Dias para zerar */}
                      <div style={{ textAlign:"center", flexShrink:0, minWidth:52 }}>
                        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", marginBottom:2 }}>ZERA EM</div>
                        <div style={{ fontFamily:"var(--display)", fontSize:22, color:diasColor }}>{diasCorStr}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)" }}>dias</div>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Mini charts por produto (top 5) */}
          {rotSort.slice(0,5).map(p => {
            const chartData = dias7.map(d => ({
              label: d.label,
              val: todasSaidas.filter(l => l.produto===p.nome && tsMs(l)>=d.ini && tsMs(l)<=d.fim).reduce((a,l)=>a+(Number(l.quantidade)||1),0),
            }));
            const maxC = Math.max(...chartData.map(d=>d.val), 1);
            if (maxC === 1 && chartData.every(d=>d.val===0)) return null;
            return (
              <div key={p.id||p.nome} className="table-card" style={{ marginBottom:10 }}>
                <div className="table-card-header">
                  <div style={{ flex:1 }}>
                    <div className="table-card-title">{p.nome}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)" }}>{p.categoria}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--display)", fontSize:20, color:"var(--accent)" }}>{p.quantidade||0}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)" }}>em estoque</div>
                  </div>
                </div>
                <div style={{ padding:"10px 16px" }}>
                  <MiniBar data={chartData} colorKey="var(--accent)" max={maxC}/>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ══════════ TAB REQUISIÇÕES ══════════ */}
      {viewTab === "requisicoes" && (
        <>
          {/* Stats específicos */}
          <div className="stats-grid" style={{ marginBottom:18 }}>
            <div className="stat-card" style={{ "--c":"#f97316" }}>
              <div className="stat-label">Saídas via Req.</div>
              <div className="stat-value" style={{ color:"#f97316" }}>{totalReq}</div>
              <div className="stat-sub">unidades</div>
            </div>
            <div className="stat-card" style={{ "--c":"var(--danger)" }}>
              <div className="stat-label">Saídas Manuais</div>
              <div className="stat-value" style={{ color:"var(--danger)" }}>{totalMan}</div>
              <div className="stat-sub">unidades</div>
            </div>
            <div className="stat-card" style={{ "--c":"var(--accent)" }}>
              <div className="stat-label">% Requisições</div>
              <div className="stat-value" style={{ color:"var(--accent)" }}>{totalS>0?Math.round((totalReq/totalS)*100):0}%</div>
              <div className="stat-sub">do total de saídas</div>
            </div>
            <div className="stat-card" style={{ "--c":"var(--success)" }}>
              <div className="stat-label">Produtos via Req.</div>
              <div className="stat-value" style={{ color:"var(--success)" }}>{Object.keys(reqMap).length}</div>
              <div className="stat-sub">SKUs distintos</div>
            </div>
          </div>

          {/* Gráfico saídas: req vs manual 7 dias */}
          {!search && (
            <div className="table-card" style={{ marginBottom:16 }}>
              <div className="table-card-header">
                <div className="table-card-title">ORIGEM DAS SAÍDAS — 7 DIAS</div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#f97316" }}>■ Requisição</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--danger)" }}>■ Manual</span>
                </div>
              </div>
              <div style={{ padding:"16px 12px" }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100 }}>
                  {grafico.map((g,i) => {
                    const tot = g.sMan + g.sReq;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                        <div style={{ fontFamily:"var(--display)", fontSize:9, color:"var(--text-dim)", minHeight:14 }}>{tot||""}</div>
                        {/* Stacked bar */}
                        <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"stretch", height:72, justifyContent:"flex-end" }}>
                          <div style={{ background:"#f97316", width:"100%", height:`${(g.sReq/maxG)*100}%`, minHeight:g.sReq?2:0 }}/>
                          <div style={{ background:"var(--danger)", width:"100%", height:`${(g.sMan/maxG)*100}%`, minHeight:g.sMan?2:0 }}/>
                        </div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:8, color:"var(--text-dim)" }}>{g.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top por requisição */}
          <div className="table-card" style={{ marginBottom:16 }}>
            <div className="table-card-header">
              <div className="table-card-title">TOP PRODUTOS VIA REQUISIÇÃO — {periodo.toUpperCase()}</div>
              {search && <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)" }}>{topReqFilt.length}</span>}
            </div>
            {topReqFilt.length === 0
              ? <div className="empty">Sem saídas por requisição no período.</div>
              : topReqFilt.map((item, i) => (
                <div key={item.nome} className="rank-row">
                  <div className={`rank-num ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i+1}</div>
                  <div className="rank-info">
                    <div className="rank-name">{item.nome}</div>
                    <div className="rank-cat">{item.cat}</div>
                    {item.pedidos.size > 0 && <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", marginTop:2 }}>{item.pedidos.size} pedido{item.pedidos.size!==1?"s":""}</div>}
                  </div>
                  <div className="rank-bar-wrap">
                    <div className="rank-bar-track"><div className="rank-bar-fill" style={{ width:`${(item.total/maxReq)*100}%`, background:"#f97316" }}/></div>
                    <div className="rank-sub">{item.total} un.</div>
                  </div>
                  <div className="rank-val" style={{ color:"#f97316" }}>{item.total}</div>
                </div>
              ))}
          </div>

          {/* Log de saídas por requisição */}
          <div className="table-card">
            <div className="table-card-header">
              <div className="table-card-title">ÚLTIMAS SAÍDAS POR REQUISIÇÃO</div>
            </div>
            {saidasReqF.length === 0
              ? <div className="empty">Nenhuma saída por requisição no período.</div>
              : saidasReqF.slice(0, 20).map(l => {
                  const t = tsMs(l);
                  const dt = t ? new Date(t).toLocaleString("pt-BR") : "—";
                  return (
                    <div key={l.id} style={{ display:"grid", gridTemplateColumns:"8px 1fr auto", gap:10, alignItems:"start", padding:"10px 16px", borderBottom:"1px solid var(--border)" }}>
                      <div><div style={{ width:7, height:7, borderRadius:"50%", background:"#f97316", marginTop:4 }}/></div>
                      <div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:12 }}>
                          <span style={{ marginRight:6, background:"rgba(249,115,22,.12)", border:"1px solid #f97316", color:"#f97316", padding:"1px 6px", fontSize:9, borderRadius:2, fontFamily:"var(--mono)", letterSpacing:1 }}>REQ</span>
                          {Number(l.quantidade)||1}x {l.produto}
                          {l.reqCodigo && <span style={{ color:"var(--accent)", marginLeft:6, fontSize:10 }}>#{l.reqCodigo}</span>}
                        </div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginTop:2 }}>{l.categoria}{l.usuario ? ` · ${l.usuario}` : ""}</div>
                      </div>
                      <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", whiteSpace:"nowrap" }}>{dt}</div>
                    </div>
                  );
                })}
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;