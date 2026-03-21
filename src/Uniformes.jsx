/**
 * Uniformes.jsx — v6
 *
 * Estrutura:
 *   - Produto = nome único com cor (ex: "Camiseta Polo")
 *   - Variação = tamanho + quantidade dentro daquele produto
 *   - Quando o admin cria "Camiseta Polo" TAM G, aparece 1 card "Camiseta Polo"
 *   - Ao criar nova variação do mesmo nome → não cria novo card, soma à lista interna
 *   - Clicando no card → lista os tamanhos/quantidades → clicar no tamanho → enviar p/ user ou descartar
 *
 * Firestore:
 *   uniformes_produtos   { nome, cor, criadoEm }             ← 1 doc por nome único
 *   uniformes_variacoes  { produtoId, produtoNome, tamanho, quantidade }
 *   uniformes_usuarios   { nome, setor, cor }
 *   uniformes_itens      { userId, userName, produtoId, produtoNome, variacaoId, tamanho, cor, qtd, data }
 *   uniformes_log        { acao, desc, ts }
 *   uniformes_config_setores { nome, cor }
 */

import { useState, useEffect, useCallback } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  deleteDoc, updateDoc, serverTimestamp, query, orderBy, writeBatch, getDoc,
} from "firebase/firestore";

const _app = getApps().length ? getApps()[0] : initializeApp({
  apiKey: "AIzaSyBH3hxzhFe1IWyIO58wE2kcnL1lpxBy8ZM",
  authDomain: "sytemstock.firebaseapp.com",
  projectId: "sytemstock",
  storageBucket: "sytemstock.firebasestorage.app",
  messagingSenderId: "643733507908",
  appId: "1:643733507908:web:1d3bce112d337534799111",
});
const db = getFirestore(_app);

const COL = {
  produtos:  "uniformes_produtos",
  variacoes: "uniformes_variacoes",
  usuarios:  "uniformes_usuarios",
  itens:     "uniformes_itens",
  log:       "uniformes_log",
  setores:   "uniformes_config_setores",
};

const PALETTE = ["#3b82f6","#8b5cf6","#f59e0b","#10b981","#ef4444","#f97316","#06b6d4","#ec4899"];

const fmt = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
};

async function log(acao, desc) {
  await addDoc(collection(db, COL.log), { acao, desc, ts: serverTimestamp() });
}

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  .ur {
    --bg:    #0d0d0f;
    --s1:    #141416;
    --s2:    #1c1c20;
    --s3:    #242428;
    --b:     rgba(255,255,255,.07);
    --b2:    rgba(255,255,255,.13);
    --text:  #f0f0f2;
    --muted: #64647a;
    --dim:   #33333d;
    --acc:   #f5a623;
    --ok:    #22c55e;
    --err:   #f43f5e;
    --info:  #38bdf8;
    --warn:  #fbbf24;
    --r:     10px;
    --rs:    6px;
    font-family:'Plus Jakarta Sans',sans-serif;
    color:var(--text);
  }
  .ur *{box-sizing:border-box;margin:0;padding:0;}
  .ur input,.ur select,.ur textarea{font-size:16px !important;-webkit-text-size-adjust:100%;}

  /* Tabs */
  .ur-tabs{display:flex;gap:3px;background:var(--s2);border:1px solid var(--b);border-radius:12px;padding:4px;width:fit-content;margin-bottom:22px;}
  .ur-tab{display:flex;align-items:center;gap:7px;padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:var(--muted);background:transparent;transition:all .2s;white-space:nowrap;}
  .ur-tab.on{background:var(--s3);color:var(--text);box-shadow:0 2px 10px rgba(0,0,0,.5);}

  /* Buttons */
  .ub{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:var(--rs);border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;line-height:1;}
  .ub:disabled{opacity:.38;cursor:not-allowed;}
  .ub-acc{background:var(--acc);color:#0d0d0f;}
  .ub-acc:hover:not(:disabled){filter:brightness(1.08);}
  .ub-ghost{background:transparent;color:var(--muted);border:1px solid var(--b2);}
  .ub-ghost:hover:not(:disabled){color:var(--text);background:var(--s3);}
  .ub-err{background:rgba(244,63,94,.1);color:var(--err);border:1px solid rgba(244,63,94,.3);}
  .ub-err:hover:not(:disabled){background:rgba(244,63,94,.18);}
  .ub-ok{background:rgba(34,197,94,.1);color:var(--ok);border:1px solid rgba(34,197,94,.3);}
  .ub-ok:hover:not(:disabled){background:rgba(34,197,94,.18);}
  .ub-info{background:rgba(56,189,248,.1);color:var(--info);border:1px solid rgba(56,189,248,.3);}
  .ub-info:hover:not(:disabled){background:rgba(56,189,248,.18);}
  .ub-sm{padding:6px 11px;font-size:12px;border-radius:5px;}
  .ub-full{width:100%;}
  .ub-icon{padding:7px;border-radius:var(--rs);}

  /* Inputs */
  .ui{width:100%;background:var(--s2);border:1px solid var(--b2);color:var(--text);padding:10px 13px;border-radius:var(--rs);font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;outline:none;transition:border-color .2s;-webkit-text-size-adjust:100%;}
  .ui:focus{border-color:var(--acc);}
  .ui::placeholder{color:var(--muted);}
  .ui-mono{font-family:'JetBrains Mono',monospace;font-size:16px;}
  .ui-num{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;text-align:center;padding:8px 13px;-webkit-text-size-adjust:100%;}

  /* Card produto */
  .pc{background:var(--s1);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:border-color .2s,transform .2s,box-shadow .2s;overflow:hidden;position:relative;}
  .pc:hover{border-color:var(--b2);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.45);}
  .pc.sel{box-shadow:0 0 0 2px var(--acc);}
  .pc-bar{height:3px;}
  .pc-body{padding:14px 16px;}
  .pc-nome{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:8px;line-height:1.2;}

  /* Variação chip */
  .vc{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:5px;border:1px solid;cursor:pointer;transition:all .15s;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;}
  .vc:hover{filter:brightness(1.15);}
  .vc.sel-v{outline:2px solid currentColor;outline-offset:2px;}

  /* User card */
  .ucard{display:flex;align-items:center;gap:13px;padding:13px 15px;background:var(--s1);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:all .2s;}
  .ucard:hover{border-color:var(--b2);background:var(--s2);}
  .ucard.sel{box-shadow:0 0 0 2px var(--acc);}
  .uavatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Syne',sans-serif;font-size:19px;font-weight:800;}

  /* Item atribuído */
  .irow{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--s2);border:1px solid var(--b);border-radius:var(--rs);margin-bottom:6px;}

  /* Seção */
  .usec{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
  .usec::after{content:'';flex:1;height:1px;background:var(--b);}

  /* Divider */
  .udiv{height:1px;background:var(--b);margin:16px 0;}

  /* Drawer */
  .dov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;}
  .dr{position:fixed;right:0;top:0;bottom:0;width:min(460px,100vw);background:var(--s1);border-left:1px solid var(--b2);z-index:1001;display:flex;flex-direction:column;}
  .dr-head{padding:18px 20px;border-bottom:1px solid var(--b);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-shrink:0;}
  .dr-title{font-family:'Syne',sans-serif;font-size:19px;font-weight:800;line-height:1.2;}
  .dr-sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);margin-top:3px;}
  .dr-body{flex:1;overflow-y:auto;padding:18px 20px;}
  .dr-body::-webkit-scrollbar{width:3px;}
  .dr-body::-webkit-scrollbar-thumb{background:var(--dim);}

  /* Modal */
  .mov{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;}
  .mo{background:var(--s1);border:1px solid var(--b2);border-radius:var(--r);width:100%;max-width:400px;overflow:hidden;}
  .mo-head{padding:16px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;}
  .mo-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;}
  .mo-body{padding:20px;}

  /* Toast */
  .utoasts{position:fixed;bottom:22px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:5px;}
  .utoast{display:flex;align-items:center;gap:9px;padding:10px 15px;border-radius:var(--rs);font-size:12px;font-family:'JetBrains Mono',monospace;border:1px solid;animation:usl .22s ease;}
  .utoast.ok  {background:#0a1a0a;border-color:var(--ok);  color:var(--ok);}
  .utoast.err {background:#1a0a0a;border-color:var(--err); color:var(--err);}
  .utoast.info{background:#0a0a1a;border-color:var(--info);color:var(--info);}

  /* Search */
  .usearch{position:relative;}
  .usearch .uico{position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;}
  .usearch .ui{padding-left:36px;}

  /* Label */
  .ulbl{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}

  /* Empty */
  .uempty{text-align:center;padding:48px 20px;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;}

  /* Grid */
  .ugrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  @media(max-width:480px){.ugrid2{grid-template-columns:1fr;}}

  /* Stats bar */
  .ustat{background:var(--s2);border:1px solid var(--b);border-radius:var(--rs);padding:7px 13px;display:flex;align-items:center;gap:9px;}
  .ustat-n{font-family:'Syne',sans-serif;font-size:21px;font-weight:700;line-height:1;}
  .ustat-l{font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);}

  /* Back button nav */
  .u-back{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;background:var(--s2);border:1px solid var(--b2);border-radius:var(--rs);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s;margin-bottom:18px;}
  .u-back:hover{color:var(--text);border-color:var(--b2);background:var(--s3);}
  .u-page-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:6px;line-height:1.2;}
  .u-page-sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);margin-bottom:20px;}
  .u-breadcrumb{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);margin-bottom:16px;flex-wrap:wrap;}
  .u-breadcrumb span{cursor:pointer;transition:color .15s;}
  .u-breadcrumb span:hover{color:var(--text);}
  .u-breadcrumb .sep{color:var(--dim);}
  .u-breadcrumb .cur{color:var(--text);cursor:default;}

  @keyframes usl{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes ufd{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .ufd{animation:ufd .18s ease;}
`;

// ─── Icons ────────────────────────────────────────────────────
const ICONS = {
  shirt:   <><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  x:       <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:   <><polyline points="20 6 9 17 4 12"/></>,
  trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  edit:    <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  user:    <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  users:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  chevron: <><polyline points="9 18 15 12 9 6"/></>,
  back:    <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  send:    <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  log:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  search:  <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  refresh: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.04"/></>,
  box:     <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></>,
  warn:    <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
};
const Icon = ({ n, s=16, c }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink:0, display:"inline-block" }}>
    {ICONS[n]}
  </svg>
);

// ─── Toast ────────────────────────────────────────────────────
function useToast() {
  const [ts, setTs] = useState([]);
  const add = useCallback((msg, type="info") => {
    const id = Date.now();
    setTs(p => [...p, { id, msg, type }]);
    setTimeout(() => setTs(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return { add, Toasts: () => (
    <div className="utoasts">
      {ts.map(t => (
        <div key={t.id} className={`utoast ${t.type==="success"?"ok":t.type==="error"?"err":"info"}`}>
          <Icon n={t.type==="success"?"check":t.type==="error"?"x":"warn"} s={13}/>{t.msg}
        </div>
      ))}
    </div>
  )};
}

// ─── Spinner ──────────────────────────────────────────────────
const Spin = () => (
  <div style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.1)", borderTopColor:"currentColor", borderRadius:"50%", animation:"usl .7s linear infinite" }}/>
);

// ─── ColorPicker ──────────────────────────────────────────────
const ColorPicker = ({ value, onChange }) => (
  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
    {PALETTE.map(c => (
      <div key={c} onClick={() => onChange(c)} style={{ width:24, height:24, borderRadius:"50%", background:c, cursor:"pointer", transition:"all .15s", border:`3px solid ${value===c?"white":"transparent"}`, boxShadow:value===c?`0 0 0 2px ${c}`:"none" }}/>
    ))}
  </div>
);

// ─── Modal simples ────────────────────────────────────────────
function Modal({ title, onClose, children, accentColor }) {
  return (
    <div className="mov" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mo ufd">
        <div className="mo-head" style={{ borderBottom:`1px solid ${accentColor||"var(--b)"}` }}>
          <span className="mo-title" style={{ color:accentColor||"var(--acc)" }}>{title}</span>
          <button className="ub ub-ghost ub-icon ub-sm" onClick={onClose}><Icon n="x" s={14}/></button>
        </div>
        <div className="mo-body">{children}</div>
      </div>
    </div>
  );
}

// ─── BackButton ───────────────────────────────────────────────
function BackBtn({ onClick, label="Voltar" }) {
  return (
    <button className="u-back" onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
      {label}
    </button>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────
function Breadcrumb({ items }) {
  // items = [{label, onClick}]  last item has no onClick (current)
  return (
    <div className="u-breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{display:"flex",alignItems:"center",gap:6}}>
          {i > 0 && <span className="sep">›</span>}
          {item.onClick
            ? <span onClick={item.onClick}>{item.label}</span>
            : <span className="cur">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

// Drawer mantido apenas para compatibilidade (não usado mais)
function Drawer({ open, onClose, title, sub, children }) {
  if (!open) return null;
  return (
    <>
      <div className="dov" onClick={onClose}/>
      <div className="dr ufd">
        <div className="dr-head">
          <div style={{ flex:1, minWidth:0 }}>
            <div className="dr-title">{title}</div>
            {sub && <div className="dr-sub">{sub}</div>}
          </div>
          <button className="ub ub-ghost ub-icon ub-sm" onClick={onClose}><Icon n="x" s={15}/></button>
        </div>
        <div className="dr-body">{children}</div>
      </div>
    </>
  );
}

// ─── Campo de busca ───────────────────────────────────────────
function Search({ value, onChange, placeholder="Buscar..." }) {
  return (
    <div className="usearch">
      <span className="uico"><Icon n="search" s={14} c="var(--muted)"/></span>
      <input className="ui" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>
      {value && <button onClick={()=>onChange("")} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:"var(--muted)",cursor:"pointer",display:"flex",padding:2 }}><Icon n="x" s={13}/></button>}
    </div>
  );
}

// ─── Chip de setor ────────────────────────────────────────────
const SetorChip = ({ setor, cor }) => {
  const c = cor || "#888";
  return <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, padding:"2px 8px", border:`1px solid ${c}44`, color:c, borderRadius:12, background:`${c}15` }}>{setor||"—"}</span>;
};

// ============================================================
// PRODUTOS TAB
// ============================================================
function TabProdutos({ produtos, variacoes, itens, usuarios, setoresCfg, onRefresh, addToast }) {
  const [search, setSearch]       = useState("");
  const [selProd, setSelProd]     = useState(null);  // produto selecionado (drawer)
  const [selVar, setSelVar]       = useState(null);  // variação selecionada (dentro do drawer)
  const [showNew, setShowNew] = useState(false);

  // Estados modais
  const [modalAcao, setModalAcao]   = useState(null); // "adicionar"|"enviar"|"descartar"
  const [modalEditProd, setEditP]   = useState(null); // produto a editar nome/cor
  const [modalEditVar, setEditV]    = useState(null);  // variação a editar tamanho/qtd

  // Form criar produto
  const [fNome, setFNome]     = useState("");
  const [fNomeSel, setFNomeSel] = useState(""); // nome existente selecionado
  const [fTam, setFTam]       = useState("");
  const [fQtd, setFQtd]       = useState("0");
  const [fCor, setFCor]       = useState(PALETTE[0]);
  const [savingNew, setSavingNew] = useState(false);

  // Modo do form: "novo" | "existente"
  const [formMode, setFormMode] = useState("novo");

  const nomesExistentes = [...new Set(produtos.map(p => p.nome))].sort();
  const tamsDoProd      = fNomeSel ? variacoes.filter(v => {
    const p = produtos.find(x => x.nome === fNomeSel);
    return p && v.produtoId === p.id;
  }).map(v => v.tamanho) : [];
  const corDoProd       = fNomeSel ? produtos.find(p => p.nome === fNomeSel)?.cor : null;
  const nomeEfetivo     = formMode === "existente" ? fNomeSel : fNome.trim();
  const tamJaExiste     = nomeEfetivo && fTam ? (() => {
    const p = produtos.find(x => x.nome.toLowerCase() === nomeEfetivo.toLowerCase());
    return p && variacoes.some(v => v.produtoId === p.id && v.tamanho === fTam.trim());
  })() : false;

  useEffect(() => { if (formMode === "existente") { setFNome(""); setFCor(PALETTE[0]); } }, [formMode]);
  useEffect(() => { setFTam(""); }, [fNomeSel]);

  const criarProduto = async () => {
    const nome = nomeEfetivo;
    const tam  = fTam.trim();
    if (!nome) { addToast("Informe o nome.", "error"); return; }
    if (!tam)  { addToast("Informe o tamanho.", "error"); return; }
    if (tamJaExiste) { addToast(`"${nome}" TAM ${tam} já existe.`, "error"); return; }
    setSavingNew(true);
    try {
      let produtoId;
      let produtoCor = fCor;
      // Verifica se o produto (pelo nome) já existe
      const existente = produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
      if (existente) {
        produtoId  = existente.id;
        produtoCor = existente.cor;
      } else {
        // Cria o produto novo
        const ref = await addDoc(collection(db, COL.produtos), {
          nome, cor: fCor, criadoEm: serverTimestamp(),
        });
        produtoId = ref.id;
        produtoCor = fCor;
      }
      // Cria a variação
      const qtd = parseInt(fQtd) || 0;
      await addDoc(collection(db, COL.variacoes), {
        produtoId, produtoNome: nome, tamanho: tam, quantidade: qtd, criadoEm: serverTimestamp(),
      });
      await log("produto_criado", `"${nome}" TAM ${tam} adicionado (${qtd} un.)`);
      addToast(`"${nome}" TAM ${tam} criado!`, "success");
      setFNome(""); setFTam(""); setFQtd("0"); setFNomeSel(""); setFormMode("novo");
      setShowNew(false); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingNew(false); }
  };

  // Ações sobre variação
  const [aqtd, setAQtd]           = useState(""); // adicionar qtd
  const [sendUser, setSendUser]   = useState("");
  const [sendQtd, setSendQtd]     = useState("1");
  const [userSearch, setUSearch]  = useState("");
  const [discMotivo, setDiscM]    = useState("");
  const [discQtd, setDiscQtd]     = useState("1");
  const [savingAcao, setSavingAcao] = useState(false);

  const variacoesDoProd = selProd ? variacoes.filter(v => v.produtoId === selProd.id) : [];

  const abrirProd = (p) => {
    setSelProd(p); setSelVar(null); setModalAcao(null);
    setAQtd(""); setSendUser(""); setSendQtd("1"); setDiscM(""); setDiscQtd("1"); setUSearch("");
  };

  const abrirVar = (v) => {
    setSelVar(v); setModalAcao(null);
    setAQtd(""); setSendUser(""); setSendQtd("1"); setDiscM(""); setDiscQtd("1"); setUSearch("");
  };

  const adicionarEstoque = async () => {
    const n = parseInt(aqtd); if (!n || n < 1) { addToast("Informe a quantidade.", "error"); return; }
    setSavingAcao(true);
    try {
      const nova = (selVar.quantidade||0) + n;
      await updateDoc(doc(db, COL.variacoes, selVar.id), { quantidade: nova });
      await log("entrada_estoque", `+${n} em "${selVar.produtoNome}" TAM ${selVar.tamanho}`);
      addToast(`+${n} adicionados!`, "success");
      setAQtd(""); setModalAcao(null); onRefresh();
      setSelVar(v => v ? {...v, quantidade:nova} : v);
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingAcao(false); }
  };

  const enviarParaUser = async () => {
    if (!sendUser) { addToast("Selecione um usuário.", "error"); return; }
    const qtd = parseInt(sendQtd); if (!qtd || qtd < 1) { addToast("Informe a quantidade.", "error"); return; }
    if ((selVar.quantidade||0) < qtd) { addToast(`Insuficiente. Disponível: ${selVar.quantidade||0}.`, "error"); return; }
    setSavingAcao(true);
    try {
      const u = usuarios.find(u => u.id === sendUser);
      const nova = (selVar.quantidade||0) - qtd;
      await updateDoc(doc(db, COL.variacoes, selVar.id), { quantidade: nova });
      await addDoc(collection(db, COL.itens), {
        userId:sendUser, userName:u.nome, userSetor:u.setor||"",
        produtoId:selProd.id, produtoNome:selProd.nome,
        variacaoId:selVar.id, tamanho:selVar.tamanho,
        cor:selProd.cor||PALETTE[0], qtd, data:serverTimestamp(),
      });
      await log("envio_usuario", `${qtd}x "${selProd.nome}" TAM ${selVar.tamanho} → ${u.nome}`);
      addToast(`${qtd}x enviado para ${u.nome}!`, "success");
      setSendUser(""); setSendQtd("1"); setModalAcao(null); onRefresh();
      setSelVar(v => v ? {...v, quantidade:nova} : v);
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingAcao(false); }
  };

  const descartar = async () => {
    if (!discMotivo.trim()) { addToast("Informe o motivo.", "error"); return; }
    const qtd = parseInt(discQtd); if (!qtd || qtd < 1) { addToast("Informe a quantidade.", "error"); return; }
    if ((selVar.quantidade||0) < qtd) { addToast(`Insuficiente. Disponível: ${selVar.quantidade||0}.`, "error"); return; }
    setSavingAcao(true);
    try {
      const nova = (selVar.quantidade||0) - qtd;
      await updateDoc(doc(db, COL.variacoes, selVar.id), { quantidade: nova });
      await log("descarte", `${qtd}x "${selProd.nome}" TAM ${selVar.tamanho} descartado — ${discMotivo.trim()}`);
      addToast("Descartado.", "info");
      setDiscM(""); setDiscQtd("1"); setModalAcao(null); onRefresh();
      setSelVar(v => v ? {...v, quantidade:nova} : v);
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingAcao(false); }
  };

  const excluirVariacao = async (v) => {
    if (!confirm(`Excluir TAM ${v.tamanho} de "${v.produtoNome}"?`)) return;
    try {
      await deleteDoc(doc(db, COL.variacoes, v.id));
      // Remove itens atribuídos desta variação
      const iSnap = await getDocs(collection(db, COL.itens));
      const batch = writeBatch(db);
      iSnap.docs.filter(d => d.data().variacaoId === v.id).forEach(d => batch.delete(d.ref));
      await batch.commit();
      await log("variacao_excluida", `"${v.produtoNome}" TAM ${v.tamanho} excluído`);
      addToast("Tamanho excluído.", "success");
      setSelVar(null);
      // Se não sobrar variações, excluir o produto também
      const restantes = variacoes.filter(x => x.produtoId === v.produtoId && x.id !== v.id);
      if (restantes.length === 0) {
        await deleteDoc(doc(db, COL.produtos, v.produtoId));
        setSelProd(null);
      }
      onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
  };

  const excluirProduto = async (p) => {
    if (!confirm(`Excluir "${p.nome}" e todos os seus tamanhos?`)) return;
    try {
      const vars = variacoes.filter(v => v.produtoId === p.id);
      const batch = writeBatch(db);
      batch.delete(doc(db, COL.produtos, p.id));
      vars.forEach(v => batch.delete(doc(db, COL.variacoes, v.id)));
      // Itens
      const iSnap = await getDocs(collection(db, COL.itens));
      iSnap.docs.filter(d => d.data().produtoId === p.id).forEach(d => batch.delete(d.ref));
      await batch.commit();
      await log("produto_excluido", `Produto "${p.nome}" excluído`);
      addToast(`"${p.nome}" excluído.`, "success");
      setSelProd(null); setSelVar(null); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
  };

  // Editar produto (nome/cor)
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor]   = useState(PALETTE[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  const salvarEditProd = async () => {
    const n = editNome.trim();
    if (!n) { addToast("Informe o nome.", "error"); return; }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, COL.produtos, modalEditProd.id), { nome: n, cor: editCor });
      // Atualiza nome nas variações e itens
      const batch = writeBatch(db);
      variacoes.filter(v => v.produtoId === modalEditProd.id)
        .forEach(v => batch.update(doc(db, COL.variacoes, v.id), { produtoNome: n }));
      await batch.commit();
      await log("produto_editado", `"${modalEditProd.nome}" → "${n}"`);
      addToast("Produto atualizado!", "success");
      setEditP(null); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingEdit(false); }
  };

  // Editar variação (tamanho/qtd)
  const [editTam, setEditTam]   = useState("");
  const [editQtd, setEditQtd]   = useState("");
  const [savingEditV, setSavingEditV] = useState(false);

  const salvarEditVar = async () => {
    const t = editTam.trim();
    if (!t) { addToast("Informe o tamanho.", "error"); return; }
    setSavingEditV(true);
    try {
      const qtd = parseInt(editQtd) || 0;
      await updateDoc(doc(db, COL.variacoes, modalEditVar.id), { tamanho: t, quantidade: qtd });
      await log("variacao_editada", `"${modalEditVar.produtoNome}" TAM ${modalEditVar.tamanho} → TAM ${t}, qtd ${qtd}`);
      addToast("Tamanho atualizado!", "success");
      setEditV(null); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingEditV(false); }
  };

  const filtered = produtos.filter(p =>
    !search || p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const usersFiltered = usuarios.filter(u =>
    !userSearch || u.nome.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Página: lista de produtos
  const PaginaLista = () => (
    <div className="ufd">
      {/* Barra */}
      <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:180 }}><Search value={search} onChange={setSearch} placeholder="Buscar produto..."/></div>
        <button className="ub ub-acc" onClick={() => { setShowNew(!showNew); if(!showNew){ setFormMode("novo"); setFNome(""); setFTam(""); setFQtd("0"); setFNomeSel(""); } }}>
          <Icon n="plus" s={14}/> Novo
        </button>
      </div>

      {/* Form criar */}
      {showNew && (
        <div className="ufd" style={{ background:"var(--s1)", border:"1px solid rgba(245,166,35,.35)", borderRadius:"var(--r)", marginBottom:20, overflow:"hidden" }}>
          <div style={{ height:3, background:"var(--acc)" }}/>
          <div style={{ padding:"16px 18px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"var(--acc)", marginBottom:14 }}>NOVO PRODUTO</div>

            {/* Toggle modo */}
            <div style={{ display:"flex", gap:0, marginBottom:14, background:"var(--s2)", border:"1px solid var(--b)", borderRadius:"var(--rs)", overflow:"hidden" }}>
              {[{ id:"novo", l:"Criar nome novo" }, { id:"existente", l:"Adicionar tamanho" }].map(m => (
                <button key={m.id} onClick={() => setFormMode(m.id)}
                  style={{ flex:1, padding:"8px 10px", border:"none", cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, transition:"all .15s", background:formMode===m.id?"var(--acc)":"transparent", color:formMode===m.id?"#0d0d0f":"var(--muted)" }}>
                  {m.l}
                </button>
              ))}
            </div>

            {/* MODO NOVO */}
            {formMode === "novo" && (
              <div className="ugrid2" style={{ marginBottom:12 }}>
                <div>
                  <div className="ulbl">Nome *</div>
                  <input className="ui" value={fNome} onChange={e=>setFNome(e.target.value)} placeholder="Ex: Camiseta Polo" onKeyDown={e=>e.key==="Enter"&&criarProduto()}/>
                </div>
                <div>
                  <div className="ulbl">Cor</div>
                  <ColorPicker value={fCor} onChange={setFCor}/>
                </div>
              </div>
            )}

            {/* MODO EXISTENTE */}
            {formMode === "existente" && (
              <div style={{ marginBottom:12 }}>
                <div className="ulbl">Produto existente *</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                  {nomesExistentes.length === 0
                    ? <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)" }}>Nenhum produto criado ainda.</span>
                    : nomesExistentes.map(n => {
                        const cor = produtos.find(p=>p.nome===n)?.cor || PALETTE[0];
                        const ativo = fNomeSel === n;
                        return (
                          <button key={n} onClick={() => setFNomeSel(ativo ? "" : n)}
                            style={{ padding:"6px 13px", borderRadius:"var(--rs)", border:`2px solid ${ativo?cor:"var(--b2)"}`, background:ativo?`${cor}18`:"transparent", color:ativo?cor:"var(--muted)", cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, transition:"all .15s", display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ width:8, height:8, borderRadius:"50%", background:cor, display:"inline-block" }}/>
                            {n}
                          </button>
                        );
                      })}
                </div>
                {/* Tamanhos existentes deste produto */}
                {fNomeSel && tamsDoProd.length > 0 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8, alignItems:"center" }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)", marginRight:2 }}>Já tem:</span>
                    {tamsDoProd.map(t => (
                      <span key={t} style={{ padding:"3px 9px", borderRadius:4, background:"var(--s3)", border:"1px solid var(--b2)", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--muted)" }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tamanho + Quantidade — aparece em ambos os modos */}
            <div className="ugrid2" style={{ marginBottom:14 }}>
              <div>
                <div className="ulbl">Tamanho *</div>
                <input className="ui ui-mono" value={fTam} onChange={e=>setFTam(e.target.value)} placeholder="Ex: M, G, 42, Único" onKeyDown={e=>e.key==="Enter"&&criarProduto()}/>
                {tamJaExiste && <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--err)", marginTop:4 }}>Este tamanho já existe.</div>}
              </div>
              <div>
                <div className="ulbl">Quantidade inicial</div>
                <input className="ui ui-num" type="number" min="0" value={fQtd} onChange={e=>setFQtd(e.target.value.replace(/[^0-9]/g,""))} onKeyDown={e=>e.key==="Enter"&&criarProduto()}/>
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button className="ub ub-acc ub-full" onClick={criarProduto} disabled={savingNew||!nomeEfetivo||!fTam.trim()||tamJaExiste}>
                {savingNew ? <Spin/> : <><Icon n="check" s={14}/> {formMode==="existente"&&fNomeSel ? `Adicionar TAM ${fTam||"?"} a "${fNomeSel}"` : "Criar produto"}</>}
              </button>
              <button className="ub ub-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {produtos.length > 0 && (
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          {[
            { l:"Produtos",   v:produtos.length,  c:"var(--muted)" },
            { l:"Em estoque", v:variacoes.reduce((s,v)=>s+(v.quantidade||0),0), c:"var(--ok)" },
            { l:"Atribuídos", v:itens.reduce((s,i)=>s+(i.qtd||1),0), c:"var(--info)" },
          ].map(s => (
            <div key={s.l} className="ustat">
              <span className="ustat-n" style={{ color:s.c }}>{s.v}</span>
              <span className="ustat-l">{s.l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid de produtos */}
      {filtered.length === 0
        ? <div className="uempty"><Icon n="box" s={32} c="var(--dim)"/><div style={{ marginTop:12 }}>Nenhum produto criado ainda.</div></div>
        : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12 }}>
            {filtered.map(p => {
              const vars   = variacoes.filter(v => v.produtoId === p.id);
              const total  = vars.reduce((s,v) => s+(v.quantidade||0), 0);
              const cor    = p.cor || PALETTE[0];
              const isSel  = selProd?.id === p.id;
              return (
                <div key={p.id} className={`pc${isSel?" sel":""}`} onClick={() => abrirProd(isSel ? null : p)}>
                  <div className="pc-bar" style={{ background:cor }}/>
                  <div className="pc-body">
                    <div className="pc-nome">{p.nome}</div>
                    {/* Chips de tamanho */}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:12 }}>
                      {vars.length === 0
                        ? <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)" }}>sem tamanhos</span>
                        : vars.map(v => (
                          <span key={v.id} className="vc" style={{ color:cor, borderColor:`${cor}44`, background:`${cor}12` }}>
                            {v.tamanho} · <strong>{v.quantidade||0}</strong>
                          </span>
                        ))}
                    </div>
                    {/* Total */}
                    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:2 }}>total estoque</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:38, fontWeight:800, lineHeight:1, color:total>0?cor:"var(--err)" }}>{total}</div>
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="ub ub-ghost ub-icon ub-sm" title="Editar" onClick={e=>{ e.stopPropagation(); setEditP(p); setEditNome(p.nome); setEditCor(p.cor||PALETTE[0]); }}>
                          <Icon n="edit" s={13}/>
                        </button>
                        <button className="ub ub-err ub-icon ub-sm" title="Excluir produto" onClick={e=>{ e.stopPropagation(); excluirProduto(p); }}>
                          <Icon n="trash" s={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

    </div>
  );

  // ── Página: detalhe do produto (lista de tamanhos) ──
  const PaginaProduto = () => {
    const cor = selProd?.cor || PALETTE[0];
    return (
      <div className="ufd">
        <Breadcrumb items={[
          { label:"Produtos", onClick:()=>{ setSelProd(null); setSelVar(null); setModalAcao(null); } },
          { label:selProd?.nome || "" },
        ]}/>
        <BackBtn onClick={()=>{ setSelProd(null); setSelVar(null); setModalAcao(null); }} label="Voltar para produtos"/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div>
            <div className="u-page-title" style={{ color:cor }}>{selProd?.nome}</div>
            <div className="u-page-sub">
              {variacoesDoProd.length} tamanho{variacoesDoProd.length!==1?"s":""} · {variacoesDoProd.reduce((s,v)=>s+(v.quantidade||0),0)} em estoque
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button className="ub ub-ghost ub-sm" onClick={()=>{ setEditP(selProd); setEditNome(selProd.nome); setEditCor(selProd.cor||PALETTE[0]); }}>
              <Icon n="edit" s={13}/> Editar
            </button>
            <button className="ub ub-err ub-sm" onClick={()=>excluirProduto(selProd)}>
              <Icon n="trash" s={13}/> Excluir
            </button>
          </div>
        </div>
        <div className="usec">Tamanhos disponíveis</div>
        {variacoesDoProd.length === 0
          ? <div style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--muted)", padding:"20px", textAlign:"center", border:"1px dashed var(--b)", borderRadius:"var(--rs)" }}>Nenhum tamanho cadastrado.</div>
          : variacoesDoProd.map(v => (
            <div key={v.id} onClick={()=>abrirVar(v)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"var(--s2)", border:`1px solid var(--b)`, borderRadius:"var(--rs)", marginBottom:8, cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=cor+"88"; e.currentTarget.style.background=`${cor}08`; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--b)"; e.currentTarget.style.background="var(--s2)"; }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:cor, minWidth:56, lineHeight:1 }}>{v.tamanho}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:3 }}>em estoque</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, lineHeight:1, color:v.quantidade>0?cor:"var(--err)" }}>{v.quantidade||0}</div>
              </div>
              <div style={{ display:"flex", gap:5, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                <button className="ub ub-ghost ub-icon ub-sm" title="Editar" onClick={()=>{ setEditV(v); setEditTam(v.tamanho); setEditQtd(String(v.quantidade||0)); }}>
                  <Icon n="edit" s={12}/>
                </button>
                <button className="ub ub-err ub-icon ub-sm" title="Excluir" onClick={()=>excluirVariacao(v)}>
                  <Icon n="trash" s={12}/>
                </button>
              </div>
              <Icon n="chevron" s={14} c="var(--dim)"/>
            </div>
          ))}
      </div>
    );
  };

  // ── Página: detalhe da variação (ações) ──
  const PaginaVariacao = () => {
    const cor = selProd?.cor || PALETTE[0];
    const v   = selVar;
    return (
      <div className="ufd">
        <Breadcrumb items={[
          { label:"Produtos", onClick:()=>{ setSelProd(null); setSelVar(null); setModalAcao(null); } },
          { label:selProd?.nome || "", onClick:()=>{ setSelVar(null); setModalAcao(null); } },
          { label:`TAM ${v?.tamanho}` },
        ]}/>
        <BackBtn onClick={()=>{ setSelVar(null); setModalAcao(null); }} label={`Voltar para ${selProd?.nome}`}/>
        {/* Info da variação */}
        <div style={{ background:`${cor}10`, border:`1px solid ${cor}44`, borderRadius:"var(--r)", padding:"18px 20px", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:`${cor}cc`, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{selProd?.nome}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>Tamanho {v?.tamanho}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>em estoque</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:48, fontWeight:800, lineHeight:1, color:v?.quantidade>0?cor:"var(--err)" }}>{v?.quantidade||0}</div>
            </div>
          </div>
        </div>
        {/* Botões de ação */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
          {[
            { id:"adicionar", l:"+ Estoque",   cls:"ub-ok"   },
            { id:"enviar",    l:"→ Usuário",   cls:"ub-info" },
            { id:"descartar", l:"✕ Descartar", cls:"ub-err"  },
          ].map(a => (
            <button key={a.id} className={`ub ${a.cls}`}
              style={{ justifyContent:"center", outline:modalAcao===a.id?"2px solid currentColor":"none", outlineOffset:2 }}
              onClick={()=>setModalAcao(modalAcao===a.id?null:a.id)}>
              {a.l}
            </button>
          ))}
        </div>
        {/* ADICIONAR */}
        {modalAcao==="adicionar" && (
          <div className="ufd" style={{ background:"var(--s2)", border:"1px solid rgba(34,197,94,.3)", borderRadius:"var(--r)", padding:"16px", marginBottom:12 }}>
            <div className="ulbl" style={{ marginBottom:8 }}>Quantas unidades chegaram?</div>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
              <input className="ui ui-num" type="number" min="1" value={aqtd} onChange={e=>setAQtd(e.target.value.replace(/[^0-9]/g,""))}
                placeholder="0" style={{ flex:1 }} onKeyDown={e=>e.key==="Enter"&&adicionarEstoque()} autoFocus/>
              {aqtd && parseInt(aqtd)>0 && (
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"var(--ok)", whiteSpace:"nowrap" }}>
                  {v?.quantidade||0} + {aqtd} = <strong>{(v?.quantidade||0)+parseInt(aqtd)}</strong>
                </div>
              )}
            </div>
            <button className="ub ub-ok ub-full" onClick={adicionarEstoque} disabled={savingAcao||!aqtd||parseInt(aqtd)<1}>
              {savingAcao?<Spin/>:<><Icon n="plus" s={14}/> Adicionar {aqtd||0} ao estoque</>}
            </button>
          </div>
        )}
        {/* ENVIAR */}
        {modalAcao==="enviar" && (
          <div className="ufd" style={{ background:"var(--s2)", border:"1px solid rgba(56,189,248,.3)", borderRadius:"var(--r)", padding:"16px", marginBottom:12 }}>
            {(v?.quantidade||0)===0
              ? <div style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--err)",display:"flex",alignItems:"center",gap:7 }}><Icon n="warn" s={13} c="var(--err)"/> Estoque zerado.</div>
              : <>
                  <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"flex-end" }}>
                    <div style={{ width:90 }}>
                      <div className="ulbl">Quantidade</div>
                      <input className="ui ui-num" type="number" min="1" max={v?.quantidade} value={sendQtd} onChange={e=>setSendQtd(e.target.value.replace(/[^0-9]/g,""))} style={{ padding:"6px 8px" }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div className="ulbl">Buscar usuário</div>
                      <Search value={userSearch} onChange={setUSearch} placeholder="Nome..."/>
                    </div>
                  </div>
                  <div style={{ maxHeight:220, overflowY:"auto", border:"1px solid var(--b)", borderRadius:"var(--rs)", marginBottom:12 }}>
                    {[...usersFiltered].sort((a,b)=>a.nome.localeCompare(b.nome)).map(u=>{
                      const uc=u.cor||PALETTE[0];
                      return (
                        <div key={u.id} onClick={()=>setSendUser(u.id)}
                          style={{ display:"flex",alignItems:"center",gap:9,padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid var(--b)",background:sendUser===u.id?"rgba(56,189,248,.08)":"transparent",transition:"background .1s" }}>
                          <div style={{ width:30,height:30,borderRadius:"50%",background:`${uc}22`,border:`2px solid ${uc}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                            <span style={{ fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800,color:uc }}>{u.nome.charAt(0)}</span>
                          </div>
                          <span style={{ flex:1,fontSize:13,fontWeight:600,color:sendUser===u.id?"var(--info)":"var(--text)" }}>{u.nome}</span>
                          {u.setor&&<SetorChip setor={u.setor} cor={u.cor}/>}
                          {sendUser===u.id&&<Icon n="check" s={14} c="var(--info)"/>}
                        </div>
                      );
                    })}
                    {usersFiltered.length===0&&<div style={{padding:12,fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>Nenhum usuário</div>}
                  </div>
                  <button className="ub ub-info ub-full" onClick={enviarParaUser} disabled={savingAcao||!sendUser||!parseInt(sendQtd)}>
                    {savingAcao?<Spin/>:<><Icon n="send" s={14}/> Enviar {sendQtd||0}x para usuário</>}
                  </button>
                </>}
          </div>
        )}
        {/* DESCARTAR */}
        {modalAcao==="descartar" && (
          <div className="ufd" style={{ background:"var(--s2)", border:"1px solid rgba(244,63,94,.3)", borderRadius:"var(--r)", padding:"16px", marginBottom:12 }}>
            {(v?.quantidade||0)===0
              ? <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--err)",display:"flex",alignItems:"center",gap:7}}><Icon n="warn" s={13} c="var(--err)"/> Estoque zerado.</div>
              : <>
                  <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"flex-end" }}>
                    <div style={{ width:90 }}>
                      <div className="ulbl">Quantidade</div>
                      <input className="ui ui-num" type="number" min="1" max={v?.quantidade} value={discQtd} onChange={e=>setDiscQtd(e.target.value.replace(/[^0-9]/g,""))} style={{ padding:"6px 8px" }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div className="ulbl">Motivo *</div>
                      <input className="ui" value={discMotivo} onChange={e=>setDiscM(e.target.value)} placeholder="Ex: rasgado, danificado..." onKeyDown={e=>e.key==="Enter"&&descartar()}/>
                    </div>
                  </div>
                  <button className="ub ub-err ub-full" onClick={descartar} disabled={savingAcao||!discMotivo.trim()||!parseInt(discQtd)}>
                    {savingAcao?<Spin/>:<><Icon n="trash" s={14}/> Descartar {discQtd||0}x</>}
                  </button>
                </>}
          </div>
        )}
      </div>
    );
  };

  // ── Renderiza a página correta ──
  return (
    <div>
      {selVar  ? <PaginaVariacao/> : selProd ? <PaginaProduto/> : <PaginaLista/>}

      {/* Modal editar produto */}
      {modalEditProd && (
        <Modal title="EDITAR PRODUTO" onClose={()=>setEditP(null)}>
          <div style={{ marginBottom:12 }}>
            <div className="ulbl">Nome</div>
            <input className="ui" value={editNome} onChange={e=>setEditNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&salvarEditProd()}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <div className="ulbl">Cor</div>
            <ColorPicker value={editCor} onChange={setEditCor}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="ub ub-acc ub-full" onClick={salvarEditProd} disabled={savingEdit||!editNome.trim()}>
              {savingEdit?<Spin/>:<><Icon n="check" s={14}/> Salvar</>}
            </button>
            <button className="ub ub-ghost" onClick={()=>setEditP(null)}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal editar variação */}
      {modalEditVar && (
        <Modal title="EDITAR TAMANHO" onClose={()=>setEditV(null)}>
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)", marginBottom:14 }}>
            Produto: {modalEditVar.produtoNome}
          </div>
          <div className="ugrid2" style={{ marginBottom:16 }}>
            <div>
              <div className="ulbl">Tamanho</div>
              <input className="ui ui-mono" value={editTam} onChange={e=>setEditTam(e.target.value)} onKeyDown={e=>e.key==="Enter"&&salvarEditVar()}/>
            </div>
            <div>
              <div className="ulbl">Quantidade</div>
              <input className="ui ui-num" type="number" min="0" value={editQtd} onChange={e=>setEditQtd(e.target.value.replace(/[^0-9]/g,""))} onKeyDown={e=>e.key==="Enter"&&salvarEditVar()}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="ub ub-acc ub-full" onClick={salvarEditVar} disabled={savingEditV||!editTam.trim()}>
              {savingEditV?<Spin/>:<><Icon n="check" s={14}/> Salvar</>}
            </button>
            <button className="ub ub-ghost" onClick={()=>setEditV(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// USUÁRIOS TAB
// ============================================================
function TabUsuarios({ usuarios, itens, variacoes, produtos, setoresCfg, onRefresh, addToast }) {
  const [search, setSearch]     = useState("");
  const [selUser, setSelUser]   = useState(null);
  const [showNew, setShowNew]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [fNome, setFNome]       = useState("");
  const [fSetor, setFSetor]     = useState("");
  const [fCor, setFCor]         = useState(PALETTE[0]);
  const [editNome, setEditNome] = useState("");
  const [editSetor, setEditSetor] = useState("");
  const [editCor, setEditCor]   = useState(PALETTE[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { if (setoresCfg.length>0 && !fSetor) setFSetor(setoresCfg[0].nome); }, [setoresCfg]);

  const criarUser = async () => {
    const n = fNome.trim();
    const s = fSetor.trim();
    if (!n) { addToast("Informe o nome.", "error"); return; }
    if (!s) { addToast("Informe o setor.", "error"); return; }
    if (usuarios.some(u=>u.nome.toLowerCase()===n.toLowerCase())) { addToast("Usuário já existe.","error"); return; }
    setSaving(true);
    try {
      // Salva o setor no Firebase se ainda não existir
      if (!setoresCfg.some(x=>x.nome.toLowerCase()===s.toLowerCase())) {
        await addDoc(collection(db, COL.setores), { nome:s, cor:fCor, criadoEm:serverTimestamp() });
      }
      await addDoc(collection(db, COL.usuarios), { nome:n, setor:s, cor:fCor, criadoEm:serverTimestamp() });
      await log("usuario_criado", `Usuário "${n}" (${s}) criado`);
      addToast(`"${n}" criado!`, "success");
      setFNome(""); setFSetor(""); setShowNew(false); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSaving(false); }
  };

  const salvarEditUser = async () => {
    const n = editNome.trim();
    if (!n) { addToast("Informe o nome.", "error"); return; }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, COL.usuarios, editUser.id), { nome:n, setor:editSetor, cor:editCor });
      await log("usuario_editado", `"${editUser.nome}" → "${n}"`);
      addToast("Atualizado!", "success");
      setEditUser(null); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
    finally { setSavingEdit(false); }
  };

  const excluirUser = async (u) => {
    if (itens.some(i=>i.userId===u.id)) { addToast("Usuário tem itens atribuídos. Devolva primeiro.","error"); return; }
    if (!confirm(`Excluir "${u.nome}"?`)) return;
    try {
      await deleteDoc(doc(db, COL.usuarios, u.id));
      await log("usuario_excluido", `Usuário "${u.nome}" excluído`);
      addToast("Excluído.", "success");
      if (selUser?.id===u.id) setSelUser(null);
      onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
  };

  const devolverEstoque = async (item) => {
    try {
      await updateDoc(doc(db, COL.variacoes, item.variacaoId), {
        quantidade: (variacoes.find(v=>v.id===item.variacaoId)?.quantidade||0) + (item.qtd||1)
      });
      await deleteDoc(doc(db, COL.itens, item.id));
      await log("devolucao_estoque", `${item.qtd||1}x "${item.produtoNome}" TAM ${item.tamanho} devolvido (de ${item.userName})`);
      addToast("Devolvido ao estoque!", "success"); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
  };

  const [discItem, setDiscItem]     = useState(null);
  const [discMotivoU, setDiscMU]    = useState("");

  const descartarDoUser = async () => {
    if (!discMotivoU.trim()) { addToast("Informe o motivo.", "error"); return; }
    try {
      await deleteDoc(doc(db, COL.itens, discItem.id));
      await log("descarte_usuario", `${discItem.qtd||1}x "${discItem.produtoNome}" TAM ${discItem.tamanho} descartado (de ${discItem.userName}) — ${discMotivoU.trim()}`);
      addToast("Descartado.", "info");
      setDiscItem(null); setDiscMU(""); onRefresh();
    } catch(e) { addToast("Erro: "+e.message, "error"); }
  };

  const filtered = usuarios.filter(u =>
    !search || u.nome.toLowerCase().includes(search.toLowerCase()) || (u.setor||"").toLowerCase().includes(search.toLowerCase())
  );

  const userItens = selUser ? itens.filter(i=>i.userId===selUser.id) : [];

  // Página: lista de usuários
  const PaginaLista = () => (
    <div className="ufd">
      {/* Barra */}
      <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:180 }}><Search value={search} onChange={setSearch} placeholder="Buscar usuário ou setor..."/></div>
        <button className="ub ub-acc" onClick={()=>setShowNew(!showNew)}>
          <Icon n="plus" s={14}/> Novo usuário
        </button>
      </div>

      {/* Form criar */}
      {showNew && (
        <div className="ufd" style={{ background:"var(--s1)", border:"1px solid rgba(245,166,35,.35)", borderRadius:"var(--r)", marginBottom:20, overflow:"hidden" }}>
          <div style={{ height:3, background:"var(--acc)" }}/>
          <div style={{ padding:"16px 18px" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"var(--acc)", marginBottom:14 }}>NOVO USUÁRIO</div>
            <div className="ugrid2" style={{ marginBottom:12 }}>
              <div>
                <div className="ulbl">Nome *</div>
                <input className="ui" value={fNome} onChange={e=>setFNome(e.target.value)} placeholder="Nome completo" onKeyDown={e=>e.key==="Enter"&&criarUser()}/>
              </div>
              <div>
                <div className="ulbl">Setor</div>
                <input className="ui" list="setores-list" value={fSetor} onChange={e=>setFSetor(e.target.value)} placeholder="Selecione ou digite um setor..."/>
                <datalist id="setores-list">
                  {setoresCfg.map(s=><option key={s.id} value={s.nome}/>)}
                </datalist>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div className="ulbl">Cor do avatar</div>
              <ColorPicker value={fCor} onChange={setFCor}/>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="ub ub-acc ub-full" onClick={criarUser} disabled={saving||!fNome.trim()}>
                {saving?<Spin/>:<><Icon n="check" s={14}/> Criar</>}
              </button>
              <button className="ub ub-ghost" onClick={()=>setShowNew(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {usuarios.length>0 && (
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          <div className="ustat"><span className="ustat-n" style={{ color:"var(--muted)" }}>{usuarios.length}</span><span className="ustat-l">Usuários</span></div>
          <div className="ustat"><span className="ustat-n" style={{ color:"var(--info)" }}>{itens.reduce((s,i)=>s+(i.qtd||1),0)}</span><span className="ustat-l">Itens atribuídos</span></div>
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0
        ? <div className="uempty"><Icon n="users" s={32} c="var(--dim)"/><div style={{ marginTop:12 }}>Nenhum usuário.</div></div>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[...filtered].sort((a,b)=>a.nome.localeCompare(b.nome)).map(u => {
              const cor   = u.cor || PALETTE[0];
              const qtdU  = itens.filter(i=>i.userId===u.id).reduce((s,i)=>s+(i.qtd||1),0);
              const isSel = selUser?.id === u.id;
              return (
                <div key={u.id} className={`ucard${isSel?" sel":""}`} onClick={() => setSelUser(isSel?null:u)}>
                  <div className="uavatar" style={{ background:`${cor}22`, border:`2px solid ${cor}44`, color:cor }}>
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{u.nome}</div>
                    {u.setor && <SetorChip setor={u.setor} cor={cor}/>}
                  </div>
                  {qtdU > 0 && (
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:"var(--info)", lineHeight:1 }}>{qtdU}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"var(--muted)" }}>peças</div>
                    </div>
                  )}
                  <div style={{ display:"flex", gap:5, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                    <button className="ub ub-ghost ub-icon ub-sm" title="Editar" onClick={()=>{ setEditUser(u); setEditNome(u.nome); setEditSetor(u.setor||""); setEditCor(u.cor||PALETTE[0]); }}>
                      <Icon n="edit" s={13}/>
                    </button>
                    <button className="ub ub-err ub-icon ub-sm" title="Excluir" onClick={()=>excluirUser(u)}>
                      <Icon n="trash" s={13}/>
                    </button>
                  </div>
                  <Icon n="chevron" s={16} c="var(--dim)"/>
                </div>
              );
            })}
          </div>
        )}

    </div>
  );

  // ── Página: detalhe do usuário ──
  const PaginaUsuario = () => {
    const cor = selUser?.cor || PALETTE[0];
    return (
      <div className="ufd">
        {/* Cabeçalho: voltar + nome + setor + ações */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <button className="u-back" style={{ margin:0 }} onClick={()=>{ setSelUser(null); setDiscItem(null); setDiscMU(""); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          {/* Avatar */}
          <div style={{ width:38,height:38,borderRadius:"50%",background:`${cor}22`,border:`2px solid ${cor}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:cor }}>
            {selUser?.nome?.charAt(0).toUpperCase()}
          </div>
          {/* Nome + setor */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, lineHeight:1.1, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              {selUser?.nome}
              {selUser?.setor && <SetorChip setor={selUser.setor} cor={cor}/>}
            </div>
          </div>
          {/* Editar + Excluir */}
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button className="ub ub-ghost ub-sm" onClick={()=>{ setEditUser(selUser); setEditNome(selUser.nome); setEditSetor(selUser.setor||""); setEditCor(selUser.cor||PALETTE[0]); }}>
              <Icon n="edit" s={13}/>
            </button>
            <button className="ub ub-err ub-sm" onClick={()=>excluirUser(selUser)}>
              <Icon n="trash" s={13}/>
            </button>
          </div>
        </div>

        {/* Lista de uniformes */}
        <div className="usec">Uniformes atribuídos ({userItens.reduce((s,i)=>s+(i.qtd||1),0)} peças)</div>
        {userItens.length === 0
          ? <div style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--muted)",padding:"24px",textAlign:"center",border:"1px dashed var(--b)",borderRadius:"var(--rs)" }}>
              Nenhum uniforme atribuído.
            </div>
          : userItens.map(item => {
              const icor   = item.cor || PALETTE[0];
              const isDisc = discItem?.id === item.id;
              return (
                <div key={item.id} style={{ background:"var(--s2)", border:`1px solid var(--b)`, borderRadius:"var(--r)", marginBottom:10, overflow:"hidden" }}>
                  {/* Barra de cor no topo */}
                  <div style={{ height:3, background:icor }}/>
                  <div style={{ padding:"14px 16px" }}>
                    {/* Info do item */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                      <div style={{ width:44,height:44,borderRadius:"var(--rs)",background:`${icor}18`,border:`2px solid ${icor}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Icon n="shirt" s={22} c={icor}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:icor, lineHeight:1.1 }}>{item.produtoNome}</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--muted)", marginTop:3 }}>
                          Tamanho {item.tamanho} · {fmt(item.data)}
                        </div>
                      </div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:"var(--info)", flexShrink:0 }}>×{item.qtd||1}</div>
                    </div>
                    {/* Botões de ação */}
                    {!isDisc
                      ? (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          <button className="ub ub-ok ub-full" onClick={()=>devolverEstoque(item)}>
                            <Icon n="refresh" s={15}/> Devolver ao estoque
                          </button>
                          <button className="ub ub-err ub-full" onClick={()=>{ setDiscItem(item); setDiscMU(""); }}>
                            <Icon n="trash" s={15}/> Descartar
                          </button>
                        </div>
                      )
                      : (
                        <div className="ufd">
                          <input className="ui" value={discMotivoU} onChange={e=>setDiscMU(e.target.value)}
                            placeholder="Motivo do descarte..." style={{ marginBottom:8 }}
                            autoFocus onKeyDown={e=>e.key==="Enter"&&descartarDoUser()}/>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                            <button className="ub ub-err ub-full" onClick={descartarDoUser} disabled={!discMotivoU.trim()}>
                              <Icon n="trash" s={14}/> Confirmar descarte
                            </button>
                            <button className="ub ub-ghost" onClick={()=>{ setDiscItem(null); setDiscMU(""); }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
      </div>
    );
  };

  // ── Renderiza a página correta ──
  return (
    <div>
      {selUser ? <PaginaUsuario/> : <PaginaLista/>}

      {/* Modal editar usuário */}
      {editUser && (
        <Modal title="EDITAR USUÁRIO" onClose={()=>setEditUser(null)}>
          <div className="ugrid2" style={{ marginBottom:12 }}>
            <div>
              <div className="ulbl">Nome</div>
              <input className="ui" value={editNome} onChange={e=>setEditNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&salvarEditUser()}/>
            </div>
            <div>
              <div className="ulbl">Setor</div>
              <input className="ui" list="setores-list-edit" value={editSetor} onChange={e=>setEditSetor(e.target.value)} placeholder="Setor..."/>
              <datalist id="setores-list-edit">
                {setoresCfg.map(s=><option key={s.id} value={s.nome}/>)}
              </datalist>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div className="ulbl">Cor do avatar</div>
            <ColorPicker value={editCor} onChange={setEditCor}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="ub ub-acc ub-full" onClick={salvarEditUser} disabled={savingEdit||!editNome.trim()}>
              {savingEdit?<Spin/>:<><Icon n="check" s={14}/> Salvar</>}
            </button>
            <button className="ub ub-ghost" onClick={()=>setEditUser(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// LOG TAB
// ============================================================
function TabLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLd] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLd(true);
    try { const s = await getDocs(query(collection(db,COL.log),orderBy("ts","desc"))); setLogs(s.docs.map(d=>({id:d.id,...d.data()}))); }
    catch {} finally { setLd(false); }
  };
  useEffect(()=>{ load(); },[]);

  const dotC = (a) => ({
    produto_criado:"var(--acc)", produto_excluido:"var(--err)", variacao_excluida:"var(--err)",
    entrada_estoque:"var(--ok)", envio_usuario:"var(--info)", devolucao_estoque:"var(--warn)",
    descarte:"var(--err)", descarte_usuario:"var(--err)", descarte_estoque:"var(--err)",
    usuario_criado:"var(--acc)", usuario_editado:"var(--acc)", usuario_excluido:"var(--err)",
    produto_editado:"var(--acc)", variacao_editada:"var(--acc)",
  }[a]||"var(--muted)");

  const filtered = logs.filter(l => !search || (l.desc||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center" }}>
        <div style={{ flex:1 }}><Search value={search} onChange={setSearch} placeholder="Buscar no histórico..."/></div>
        <button className="ub ub-ghost" onClick={load}><Icon n="refresh" s={14}/> Atualizar</button>
      </div>
      {loading
        ? <div className="uempty"><Spin/></div>
        : filtered.length===0
          ? <div className="uempty"><Icon n="log" s={32} c="var(--dim)"/><div style={{ marginTop:12 }}>Nenhum registro.</div></div>
          : (
            <div style={{ background:"var(--s1)", border:"1px solid var(--b)", borderRadius:"var(--r)" }}>
              {filtered.map(l => (
                <div key={l.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 16px", borderBottom:"1px solid var(--b)" }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:dotC(l.acao),flexShrink:0,marginTop:5 }}/>
                  <div style={{ flex:1,fontSize:13,lineHeight:1.5 }}>{l.desc||l.acao}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--muted)",whiteSpace:"nowrap",flexShrink:0 }}>{fmt(l.ts)}</div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

// ============================================================
// PRINCIPAL
// ============================================================
export function Uniformes() {
  const [tab, setTab]           = useState("produtos");
  const [produtos, setProd]     = useState([]);
  const [variacoes, setVar]     = useState([]);
  const [usuarios, setUsers]    = useState([]);
  const [itens, setItens]       = useState([]);
  const [setoresCfg, setSetCfg] = useState([]);
  const [loading, setLoading]   = useState(true);
  const { add: addToast, Toasts } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p,v,u,i,s] = await Promise.all([
        getDocs(collection(db,COL.produtos)),
        getDocs(collection(db,COL.variacoes)),
        getDocs(collection(db,COL.usuarios)),
        getDocs(collection(db,COL.itens)),
        getDocs(collection(db,COL.setores)),
      ]);
      setProd(p.docs.map(d=>({id:d.id,...d.data()})));
      setVar(v.docs.map(d=>({id:d.id,...d.data()})));
      setUsers(u.docs.map(d=>({id:d.id,...d.data()})));
      setItens(i.docs.map(d=>({id:d.id,...d.data()})));
      setSetCfg(s.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { addToast("Erro ao carregar.", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const totalEstoque = variacoes.reduce((s,v)=>s+(v.quantidade||0),0);
  const totalAtrib   = itens.reduce((s,i)=>s+(i.qtd||1),0);

  // ── RENOVAR: zera TUDO dos uniformes ──
  const [renovando, setRenovando] = useState(false);
  const [showConfirmRenovar, setShowConfirmRenovar] = useState(false);
  const [pinRenovar, setPinRenovar] = useState("");

  const renovarTudo = async () => {
    setRenovando(true);
    try {
      const colecoes = [COL.produtos, COL.variacoes, COL.usuarios, COL.itens, COL.log, COL.setores];
      for (const col of colecoes) {
        const snap = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        if (snap.docs.length > 0) await batch.commit();
      }
      addToast("Banco de uniformes zerado! Comece do zero.", "success");
      setShowConfirmRenovar(false);
      setPinRenovar("");
      load();
    } catch(e) { addToast("Erro ao renovar: "+e.message, "error"); }
    finally { setRenovando(false); }
  };

  const TABS = [
    { id:"produtos", l:"Produtos", n:"box"   },
    { id:"usuarios", l:"Usuários", n:"users" },
    { id:"log",      l:"Log",      n:"log"   },
  ];

  return (
    <div className="ur">
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Icon n="shirt" s={26} c="var(--acc)"/>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, letterSpacing:2 }}>UNIFORMES</span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { l:"Estoque",    v:totalEstoque,    c:"var(--ok)"   },
            { l:"Atribuídos", v:totalAtrib,      c:"var(--info)" },
            { l:"Usuários",   v:usuarios.length, c:"var(--acc)"  },
          ].map(s => (
            <div key={s.l} className="ustat">
              <span className="ustat-n" style={{ color:s.c }}>{s.v}</span>
              <span className="ustat-l">{s.l}</span>
            </div>
          ))}
          {/* Botão Renovar */}
          <button className="ub ub-err ub-sm" onClick={() => setShowConfirmRenovar(true)} title="Zerar todos os dados de uniformes">
            <Icon n="refresh" s={13}/> Renovar
          </button>
        </div>
      </div>

      {/* Modal confirmação renovar */}
      {showConfirmRenovar && (
        <div className="mov" onClick={e=>e.target===e.currentTarget&&(setShowConfirmRenovar(false)||setPinRenovar(""))}>
          <div className="mo ufd" style={{ border:"1px solid var(--err)" }}>
            <div className="mo-head" style={{ borderColor:"var(--err)" }}>
              <span className="mo-title" style={{ color:"var(--err)" }}>⚠ RENOVAR UNIFORMES</span>
              <button className="ub ub-ghost ub-icon ub-sm" onClick={()=>{setShowConfirmRenovar(false);setPinRenovar("");}}><Icon n="x" s={14}/></button>
            </div>
            <div className="mo-body">
              <div style={{ background:"rgba(244,63,94,.06)", border:"1px solid rgba(244,63,94,.25)", borderRadius:"var(--rs)", padding:"12px 14px", marginBottom:16, fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--err)", lineHeight:1.8 }}>
                Esta ação apaga permanentemente:<br/>
                · Todos os produtos e tamanhos<br/>
                · Todos os usuários<br/>
                · Todos os itens atribuídos<br/>
                · Todos os setores<br/>
                · Todo o log<br/>
                <strong>Só afeta o módulo Uniformes.</strong>
              </div>
              <div style={{ marginBottom:16 }}>
                <div className="ulbl" style={{ marginBottom:8 }}>Digite a senha para confirmar</div>
                <input
                  className="ui"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinRenovar}
                  onChange={e => setPinRenovar(e.target.value.replace(/\D/g,"").slice(0,4))}
                  onKeyDown={e => e.key==="Enter" && pinRenovar==="4510" && renovarTudo()}
                  placeholder="••••"
                  autoFocus
                  style={{ textAlign:"center", fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, letterSpacing:12, maxWidth:160 }}
                />
                {pinRenovar.length === 4 && pinRenovar !== "4510" && (
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--err)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
                    <Icon n="warn" s={12} c="var(--err)"/> Senha incorreta.
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="ub ub-err ub-full" onClick={renovarTudo} disabled={renovando || pinRenovar !== "4510"}>
                  {renovando ? <><Spin/> Zerando...</> : <><Icon n="refresh" s={14}/> Renovar tudo</>}
                </button>
                <button className="ub ub-ghost" onClick={()=>{setShowConfirmRenovar(false);setPinRenovar("");}}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="ur-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`ur-tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
            <Icon n={t.n} s={15}/> {t.l}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading
        ? <div className="uempty"><Spin/></div>
        : (
          <div className="ufd">
            {tab==="produtos" && <TabProdutos produtos={produtos} variacoes={variacoes} itens={itens} usuarios={usuarios} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast}/>}
            {tab==="usuarios" && <TabUsuarios usuarios={usuarios} itens={itens} variacoes={variacoes} produtos={produtos} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast}/>}
            {tab==="log"      && <TabLog/>}
          </div>
        )}

      <Toasts/>
    </div>
  );
}

export default Uniformes;