/**
 * Uniformes.jsx — v7
 * Arquitetura correta: todos os componentes são funções top-level.
 * Nenhuma "const Pagina = () =>" dentro de render → sem perda de foco no input.
 */

import React, { useState, useEffect, useCallback } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  deleteDoc, updateDoc, serverTimestamp, query, orderBy, writeBatch,
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
  return d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
};

async function registrarLog(acao, desc) {
  await addDoc(collection(db, COL.log), { acao, desc, ts: serverTimestamp() });
}

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  .ur{--bg:#0d0d0f;--s1:#141416;--s2:#1c1c20;--s3:#242428;--b:rgba(255,255,255,.07);--b2:rgba(255,255,255,.13);--text:#f0f0f2;--muted:#64647a;--dim:#33333d;--acc:#f5a623;--ok:#22c55e;--err:#f43f5e;--info:#38bdf8;--warn:#fbbf24;--r:10px;--rs:6px;font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);}
  .ur *{box-sizing:border-box;margin:0;padding:0;}
  .ur input,.ur select,.ur textarea{font-size:16px !important;-webkit-text-size-adjust:100%;}

  /* bottom nav */
  .ur-nav{position:fixed;bottom:0;left:0;right:0;background:rgba(20,20,22,.97);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--b2);display:flex;z-index:500;padding-bottom:env(safe-area-inset-bottom);}
  .ur-nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:10px 4px 8px;border:none;background:transparent;cursor:pointer;color:var(--muted);transition:color .2s;-webkit-tap-highlight-color:transparent;}
  .ur-nav-btn.on{color:var(--acc);}
  .ur-nav-btn svg{transition:transform .2s;}
  .ur-nav-btn.on svg{transform:scale(1.1);}
  .ur-nav-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;line-height:1;}
  .ur-nav-dot{width:4px;height:4px;border-radius:50%;background:var(--acc);margin-top:2px;opacity:0;transition:opacity .2s;}
  .ur-nav-btn.on .ur-nav-dot{opacity:1;}
  /* push content above nav */
  .ur-content{padding-bottom:72px;}

  .ub{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:var(--rs);border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;line-height:1;}
  .ub:disabled{opacity:.38;cursor:not-allowed;}
  .ub-acc{background:var(--acc);color:#0d0d0f;}.ub-acc:hover:not(:disabled){filter:brightness(1.08);}
  .ub-ghost{background:transparent;color:var(--muted);border:1px solid var(--b2);}.ub-ghost:hover:not(:disabled){color:var(--text);background:var(--s3);}
  .ub-err{background:rgba(244,63,94,.1);color:var(--err);border:1px solid rgba(244,63,94,.3);}.ub-err:hover:not(:disabled){background:rgba(244,63,94,.18);}
  .ub-ok{background:rgba(34,197,94,.1);color:var(--ok);border:1px solid rgba(34,197,94,.3);}.ub-ok:hover:not(:disabled){background:rgba(34,197,94,.18);}
  .ub-info{background:rgba(56,189,248,.1);color:var(--info);border:1px solid rgba(56,189,248,.3);}.ub-info:hover:not(:disabled){background:rgba(56,189,248,.18);}
  .ub-sm{padding:6px 11px;font-size:12px;border-radius:5px;}
  .ub-full{width:100%;}
  .ub-icon{padding:7px;}

  .ui{width:100%;background:var(--s2);border:1px solid var(--b2);color:var(--text);padding:10px 13px;border-radius:var(--rs);font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;outline:none;transition:border-color .2s;}
  .ui:focus{border-color:var(--acc);}
  .ui::placeholder{color:var(--muted);}
  .ui-mono{font-family:'JetBrains Mono',monospace;}
  .ui-num{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;text-align:center;padding:8px 13px;}

  .pc{background:var(--s1);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:border-color .2s,transform .2s,box-shadow .2s;overflow:hidden;}
  .pc:hover{border-color:var(--b2);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.45);}

  .ucard{display:flex;align-items:center;gap:13px;padding:13px 15px;background:var(--s1);border:1px solid var(--b);border-radius:var(--r);cursor:pointer;transition:all .2s;}
  .ucard:hover{border-color:var(--b2);background:var(--s2);}
  .uavatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Syne',sans-serif;font-size:19px;font-weight:800;}

  .ustat{background:var(--s2);border:1px solid var(--b);border-radius:var(--rs);padding:7px 13px;display:flex;align-items:center;gap:9px;}
  .ustat-n{font-family:'Syne',sans-serif;font-size:21px;font-weight:700;line-height:1;}
  .ustat-l{font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);}

  .usec{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
  .usec::after{content:'';flex:1;height:1px;background:var(--b);}
  .ulbl{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}
  .ugrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  @media(max-width:500px){.ugrid2{grid-template-columns:1fr;}}

  .u-back{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;background:var(--s2);border:1px solid var(--b2);border-radius:var(--rs);font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s;margin-bottom:18px;}
  .u-back:hover{color:var(--text);background:var(--s3);}
  .u-bc{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);margin-bottom:14px;flex-wrap:wrap;}
  .u-bc-link{cursor:pointer;transition:color .15s;}.u-bc-link:hover{color:var(--text);}
  .u-bc-cur{color:var(--text);}

  .mov{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;}
  .mo{background:var(--s1);border:1px solid var(--b2);border-radius:var(--r);width:100%;max-width:400px;overflow:hidden;}
  .mo-head{padding:16px 20px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;}
  .mo-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;}
  .mo-body{padding:20px;}

  .utoasts{position:fixed;bottom:22px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:5px;}
  .utoast{display:flex;align-items:center;gap:9px;padding:10px 15px;border-radius:var(--rs);font-size:12px;font-family:'JetBrains Mono',monospace;border:1px solid;animation:usl .22s ease;}
  .utoast.ok{background:#0a1a0a;border-color:var(--ok);color:var(--ok);}
  .utoast.err{background:#1a0a0a;border-color:var(--err);color:var(--err);}
  .utoast.info{background:#0a0a1a;border-color:var(--info);color:var(--info);}

  .usearch{position:relative;}
  .usearch .uico{position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;}
  .usearch .ui{padding-left:36px;}
  .uempty{text-align:center;padding:48px 20px;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;}

  .spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.15);border-top-color:currentColor;border-radius:50%;animation:rot .7s linear infinite;display:inline-block;}
  @keyframes usl{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes ufd{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes rot{to{transform:rotate(360deg)}}
  .ufd{animation:ufd .18s ease;}
`;

// ─── Primitivos ───────────────────────────────────────────────
const Spin = () => <span className="spin"/>;

const Ico = ({ d, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,display:"inline-block"}}>{d}</svg>
);
const IPlus    = ({s=15}) => <Ico s={s} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>;
const ICheck   = ({s=15}) => <Ico s={s} d={<polyline points="20 6 9 17 4 12"/>}/>;
const IX       = ({s=14}) => <Ico s={s} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>;
const ITrash   = ({s=14}) => <Ico s={s} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>}/>;
const IEdit    = ({s=13}) => <Ico s={s} d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>;
const IUsers   = ({s=15}) => <Ico s={s} d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}/>;
const IBox     = ({s=15}) => <Ico s={s} d={<><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></>}/>;
const ILog     = ({s=15}) => <Ico s={s} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>}/>;
const ISearch  = ({s=14}) => <Ico s={s} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}/>;
const IRefresh = ({s=14}) => <Ico s={s} d={<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.04"/></>}/>;
const IShirt   = ({s=18,c="#fff"}) => <Ico s={s} c={c} d={<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>}/>;
const IChevron = ({s=14}) => <Ico s={s} d={<polyline points="9 18 15 12 9 6"/>}/>;
const ISend    = ({s=14}) => <Ico s={s} d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>}/>;
const IBack    = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IChart   = ({s=15}) => <Ico s={s} d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}/>;
const IRenew   = ({s=15}) => <Ico s={s} d={<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></>}/>;
const IWarning = ({s=14}) => <Ico s={s} d={<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}/>;

// ─── UI Helpers ───────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="utoasts">
      {toasts.map(t=>(
        <div key={t.id} className={`utoast ${t.type==="success"?"ok":t.type==="error"?"err":"info"}`}>
          {t.type==="success"?<ICheck/>:t.type==="error"?<IX/>:null} {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type="info") => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3200);
  },[]);
  return { add, toasts };
}

const ColorPicker = ({ value, onChange }) => (
  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
    {PALETTE.map(c=>(
      <div key={c} onClick={()=>onChange(c)} style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${value===c?"white":"transparent"}`,boxShadow:value===c?`0 0 0 2px ${c}`:"none",transition:"all .15s"}}/>
    ))}
  </div>
);

const SetorChip = ({ setor, cor }) => {
  const c = cor||"#888";
  return <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"2px 8px",border:`1px solid ${c}44`,color:c,borderRadius:12,background:`${c}15`}}>{setor}</span>;
};

function SearchInput({ value, onChange, placeholder="Buscar..." }) {
  return (
    <div className="usearch">
      <span className="uico"><ISearch/></span>
      <input className="ui" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    </div>
  );
}

function BackBtn({ onClick, label }) {
  return (
    <button className="u-back" onClick={onClick}>
      <IBack/>{label}
    </button>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="u-bc">
      {items.map((item,i)=>(
        <span key={i} style={{display:"flex",alignItems:"center",gap:6}}>
          {i>0&&<span style={{color:"var(--dim)"}}>›</span>}
          {item.onClick
            ? <span className="u-bc-link" onClick={item.onClick}>{item.label}</span>
            : <span className="u-bc-cur">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

// ============================================================
// FORM COMPONENTS — top-level, never inside render
// ============================================================

function FormNovoProduto({ produtos, variacoes, onSalvar, onCancelar }) {
  const [mode, setMode]       = useState("novo");
  const [nome, setNome]       = useState("");
  const [nomeSel, setNomeSel] = useState("");
  const [tam, setTam]         = useState("");
  const [qtd, setQtd]         = useState("0");
  const [cor, setCor]         = useState(PALETTE[0]);
  const [saving, setSaving]   = useState(false);

  const nomesExistentes = [...new Set(produtos.map(p=>p.nome))].sort();
  const tamsDoProd = nomeSel ? variacoes.filter(v=>{
    const p=produtos.find(x=>x.nome===nomeSel); return p&&v.produtoId===p.id;
  }).map(v=>v.tamanho) : [];
  const nomeEfetivo = mode==="existente" ? nomeSel : nome.trim();
  const tamJaExiste = !!(nomeEfetivo && tam && (() => {
    const p=produtos.find(x=>x.nome.toLowerCase()===nomeEfetivo.toLowerCase());
    return p && variacoes.some(v=>v.produtoId===p.id && v.tamanho===tam.trim());
  })());

  useEffect(()=>{ if(mode==="existente"){setNome("");setCor(PALETTE[0]);} },[mode]);
  useEffect(()=>{ setTam(""); },[nomeSel]);

  const submit = async () => {
    const n=nomeEfetivo, t=tam.trim();
    if(!n||!t||tamJaExiste) return;
    setSaving(true);
    await onSalvar({ nome:n, tam:t, qtd:parseInt(qtd)||0, cor, produtos, variacoes });
    setSaving(false);
  };

  return (
    <div style={{background:"var(--s1)",border:"1px solid rgba(245,166,35,.35)",borderRadius:"var(--r)",marginBottom:20,overflow:"hidden"}}>
      <div style={{height:3,background:"var(--acc)"}}/>
      <div style={{padding:"16px 18px"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:"var(--acc)",marginBottom:14}}>NOVO PRODUTO</div>
        <div style={{display:"flex",gap:0,marginBottom:14,background:"var(--s2)",border:"1px solid var(--b)",borderRadius:"var(--rs)",overflow:"hidden"}}>
          {[{id:"novo",l:"Criar nome novo"},{id:"existente",l:"Adicionar tamanho"}].map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{flex:1,padding:"8px 10px",border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:600,transition:"all .15s",background:mode===m.id?"var(--acc)":"transparent",color:mode===m.id?"#0d0d0f":"var(--muted)"}}>
              {m.l}
            </button>
          ))}
        </div>
        {mode==="novo" && (
          <div className="ugrid2" style={{marginBottom:12}}>
            <div>
              <div className="ulbl">Nome *</div>
              <input className="ui" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Camiseta Polo" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
            <div>
              <div className="ulbl">Cor</div>
              <ColorPicker value={cor} onChange={setCor}/>
            </div>
          </div>
        )}
        {mode==="existente" && (
          <div style={{marginBottom:12}}>
            <div className="ulbl">Produto existente *</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {nomesExistentes.length===0
                ? <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>Nenhum produto ainda.</span>
                : nomesExistentes.map(n=>{
                    const c=produtos.find(p=>p.nome===n)?.cor||PALETTE[0], ativo=nomeSel===n;
                    return (
                      <button key={n} onClick={()=>setNomeSel(ativo?"":n)}
                        style={{padding:"6px 13px",borderRadius:"var(--rs)",border:`2px solid ${ativo?c:"var(--b2)"}`,background:ativo?`${c}18`:"transparent",color:ativo?c:"var(--muted)",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:600,transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}}/>{n}
                      </button>
                    );
                  })}
            </div>
            {nomeSel && tamsDoProd.length>0 && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>Já tem:</span>
                {tamsDoProd.map(t=><span key={t} style={{padding:"3px 9px",borderRadius:4,background:"var(--s3)",border:"1px solid var(--b2)",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--muted)"}}>{t}</span>)}
              </div>
            )}
          </div>
        )}
        <div className="ugrid2" style={{marginBottom:14}}>
          <div>
            <div className="ulbl">Tamanho *</div>
            <input className="ui ui-mono" value={tam} onChange={e=>setTam(e.target.value)} placeholder="Ex: M, G, 42, Único" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            {tamJaExiste&&<div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--err)",marginTop:4}}>Tamanho já existe.</div>}
          </div>
          <div>
            <div className="ulbl">Quantidade inicial</div>
            <input className="ui ui-num" type="number" min="0" value={qtd} onChange={e=>setQtd(e.target.value.replace(/[^0-9]/g,""))} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="ub ub-acc ub-full" onClick={submit} disabled={saving||!nomeEfetivo||!tam.trim()||tamJaExiste}>
            {saving?<Spin/>:<>{mode==="existente"&&nomeSel?`Adicionar TAM ${tam||"?"} a "${nomeSel}"`:"Criar produto"}</>}
          </button>
          <button className="ub ub-ghost" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function FormNovoUsuario({ setoresCfg, onSalvar, onCancelar, onCriarSetor }) {
  const [nome, setNome]   = useState("");
  const [setor, setSetor] = useState("");
  const [cor, setCor]     = useState(PALETTE[0]);
  const [saving, setSaving]=useState(false);

  const submit = async () => {
    if(!nome.trim()) return;
    setSaving(true);
    await onSalvar({nome:nome.trim(),setor,cor});
    setSaving(false);
  };

  return (
    <div style={{background:"var(--s1)",border:"1px solid rgba(245,166,35,.35)",borderRadius:"var(--r)",marginBottom:20,overflow:"hidden"}}>
      <div style={{height:3,background:"var(--acc)"}}/>
      <div style={{padding:"16px 18px"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:"var(--acc)",marginBottom:14}}>NOVO USUÁRIO</div>
        <div style={{marginBottom:12}}>
          <div className="ulbl">Nome *</div>
          <input className="ui" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome completo" autoFocus onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div style={{marginBottom:12}}>
          <SeletorSetor setoresCfg={setoresCfg} value={setor} onChange={setSetor} onCriarSetor={onCriarSetor}/>
        </div>
        <div style={{marginBottom:14}}>
          <div className="ulbl">Cor do avatar</div>
          <ColorPicker value={cor} onChange={setCor}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="ub ub-acc ub-full" onClick={submit} disabled={saving||!nome.trim()}>
            {saving?<Spin/>:<>Criar usuário</>}
          </button>
          <button className="ub ub-ghost" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function FormEditarUsuario({ usuario, setoresCfg, onSalvar, onCancelar, onCriarSetor }) {
  const [nome, setNome]   = useState(usuario.nome);
  const [setor, setSetor] = useState(usuario.setor||"");
  const [cor, setCor]     = useState(usuario.cor||PALETTE[0]);
  const [saving, setSaving]=useState(false);

  const submit = async () => {
    if(!nome.trim()) return;
    setSaving(true);
    await onSalvar({nome:nome.trim(),setor,cor});
    setSaving(false);
  };

  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onCancelar()}>
      <div className="mo ufd">
        <div className="mo-head">
          <span className="mo-title">EDITAR USUÁRIO</span>
          <button className="ub ub-ghost ub-icon ub-sm" onClick={onCancelar}><IX/></button>
        </div>
        <div className="mo-body">
          <div style={{marginBottom:12}}>
            <div className="ulbl">Nome</div>
            <input className="ui" value={nome} onChange={e=>setNome(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <div style={{marginBottom:12}}>
            <SeletorSetor setoresCfg={setoresCfg} value={setor} onChange={setSetor} onCriarSetor={onCriarSetor||(() => {})}/>
          </div>
          <div style={{marginBottom:16}}>
            <div className="ulbl">Cor</div>
            <ColorPicker value={cor} onChange={setCor}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="ub ub-acc ub-full" onClick={submit} disabled={saving||!nome.trim()}>{saving?<Spin/>:<>Salvar</>}</button>
            <button className="ub ub-ghost" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormEditarProduto({ produto, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(produto.nome);
  const [cor, setCor]   = useState(produto.cor||PALETTE[0]);
  const [saving, setSaving]=useState(false);
  const submit = async () => {
    if(!nome.trim()) return;
    setSaving(true); await onSalvar({nome:nome.trim(),cor}); setSaving(false);
  };
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onCancelar()}>
      <div className="mo ufd">
        <div className="mo-head"><span className="mo-title">EDITAR PRODUTO</span><button className="ub ub-ghost ub-icon ub-sm" onClick={onCancelar}><IX/></button></div>
        <div className="mo-body">
          <div style={{marginBottom:12}}><div className="ulbl">Nome</div><input className="ui" value={nome} onChange={e=>setNome(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          <div style={{marginBottom:16}}><div className="ulbl">Cor</div><ColorPicker value={cor} onChange={setCor}/></div>
          <div style={{display:"flex",gap:8}}>
            <button className="ub ub-acc ub-full" onClick={submit} disabled={saving||!nome.trim()}>{saving?<Spin/>:<>Salvar</>}</button>
            <button className="ub ub-ghost" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormEditarVariacao({ variacao, onSalvar, onCancelar }) {
  const [tam, setTam] = useState(variacao.tamanho);
  const [qtd, setQtd] = useState(String(variacao.quantidade||0));
  const [saving, setSaving]=useState(false);
  const submit = async () => {
    if(!tam.trim()) return;
    setSaving(true); await onSalvar({tam:tam.trim(),qtd:parseInt(qtd)||0}); setSaving(false);
  };
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onCancelar()}>
      <div className="mo ufd">
        <div className="mo-head"><span className="mo-title">EDITAR TAMANHO</span><button className="ub ub-ghost ub-icon ub-sm" onClick={onCancelar}><IX/></button></div>
        <div className="mo-body">
          <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)",marginBottom:14}}>{variacao.produtoNome}</div>
          <div className="ugrid2" style={{marginBottom:16}}>
            <div><div className="ulbl">Tamanho</div><input className="ui ui-mono" value={tam} onChange={e=>setTam(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
            <div><div className="ulbl">Quantidade</div><input className="ui ui-num" type="number" min="0" value={qtd} onChange={e=>setQtd(e.target.value.replace(/[^0-9]/g,""))} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="ub ub-acc ub-full" onClick={submit} disabled={saving||!tam.trim()}>{saving?<Spin/>:<>Salvar</>}</button>
            <button className="ub ub-ghost" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ação: adicionar ao estoque ───────────────────────────────
function AcaoAdicionar({ variacao, onConfirm, onCancel }) {
  const [qtd, setQtd] = useState("");
  const ref = React.useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);
  const n = parseInt(qtd)||0;
  return (
    <div style={{background:"var(--s2)",border:"1px solid rgba(34,197,94,.3)",borderRadius:"var(--r)",padding:"16px",marginTop:8}}>
      <div className="ulbl" style={{marginBottom:8}}>Quantas unidades chegaram?</div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
        <input ref={ref} className="ui ui-num" type="number" min="1" value={qtd}
          onChange={e=>setQtd(e.target.value.replace(/[^0-9]/g,""))}
          placeholder="0" style={{flex:1}}
          onKeyDown={e=>e.key==="Enter"&&n>0&&onConfirm(n)}/>
        {n>0&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"var(--ok)",whiteSpace:"nowrap"}}>{variacao.quantidade||0} + {n} = <strong>{(variacao.quantidade||0)+n}</strong></div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="ub ub-ok ub-full" onClick={()=>onConfirm(n)} disabled={n<1}><IPlus s={14}/> Adicionar {n||0}</button>
        <button className="ub ub-ghost" onClick={onCancel}>✕</button>
      </div>
    </div>
  );
}

// ─── Ação: enviar para usuário ────────────────────────────────
function AcaoEnviar({ variacao, usuarios, setoresCfg, onConfirm, onCancel }) {
  const [qtd, setQtd]     = useState("1");
  const [userId, setUser] = useState("");
  const [busca, setBusca] = useState("");
  const filtrados = usuarios.filter(u=>!busca||u.nome.toLowerCase().includes(busca.toLowerCase()));
  const n = Math.max(1,parseInt(qtd)||1);

  if ((variacao.quantidade||0)===0) return (
    <div style={{padding:"12px 0",fontFamily:"var(--mono)",fontSize:12,color:"var(--err)"}}>⚠ Estoque zerado.</div>
  );

  return (
    <div style={{background:"var(--s2)",border:"1px solid rgba(56,189,248,.3)",borderRadius:"var(--r)",padding:"16px",marginTop:8}}>
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-end"}}>
        <div style={{width:90}}>
          <div className="ulbl">Quantidade</div>
          <input className="ui ui-num" type="number" min="1" max={variacao.quantidade} value={qtd} onChange={e=>setQtd(e.target.value.replace(/[^0-9]/g,""))} style={{padding:"6px 8px"}}/>
        </div>
        <div style={{flex:1}}>
          <div className="ulbl">Buscar usuário</div>
          <input className="ui" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Nome..."/>
        </div>
      </div>
      <div style={{maxHeight:200,overflowY:"auto",border:"1px solid var(--b)",borderRadius:"var(--rs)",marginBottom:12}}>
        {[...filtrados].sort((a,b)=>a.nome.localeCompare(b.nome)).map(u=>{
          const uc=u.cor||PALETTE[0];
          return (
            <div key={u.id} onClick={()=>setUser(u.id)}
              style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid var(--b)",background:userId===u.id?"rgba(56,189,248,.08)":"transparent",transition:"background .1s"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:`${uc}22`,border:`2px solid ${uc}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:uc}}>{u.nome.charAt(0)}</span>
              </div>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:userId===u.id?"var(--info)":"var(--text)"}}>{u.nome}</span>
              {u.setor&&<SetorChip setor={u.setor} cor={u.cor}/>}
              {userId===u.id&&<ICheck s={13}/>}
            </div>
          );
        })}
        {filtrados.length===0&&<div style={{padding:12,fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>Nenhum usuário</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="ub ub-info ub-full" onClick={()=>onConfirm(userId,n)} disabled={!userId||n<1}><ISend s={13}/> Enviar {n}x</button>
        <button className="ub ub-ghost" onClick={onCancel}>✕</button>
      </div>
    </div>
  );
}

// ─── Ação: descartar do estoque ───────────────────────────────
function AcaoDescartar({ variacao, onConfirm, onCancel }) {
  const [qtd, setQtd]       = useState("1");
  const [motivo, setMotivo] = useState("");
  const ref = React.useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);
  const n = Math.max(1,parseInt(qtd)||1);

  if ((variacao.quantidade||0)===0) return (
    <div style={{padding:"12px 0",fontFamily:"var(--mono)",fontSize:12,color:"var(--err)"}}>⚠ Estoque zerado.</div>
  );

  return (
    <div style={{background:"var(--s2)",border:"1px solid rgba(244,63,94,.3)",borderRadius:"var(--r)",padding:"16px",marginTop:8}}>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"flex-end"}}>
        <div style={{width:90}}>
          <div className="ulbl">Quantidade</div>
          <input className="ui ui-num" type="number" min="1" max={variacao.quantidade} value={qtd} onChange={e=>setQtd(e.target.value.replace(/[^0-9]/g,""))} style={{padding:"6px 8px"}}/>
        </div>
        <div style={{flex:1}}>
          <div className="ulbl">Motivo *</div>
          <input ref={ref} className="ui" value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ex: rasgado..." onKeyDown={e=>e.key==="Enter"&&motivo.trim()&&onConfirm(n,motivo)}/>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="ub ub-err ub-full" onClick={()=>onConfirm(n,motivo)} disabled={!motivo.trim()||n<1}><ITrash s={13}/> Descartar {n}x</button>
        <button className="ub ub-ghost" onClick={onCancel}>✕</button>
      </div>
    </div>
  );
}

// ─── Ação: descartar do usuário ───────────────────────────────
function AcaoDescartarItem({ item, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState("");
  const ref = React.useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);
  return (
    <div style={{marginTop:8}}>
      <input ref={ref} className="ui" value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Motivo do descarte..." style={{marginBottom:8}} onKeyDown={e=>e.key==="Enter"&&motivo.trim()&&onConfirm(motivo)}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
        <button className="ub ub-err ub-full" onClick={()=>onConfirm(motivo)} disabled={!motivo.trim()}><ITrash s={13}/> Confirmar descarte</button>
        <button className="ub ub-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ============================================================
// TELAS DE PRODUTO (top-level components)
// ============================================================

function ListaProdutos({ produtos, variacoes, itens, onSelect, onNovo, showNovo, onCancelNovo, onSalvarNovo, addToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const filtered = produtos.filter(p=>!search||p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><SearchInput value={search} onChange={setSearch} placeholder="Buscar produto..."/></div>
        <button className="ub ub-acc" onClick={onNovo}><IPlus s={14}/> Novo</button>
      </div>
      {showNovo && <FormNovoProduto produtos={produtos} variacoes={variacoes} onSalvar={onSalvarNovo} onCancelar={onCancelNovo}/>}
      {produtos.length>0 && (
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          {[{l:"Produtos",v:produtos.length,c:"var(--muted)"},{l:"Em estoque",v:variacoes.reduce((s,v)=>s+(v.quantidade||0),0),c:"var(--ok)"},{l:"Atribuídos",v:itens.reduce((s,i)=>s+(i.qtd||1),0),c:"var(--info)"}].map(s=>(
            <div key={s.l} className="ustat"><span className="ustat-n" style={{color:s.c}}>{s.v}</span><span className="ustat-l">{s.l}</span></div>
          ))}
        </div>
      )}
      {filtered.length===0
        ? <div className="uempty"><IBox s={32}/><div style={{marginTop:12}}>Nenhum produto. Clique em "Novo" para começar.</div></div>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))",gap:12}}>
            {filtered.map(p=>{
              const vars=variacoes.filter(v=>v.produtoId===p.id);
              const total=vars.reduce((s,v)=>s+(v.quantidade||0),0);
              const cor=p.cor||PALETTE[0];
              return (
                <div key={p.id} className="pc" onClick={()=>onSelect(p)}>
                  <div style={{height:3,background:cor}}/>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,marginBottom:8}}>{p.nome}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                      {vars.length===0
                        ? <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>sem tamanhos</span>
                        : vars.map(v=><span key={v.id} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:5,border:`1px solid ${cor}44`,color:cor,background:`${cor}12`,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{v.tamanho} · <strong>{v.quantidade||0}</strong></span>)}
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>total estoque</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:38,fontWeight:800,lineHeight:1,color:total>0?cor:"var(--err)"}}>{total}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function DetalheProduto({ produto, variacoes, itens, usuarios, setoresCfg, onVoltar, onSelectVar, addToast, onRefresh }) {
  const vars = variacoes.filter(v=>v.produtoId===produto.id);
  const cor  = produto.cor||PALETTE[0];
  const [editP, setEditP]   = useState(false);
  const [editV, setEditV]   = useState(null);

  const excluirVar = async (v) => {
    if(!confirm(`Excluir TAM ${v.tamanho}?`)) return;
    await deleteDoc(doc(db,COL.variacoes,v.id));
    const iSnap=await getDocs(collection(db,COL.itens));
    const batch=writeBatch(db); iSnap.docs.filter(d=>d.data().variacaoId===v.id).forEach(d=>batch.delete(d.ref));
    await batch.commit();
    await registrarLog("variacao_excluida",`"${produto.nome}" TAM ${v.tamanho} excluído`);
    addToast("Tamanho excluído.","success");
    if(vars.length===1){ await deleteDoc(doc(db,COL.produtos,produto.id)); onVoltar(); }
    else onRefresh();
  };

  const excluirProd = async () => {
    if(!confirm(`Excluir "${produto.nome}" e todos os tamanhos?`)) return;
    const batch=writeBatch(db); batch.delete(doc(db,COL.produtos,produto.id));
    vars.forEach(v=>batch.delete(doc(db,COL.variacoes,v.id)));
    const iSnap=await getDocs(collection(db,COL.itens)); iSnap.docs.filter(d=>d.data().produtoId===produto.id).forEach(d=>batch.delete(d.ref));
    await batch.commit();
    await registrarLog("produto_excluido",`"${produto.nome}" excluído`);
    addToast("Produto excluído.","success"); onVoltar();
  };

  return (
    <div>
      <Breadcrumb items={[{label:"Produtos",onClick:onVoltar},{label:produto.nome}]}/>
      <BackBtn onClick={onVoltar} label="Voltar para produtos"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:cor}}>{produto.nome}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--muted)",marginTop:2}}>
            {vars.length} tamanho{vars.length!==1?"s":""} · {vars.reduce((s,v)=>s+(v.quantidade||0),0)} em estoque
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button className="ub ub-ghost ub-sm" onClick={()=>setEditP(true)}><IEdit/> Editar</button>
          <button className="ub ub-err ub-sm" onClick={excluirProd}><ITrash/> Excluir</button>
        </div>
      </div>
      <div className="usec">Tamanhos disponíveis</div>
      {vars.length===0
        ? <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--muted)",padding:"20px",textAlign:"center",border:"1px dashed var(--b)",borderRadius:"var(--rs)"}}>Nenhum tamanho cadastrado.</div>
        : vars.map(v=>(
          <div key={v.id} onClick={()=>onSelectVar(v)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"var(--s2)",border:"1px solid var(--b)",borderRadius:"var(--rs)",marginBottom:8,cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${cor}88`;e.currentTarget.style.background=`${cor}08`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--b)";e.currentTarget.style.background="var(--s2)";}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:cor,minWidth:56,lineHeight:1}}>{v.tamanho}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>em estoque</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,lineHeight:1,color:v.quantidade>0?cor:"var(--err)"}}>{v.quantidade||0}</div>
            </div>
            <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
              <button className="ub ub-ghost ub-icon ub-sm" onClick={()=>setEditV(v)}><IEdit/></button>
              <button className="ub ub-err ub-icon ub-sm" onClick={()=>excluirVar(v)}><ITrash/></button>
            </div>
            <IChevron/>
          </div>
        ))}
      {editP && (
        <FormEditarProduto produto={produto} onCancelar={()=>setEditP(false)} onSalvar={async({nome,cor})=>{
          await updateDoc(doc(db,COL.produtos,produto.id),{nome,cor});
          const batch=writeBatch(db); variacoes.filter(v=>v.produtoId===produto.id).forEach(v=>batch.update(doc(db,COL.variacoes,v.id),{produtoNome:nome}));
          await batch.commit();
          await registrarLog("produto_editado",`"${produto.nome}" → "${nome}"`);
          addToast("Produto atualizado!","success"); setEditP(false); onRefresh();
        }}/>
      )}
      {editV && (
        <FormEditarVariacao variacao={editV} onCancelar={()=>setEditV(null)} onSalvar={async({tam,qtd})=>{
          await updateDoc(doc(db,COL.variacoes,editV.id),{tamanho:tam,quantidade:qtd});
          await registrarLog("variacao_editada",`"${editV.produtoNome}" TAM ${editV.tamanho}→${tam}`);
          addToast("Tamanho atualizado!","success"); setEditV(null); onRefresh();
        }}/>
      )}
    </div>
  );
}

function DetalheVariacao({ produto, variacao, usuarios, setoresCfg, onVoltar, onVoltarLista, addToast, onRefresh }) {
  const cor = produto?.cor||PALETTE[0];
  const [acao, setAcao]         = useState(null);
  const [saving, setSaving]     = useState(false);

  const doAdicionar = async (n) => {
    setSaving(true);
    try {
      const nova=(variacao.quantidade||0)+n;
      await updateDoc(doc(db,COL.variacoes,variacao.id),{quantidade:nova});
      await registrarLog("entrada_estoque",`+${n} em "${variacao.produtoNome}" TAM ${variacao.tamanho}`);
      addToast(`+${n} adicionados!`,"success"); setAcao(null); onRefresh();
    } catch(e){addToast("Erro: "+e.message,"error");}
    finally{setSaving(false);}
  };

  const doEnviar = async (userId, qtd) => {
    if(!userId){addToast("Selecione um usuário.","error");return;}
    if((variacao.quantidade||0)<qtd){addToast(`Insuficiente. Disponível: ${variacao.quantidade||0}.`,"error");return;}
    setSaving(true);
    try {
      const u=usuarios.find(u=>u.id===userId);
      const nova=(variacao.quantidade||0)-qtd;
      await updateDoc(doc(db,COL.variacoes,variacao.id),{quantidade:nova});
      await addDoc(collection(db,COL.itens),{userId,userName:u.nome,userSetor:u.setor||"",produtoId:produto.id,produtoNome:produto.nome,variacaoId:variacao.id,tamanho:variacao.tamanho,cor:produto.cor||PALETTE[0],qtd,data:serverTimestamp()});
      await registrarLog("envio_usuario",`${qtd}x "${produto.nome}" TAM ${variacao.tamanho} → ${u.nome}`);
      addToast(`${qtd}x enviado para ${u.nome}!`,"success"); setAcao(null); onRefresh();
    } catch(e){addToast("Erro: "+e.message,"error");}
    finally{setSaving(false);}
  };

  const doDescartar = async (qtd, motivo) => {
    if((variacao.quantidade||0)<qtd){addToast(`Insuficiente. Disponível: ${variacao.quantidade||0}.`,"error");return;}
    setSaving(true);
    try {
      const nova=(variacao.quantidade||0)-qtd;
      await updateDoc(doc(db,COL.variacoes,variacao.id),{quantidade:nova});
      await registrarLog("descarte",`${qtd}x "${produto.nome}" TAM ${variacao.tamanho} descartado — ${motivo}`);
      addToast("Descartado.","info"); setAcao(null); onRefresh();
    } catch(e){addToast("Erro: "+e.message,"error");}
    finally{setSaving(false);}
  };

  return (
    <div>
      <Breadcrumb items={[{label:"Produtos",onClick:onVoltarLista},{label:produto?.nome||"",onClick:onVoltar},{label:`TAM ${variacao?.tamanho}`}]}/>
      <BackBtn onClick={onVoltar} label={`Voltar para ${produto?.nome}`}/>
      <div style={{background:`${cor}10`,border:`1px solid ${cor}44`,borderRadius:"var(--r)",padding:"18px 20px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:`${cor}cc`,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{produto?.nome}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>Tamanho {variacao?.tamanho}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>em estoque</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:48,fontWeight:800,lineHeight:1,color:variacao?.quantidade>0?cor:"var(--err)"}}>{variacao?.quantidade||0}</div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[{id:"adicionar",l:"+ Estoque",cls:"ub-ok"},{id:"enviar",l:"→ Usuário",cls:"ub-info"},{id:"descartar",l:"✕ Descartar",cls:"ub-err"}].map(a=>(
          <button key={a.id} className={`ub ${a.cls}`}
            style={{justifyContent:"center",outline:acao===a.id?"2px solid currentColor":"none",outlineOffset:2}}
            onClick={()=>setAcao(acao===a.id?null:a.id)}>
            {a.l}
          </button>
        ))}
      </div>
      {acao==="adicionar" && <AcaoAdicionar key={`add-${variacao?.id}`} variacao={variacao} onConfirm={doAdicionar} onCancel={()=>setAcao(null)}/>}
      {acao==="enviar"    && <AcaoEnviar    key={`env-${variacao?.id}`} variacao={variacao} usuarios={usuarios} setoresCfg={setoresCfg} onConfirm={doEnviar} onCancel={()=>setAcao(null)}/>}
      {acao==="descartar" && <AcaoDescartar key={`desc-${variacao?.id}`} variacao={variacao} onConfirm={doDescartar} onCancel={()=>setAcao(null)}/>}
    </div>
  );
}

// ============================================================
// TAB PRODUTOS
// ============================================================
function TabProdutos({ produtos, variacoes, itens, usuarios, setoresCfg, onRefresh, addToast }) {
  const [pagina, setPagina]   = useState("lista");  // "lista"|"produto"|"variacao"
  const [selProd, setSelProd] = useState(null);
  const [selVar, setSelVar]   = useState(null);
  const [showNovo, setShowNovo] = useState(false);

  const irProd = (p) => { setSelProd(p); setSelVar(null); setPagina("produto"); };
  const irVar  = (v) => { setSelVar(v);  setPagina("variacao"); };
  const irLista = ()  => { setSelProd(null); setSelVar(null); setPagina("lista"); setShowNovo(false); };
  const irProdBack = () => { setSelVar(null); setPagina("produto"); };

  const salvarNovoProduto = async ({ nome, tam, qtd, cor, produtos: ps, variacoes: vs }) => {
    const existente = ps.find(p=>p.nome.toLowerCase()===nome.toLowerCase());
    let produtoId;
    if (existente) { produtoId=existente.id; }
    else {
      const ref=await addDoc(collection(db,COL.produtos),{nome,cor,criadoEm:serverTimestamp()});
      produtoId=ref.id;
    }
    await addDoc(collection(db,COL.variacoes),{produtoId,produtoNome:nome,tamanho:tam,quantidade:qtd,criadoEm:serverTimestamp()});
    await registrarLog("produto_criado",`"${nome}" TAM ${tam} criado (${qtd} un.)`);
    addToast(`"${nome}" TAM ${tam} criado!`,"success");
    setShowNovo(false); onRefresh();
  };

  if (pagina==="variacao" && selVar && selProd) return (
    <DetalheVariacao produto={selProd} variacao={selVar} usuarios={usuarios} setoresCfg={setoresCfg}
      onVoltar={irProdBack} onVoltarLista={irLista} addToast={addToast}
      onRefresh={()=>{ onRefresh(); setSelVar(v=>{ const up=variacoes.find(x=>x.id===v?.id); return up||null; }); }}/>
  );

  if (pagina==="produto" && selProd) return (
    <DetalheProduto produto={selProd} variacoes={variacoes} itens={itens} usuarios={usuarios} setoresCfg={setoresCfg}
      onVoltar={irLista} onSelectVar={irVar} addToast={addToast}
      onRefresh={()=>{ onRefresh(); setSelProd(p=>{ const up=produtos.find(x=>x.id===p?.id); return up||null; }); }}/>
  );

  return (
    <ListaProdutos produtos={produtos} variacoes={variacoes} itens={itens}
      onSelect={irProd} onNovo={()=>setShowNovo(v=>!v)}
      showNovo={showNovo} onCancelNovo={()=>setShowNovo(false)} onSalvarNovo={salvarNovoProduto}
      addToast={addToast} onRefresh={onRefresh}/>
  );
}

// ============================================================
// TELAS DE USUÁRIO (top-level components)
// ============================================================

function ListaUsuarios({ usuarios, itens, onSelect, onNovo, showNovo, onCancelNovo, onSalvarNovo, setoresCfg, addToast, onRefresh, onCriarSetor }) {
  const [search, setSearch] = useState("");
  const filtered = usuarios.filter(u=>!search||u.nome.toLowerCase().includes(search.toLowerCase())||(u.setor||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><SearchInput value={search} onChange={setSearch} placeholder="Buscar usuário ou setor..."/></div>
        <button className="ub ub-acc" onClick={onNovo}><IPlus s={14}/> Novo usuário</button>
      </div>
      {showNovo && <FormNovoUsuario setoresCfg={setoresCfg} onSalvar={onSalvarNovo} onCancelar={onCancelNovo} onCriarSetor={onCriarSetor}/>}
      {usuarios.length>0 && (
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          <div className="ustat"><span className="ustat-n" style={{color:"var(--muted)"}}>{usuarios.length}</span><span className="ustat-l">Usuários</span></div>
          <div className="ustat"><span className="ustat-n" style={{color:"var(--info)"}}>{itens.reduce((s,i)=>s+(i.qtd||1),0)}</span><span className="ustat-l">Itens atribuídos</span></div>
        </div>
      )}
      {filtered.length===0
        ? <div className="uempty"><IUsers s={32}/><div style={{marginTop:12}}>Nenhum usuário.</div></div>
        : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[...filtered].sort((a,b)=>a.nome.localeCompare(b.nome)).map(u=>{
              const cor=u.cor||PALETTE[0];
              const qtdU=itens.filter(i=>i.userId===u.id).reduce((s,i)=>s+(i.qtd||1),0);
              return (
                <div key={u.id} className="ucard" onClick={()=>onSelect(u)}>
                  <div className="uavatar" style={{background:`${cor}22`,border:`2px solid ${cor}44`,color:cor}}>{u.nome.charAt(0).toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{u.nome}</div>
                    {u.setor&&<SetorChip setor={u.setor} cor={cor}/>}
                  </div>
                  {qtdU>0&&<div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:700,color:"var(--info)",lineHeight:1}}>{qtdU}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--muted)"}}>peças</div>
                  </div>}
                  <IChevron/>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── Modal de confirmação com motivo opcional ────────────────
function ModalConfirm({ titulo, descricao, corAcento="var(--err)", pedirMotivo=false, labelMotivo="Motivo", onConfirm, onCancel, confirmLabel="Confirmar", loading=false }) {
  const [motivo, setMotivo] = useState("");
  const ref = React.useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);
  const ok = !pedirMotivo || motivo.trim().length > 0;
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="mo ufd" style={{border:`1px solid ${corAcento}44`}}>
        <div className="mo-head" style={{borderColor:`${corAcento}44`}}>
          <span className="mo-title" style={{color:corAcento}}>{titulo}</span>
          <button className="ub ub-ghost ub-icon ub-sm" onClick={onCancel}><IX/></button>
        </div>
        <div className="mo-body">
          {descricao && <div style={{fontSize:13,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>{descricao}</div>}
          {pedirMotivo && (
            <div style={{marginBottom:16}}>
              <div className="ulbl" style={{marginBottom:6}}>{labelMotivo} *</div>
              <textarea ref={ref} className="ui" rows={2} value={motivo} onChange={e=>setMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                style={{resize:"vertical",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button className="ub ub-full" style={{background:corAcento==="var(--err)"?"rgba(244,63,94,.12)":corAcento==="var(--ok)"?"rgba(34,197,94,.12)":"rgba(56,189,248,.12)",color:corAcento,border:`1px solid ${corAcento}55`}}
              onClick={()=>onConfirm(motivo)} disabled={loading||!ok}>
              {loading?<Spin/>:<>{confirmLabel}</>}
            </button>
            <button className="ub ub-ghost" onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SeletorSetor — lista de setores + botão criar ────────────
function SeletorSetor({ setoresCfg, value, onChange, onCriarSetor }) {
  const [criando, setCriando] = useState(false);
  const [novoSetor, setNovoSetor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ref = React.useRef(null);
  useEffect(()=>{ if(criando) ref.current?.focus(); },[criando]);

  const criar = async () => {
    const n = novoSetor.trim();
    if(!n) return;
    setSalvando(true);
    await onCriarSetor(n);
    onChange(n);
    setNovoSetor(""); setCriando(false); setSalvando(false);
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <div className="ulbl" style={{marginBottom:0,flex:1}}>Setor</div>
        <button className="ub ub-ghost ub-sm" style={{padding:"3px 8px",fontSize:11}} onClick={()=>setCriando(v=>!v)}>
          <IPlus s={12}/> {criando?"Cancelar":"Novo setor"}
        </button>
      </div>
      {criando ? (
        <div style={{display:"flex",gap:6}}>
          <input ref={ref} className="ui" value={novoSetor} onChange={e=>setNovoSetor(e.target.value)}
            placeholder="Nome do novo setor..." style={{flex:1}}
            onKeyDown={e=>e.key==="Enter"&&criar()}/>
          <button className="ub ub-acc ub-sm" onClick={criar} disabled={salvando||!novoSetor.trim()}>
            {salvando?<Spin/>:<ICheck s={13}/>}
          </button>
        </div>
      ) : (
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {setoresCfg.length===0
            ? <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>Nenhum setor. Clique em "Novo setor".</span>
            : setoresCfg.map(s=>{
                const cor=s.cor||PALETTE[0], ativo=value===s.nome;
                return (
                  <button key={s.id} onClick={()=>onChange(ativo?"":s.nome)}
                    style={{padding:"6px 12px",borderRadius:"var(--rs)",border:`2px solid ${ativo?cor:"var(--b2)"}`,background:ativo?`${cor}18`:"transparent",color:ativo?cor:"var(--muted)",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:600,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:cor,flexShrink:0}}/>{s.nome}
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}

function DetalheUsuario({ usuario, itens, variacoes, onVoltar, setoresCfg, addToast, onRefresh, onCriarSetor }) {
  const cor = usuario.cor||PALETTE[0];
  const userItens = itens.filter(i=>i.userId===usuario.id);
  const [editando, setEditando]     = useState(false);
  const [modalExcluir, setMExcluir] = useState(false);
  const [devolvendoId, setDevolId]  = useState(null);
  const [descartandoId, setDescId]  = useState(null);

  const excluirConfirm = async (motivo) => {
    if(userItens.length>0){addToast("Usuário tem itens atribuídos. Devolva ou descarte primeiro.","error");setMExcluir(false);return;}
    await deleteDoc(doc(db,COL.usuarios,usuario.id));
    await registrarLog("usuario_excluido",`"${usuario.nome}" excluído — ${motivo||"sem motivo"}`);
    addToast("Usuário excluído.","success"); onVoltar();
  };

  const devolverConfirm = async (item, motivo) => {
    const v=variacoes.find(v=>v.id===item.variacaoId);
    if(v) await updateDoc(doc(db,COL.variacoes,v.id),{quantidade:(v.quantidade||0)+(item.qtd||1)});
    await deleteDoc(doc(db,COL.itens,item.id));
    await registrarLog("devolucao_estoque",`${item.qtd||1}x "${item.produtoNome}" TAM ${item.tamanho} devolvido de ${usuario.nome}${motivo?" — "+motivo:""}`);
    addToast("Devolvido ao estoque!","success"); setDevolId(null); onRefresh();
  };

  const descartarConfirm = async (item, motivo) => {
    await deleteDoc(doc(db,COL.itens,item.id));
    await registrarLog("descarte_usuario",`${item.qtd||1}x "${item.produtoNome}" TAM ${item.tamanho} descartado de ${usuario.nome} — ${motivo}`);
    addToast("Descartado.","info"); setDescId(null); onRefresh();
  };

  return (
    <div>
      {/* Cabeçalho compacto */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <button className="u-back" style={{margin:0}} onClick={onVoltar}><IBack/></button>
        <div style={{width:38,height:38,borderRadius:"50%",background:`${cor}22`,border:`2px solid ${cor}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:cor}}>
          {usuario.nome.charAt(0).toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {usuario.nome}
            {usuario.setor&&<SetorChip setor={usuario.setor} cor={cor}/>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <button className="ub ub-ghost ub-sm ub-icon" onClick={()=>setEditando(true)}><IEdit/></button>
          <button className="ub ub-err ub-sm ub-icon" onClick={()=>setMExcluir(true)}><ITrash/></button>
        </div>
      </div>

      <div className="usec">Uniformes atribuídos ({userItens.reduce((s,i)=>s+(i.qtd||1),0)} peças)</div>

      {userItens.length===0
        ? <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--muted)",padding:"24px",textAlign:"center",border:"1px dashed var(--b)",borderRadius:"var(--rs)"}}>Nenhum uniforme atribuído.</div>
        : userItens.map(item=>{
            const icor=item.cor||PALETTE[0];
            return (
              <div key={item.id} style={{background:"var(--s2)",border:"1px solid var(--b)",borderRadius:"var(--r)",marginBottom:10,overflow:"hidden"}}>
                <div style={{height:3,background:icor}}/>
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <div style={{width:44,height:44,borderRadius:"var(--rs)",background:`${icor}18`,border:`2px solid ${icor}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <IShirt s={22} c={icor}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:icor,lineHeight:1.1}}>{item.produtoNome}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--muted)",marginTop:3}}>Tamanho {item.tamanho} · {fmt(item.data)}</div>
                    </div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"var(--info)",flexShrink:0}}>×{item.qtd||1}</div>
                  </div>
                  {devolvendoId===item.id
                    ? <AcaoDescartarItem key={`dev-${item.id}`} item={item}
                        onConfirm={motivo=>devolverConfirm(item,motivo)} onCancel={()=>setDevolId(null)}/>
                    : descartandoId===item.id
                    ? <AcaoDescartarItem key={`desc-${item.id}`} item={item}
                        onConfirm={motivo=>descartarConfirm(item,motivo)} onCancel={()=>setDescId(null)}/>
                    : (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <button className="ub ub-ok ub-full" onClick={()=>setDevolId(item.id)}><IRefresh s={15}/> Devolver ao estoque</button>
                        <button className="ub ub-err ub-full" onClick={()=>setDescId(item.id)}><ITrash s={15}/> Descartar</button>
                      </div>
                    )}
                </div>
              </div>
            );
          })}

      {editando && (
        <FormEditarUsuario usuario={usuario} setoresCfg={setoresCfg} onCriarSetor={onCriarSetor}
          onCancelar={()=>setEditando(false)} onSalvar={async({nome,setor,cor})=>{
            await updateDoc(doc(db,COL.usuarios,usuario.id),{nome,setor,cor});
            await registrarLog("usuario_editado",`"${usuario.nome}" → "${nome}"`);
            addToast("Atualizado!","success"); setEditando(false); onRefresh();
          }}/>
      )}

      {modalExcluir && (
        <ModalConfirm
          titulo="Excluir usuário"
          descricao={`Tem certeza que deseja excluir "${usuario.nome}"? Esta ação não pode ser desfeita.`}
          corAcento="var(--err)"
          pedirMotivo={true}
          labelMotivo="Motivo da exclusão"
          confirmLabel="Excluir usuário"
          onConfirm={excluirConfirm}
          onCancel={()=>setMExcluir(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// TAB USUÁRIOS
// ============================================================
function TabUsuarios({ usuarios, itens, variacoes, produtos, setoresCfg, onRefresh, addToast }) {
  const [pagina, setPagina]     = useState("lista");
  const [selUser, setSelUser]   = useState(null);
  const [showNovo, setShowNovo] = useState(false);

  const irUser  = (u) => { setSelUser(u); setPagina("usuario"); };
  const irLista = ()  => { setSelUser(null); setPagina("lista"); setShowNovo(false); };

  const criarSetor = async (nome) => {
    if(setoresCfg.some(x=>x.nome.toLowerCase()===nome.toLowerCase())) return;
    await addDoc(collection(db,COL.setores),{nome,cor:PALETTE[Math.floor(Math.random()*PALETTE.length)],criadoEm:serverTimestamp()});
    onRefresh();
  };

  const salvarNovoUsuario = async ({ nome, setor, cor }) => {
    if(usuarios.some(u=>u.nome.toLowerCase()===nome.toLowerCase())){addToast("Usuário já existe.","error");return;}
    if(setor&&!setoresCfg.some(x=>x.nome.toLowerCase()===setor.toLowerCase())){
      await addDoc(collection(db,COL.setores),{nome:setor,cor,criadoEm:serverTimestamp()});
    }
    await addDoc(collection(db,COL.usuarios),{nome,setor,cor,criadoEm:serverTimestamp()});
    await registrarLog("usuario_criado",`"${nome}" (${setor||"sem setor"}) criado`);
    addToast(`"${nome}" criado!`,"success");
    setShowNovo(false); onRefresh();
  };

  if (pagina==="usuario" && selUser) return (
    <DetalheUsuario usuario={selUser} itens={itens} variacoes={variacoes} setoresCfg={setoresCfg}
      onVoltar={irLista} addToast={addToast} onCriarSetor={criarSetor}
      onRefresh={()=>{ onRefresh(); setSelUser(u=>{ const up=usuarios.find(x=>x.id===u?.id); return up||null; }); }}/>
  );

  return (
    <ListaUsuarios usuarios={usuarios} itens={itens} setoresCfg={setoresCfg}
      onSelect={irUser} onNovo={()=>setShowNovo(v=>!v)}
      showNovo={showNovo} onCancelNovo={()=>setShowNovo(false)}
      onSalvarNovo={salvarNovoUsuario} onCriarSetor={criarSetor}
      addToast={addToast} onRefresh={onRefresh}/>
  );
}

// ============================================================
// TAB ANALYTICS
// ============================================================
function TabAnalytics({ produtos, variacoes, itens }) {
  const totalEstoque = variacoes.reduce((s,v)=>s+(v.quantidade||0),0);
  const totalAtrib   = itens.reduce((s,i)=>s+(i.qtd||1),0);
  const totalGeral   = totalEstoque + totalAtrib;

  // Por produto: agrupa variações e itens
  const porProduto = produtos.map(p=>{
    const vars = variacoes.filter(v=>v.produtoId===p.id);
    const estoque = vars.reduce((s,v)=>s+(v.quantidade||0),0);
    const atrib   = itens.filter(i=>i.produtoId===p.id).reduce((s,i)=>s+(i.qtd||1),0);
    const total   = estoque + atrib;
    const cor     = p.cor||PALETTE[0];
    return { ...p, estoque, atrib, total, cor, vars };
  }).sort((a,b)=>b.total-a.total);

  const Bar = ({ value, max, cor }) => {
    const pct = max>0 ? Math.round((value/max)*100) : 0;
    return (
      <div style={{height:6,background:"var(--s3)",borderRadius:3,overflow:"hidden",flex:1}}>
        <div style={{height:"100%",width:`${pct}%`,background:cor,borderRadius:3,transition:"width .4s ease"}}/>
      </div>
    );
  };

  return (
    <div>
      {/* Cards totais */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:24}}>
        {[
          {l:"Total geral",   v:totalGeral,   c:"var(--text)",  sub:"peças registradas"},
          {l:"Em estoque",    v:totalEstoque, c:"var(--ok)",    sub:"disponíveis"},
          {l:"Atribuídos",    v:totalAtrib,   c:"var(--info)",  sub:"com usuários"},
          {l:"Produtos",      v:produtos.length, c:"var(--acc)", sub:"tipos diferentes"},
        ].map(s=>(
          <div key={s.l} style={{background:"var(--s1)",border:"1px solid var(--b)",borderRadius:"var(--r)",padding:"14px 16px"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:800,lineHeight:1,color:s.c,marginBottom:4}}>{s.v}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--muted)"}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Por produto */}
      <div className="usec">Por produto</div>
      {porProduto.length===0
        ? <div className="uempty"><IChart s={32}/><div style={{marginTop:12}}>Nenhum produto cadastrado.</div></div>
        : porProduto.map(p=>(
          <div key={p.id} style={{background:"var(--s1)",border:"1px solid var(--b)",borderRadius:"var(--r)",marginBottom:10,overflow:"hidden"}}>
            <div style={{height:3,background:p.cor}}/>
            <div style={{padding:"14px 16px"}}>
              {/* Nome + números */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,flex:1,minWidth:120}}>{p.nome}</div>
                <div style={{display:"flex",gap:16,flexShrink:0}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--ok)",letterSpacing:1,textTransform:"uppercase"}}>Estoque</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"var(--ok)",lineHeight:1}}>{p.estoque}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--info)",letterSpacing:1,textTransform:"uppercase"}}>Atribuído</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"var(--info)",lineHeight:1}}>{p.atrib}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase"}}>Total</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:p.cor,lineHeight:1}}>{p.total}</div>
                  </div>
                </div>
              </div>
              {/* Barra estoque vs atribuído */}
              {p.total>0 && (
                <div style={{marginBottom:10}}>
                  <div style={{height:8,borderRadius:4,overflow:"hidden",background:"var(--s3)",display:"flex"}}>
                    <div style={{height:"100%",width:`${Math.round((p.estoque/p.total)*100)}%`,background:"var(--ok)",transition:"width .4s"}}/>
                    <div style={{height:"100%",width:`${Math.round((p.atrib/p.total)*100)}%`,background:"var(--info)",transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:4}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--ok)",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"var(--ok)",display:"inline-block"}}/>
                      Estoque {p.total>0?Math.round((p.estoque/p.total)*100):0}%
                    </span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--info)",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"var(--info)",display:"inline-block"}}/>
                      Atribuído {p.total>0?Math.round((p.atrib/p.total)*100):0}%
                    </span>
                  </div>
                </div>
              )}
              {/* Por tamanho */}
              {p.vars.length>0 && (
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {p.vars.map(v=>{
                    const atribV=itens.filter(i=>i.variacaoId===v.id).reduce((s,i)=>s+(i.qtd||1),0);
                    const totalV=(v.quantidade||0)+atribV;
                    return (
                      <div key={v.id} style={{background:"var(--s2)",border:`1px solid ${p.cor}33`,borderRadius:"var(--rs)",padding:"6px 10px",minWidth:70}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:p.cor,marginBottom:2}}>{v.tamanho}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--ok)"}}>est: {v.quantidade||0}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--info)"}}>atr: {atribV}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

// ============================================================
// TAB LOG
// ============================================================
function TabLog() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLd]    = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLd(true);
    try { const s=await getDocs(query(collection(db,COL.log),orderBy("ts","desc"))); setLogs(s.docs.map(d=>({id:d.id,...d.data()}))); }
    catch{} finally{setLd(false);}
  };
  useEffect(()=>{ load(); },[]);

  const dotC = (a) => ({produto_criado:"var(--acc)",produto_excluido:"var(--err)",variacao_excluida:"var(--err)",entrada_estoque:"var(--ok)",envio_usuario:"var(--info)",devolucao_estoque:"var(--warn)",descarte:"var(--err)",descarte_usuario:"var(--err)",usuario_criado:"var(--acc)",usuario_editado:"var(--acc)",usuario_excluido:"var(--err)",produto_editado:"var(--acc)",variacao_editada:"var(--acc)"}[a]||"var(--muted)");
  const filtered = logs.filter(l=>!search||(l.desc||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center"}}>
        <div style={{flex:1}}><SearchInput value={search} onChange={setSearch} placeholder="Buscar no histórico..."/></div>
        <button className="ub ub-ghost" onClick={load}><IRefresh s={14}/> Atualizar</button>
      </div>
      {loading
        ? <div className="uempty"><Spin/></div>
        : filtered.length===0
          ? <div className="uempty"><ILog s={32}/><div style={{marginTop:12}}>Nenhum registro.</div></div>
          : (
            <div style={{background:"var(--s1)",border:"1px solid var(--b)",borderRadius:"var(--r)"}}>
              {filtered.map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"11px 16px",borderBottom:"1px solid var(--b)"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:dotC(l.acao),flexShrink:0,marginTop:5}}/>
                  <div style={{flex:1,fontSize:13,lineHeight:1.5}}>{l.desc||l.acao}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--muted)",whiteSpace:"nowrap",flexShrink:0}}>{fmt(l.ts)}</div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

// ============================================================
// MODAL RENOVAR
// ============================================================
function ModalRenovar({ onClose, onConfirm, renovando }) {
  const [pin, setPin]       = useState("");
  const [motivo, setMotivo] = useState("");
  const pinRef = React.useRef(null);
  useEffect(()=>{ pinRef.current?.focus(); },[]);
  const ok = pin==="4510" && motivo.trim().length>0;
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mo ufd" style={{border:"1px solid var(--err)"}}>
        <div className="mo-head" style={{borderColor:"var(--err)"}}>
          <span className="mo-title" style={{color:"var(--err)"}}>⚠ RENOVAR UNIFORMES</span>
          <button className="ub ub-ghost ub-icon ub-sm" onClick={onClose}><IX/></button>
        </div>
        <div className="mo-body">
          <div style={{background:"rgba(244,63,94,.06)",border:"1px solid rgba(244,63,94,.25)",borderRadius:"var(--rs)",padding:"12px 14px",marginBottom:16,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--err)",lineHeight:1.8}}>
            Esta ação apaga permanentemente:<br/>
            · Produtos e tamanhos · Usuários<br/>
            · Itens atribuídos · Setores · Log<br/>
            <strong>Só afeta o módulo Uniformes.</strong>
          </div>
          <div style={{marginBottom:12}}>
            <div className="ulbl" style={{marginBottom:6}}>Motivo da renovação *</div>
            <textarea className="ui" rows={2} value={motivo} onChange={e=>setMotivo(e.target.value)}
              placeholder="Ex: início de temporada, troca de coleção..." style={{resize:"none"}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div className="ulbl" style={{marginBottom:8}}>Senha de confirmação</div>
            <input ref={pinRef} className="ui" type="password" inputMode="numeric" maxLength={4}
              value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))}
              onKeyDown={e=>e.key==="Enter"&&ok&&onConfirm(motivo)}
              placeholder="••••"
              style={{textAlign:"center",fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,letterSpacing:12,maxWidth:160}}/>
            {pin.length===4&&pin!=="4510"&&<div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--err)",marginTop:6,display:"flex",alignItems:"center",gap:6}}><IWarning s={12}/> Senha incorreta.</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="ub ub-err ub-full" onClick={()=>onConfirm(motivo)} disabled={renovando||!ok}>
              {renovando?<><Spin/> Zerando...</>:<><IRefresh s={14}/> Renovar tudo</>}
            </button>
            <button className="ub ub-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function Uniformes() {
  const [tab, setTab]           = useState("produtos");
  const [produtos, setProd]     = useState([]);
  const [variacoes, setVar]     = useState([]);
  const [usuarios, setUsers]    = useState([]);
  const [itens, setItens]       = useState([]);
  const [setoresCfg, setSetCfg] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showRenovar, setShowRenovar] = useState(false);
  const [renovando, setRenovando]     = useState(false);
  const { add: addToast, toasts } = useToast();

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
    } catch(e){ addToast("Erro ao carregar.","error"); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[]);

  const renovarTudo = async (motivo) => {
    setRenovando(true);
    try {
      for(const col of Object.values(COL)){
        const snap=await getDocs(collection(db,col));
        const batch=writeBatch(db); snap.docs.forEach(d=>batch.delete(d.ref));
        if(snap.docs.length>0) await batch.commit();
      }
      // Log antes de limpar (já foi limpo, então criamos novo)
      await addDoc(collection(db,COL.log),{acao:"renovacao",desc:`Sistema renovado — ${motivo}`,ts:serverTimestamp()});
      addToast("Banco de uniformes zerado!","success");
      setShowRenovar(false); load();
    } catch(e){ addToast("Erro: "+e.message,"error"); }
    finally{ setRenovando(false); }
  };

  const totalEst   = variacoes.reduce((s,v)=>s+(v.quantidade||0),0);
  const totalAtrib = itens.reduce((s,i)=>s+(i.qtd||1),0);

  const TABS = [{id:"produtos",l:"Produtos",I:IBox},{id:"usuarios",l:"Usuários",I:IUsers},{id:"analytics",l:"Analytics",I:IChart},{id:"log",l:"Log",I:ILog},{id:"renovar",l:"Renovar",I:IRenew}];

  return (
    <div className="ur">
      <style>{CSS}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <IShirt s={26} c="var(--acc)"/>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,letterSpacing:2}}>UNIFORMES</span>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {[{l:"Estoque",v:totalEst,c:"var(--ok)"},{l:"Atribuídos",v:totalAtrib,c:"var(--info)"},{l:"Usuários",v:usuarios.length,c:"var(--acc)"}].map(s=>(
            <div key={s.l} className="ustat">
              <span className="ustat-n" style={{color:s.c}}>{s.v}</span>
              <span className="ustat-l">{s.l}</span>
            </div>
          ))}

        </div>
      </div>

      {/* Conteúdo */}
      <div className="ur-content">
        {loading
          ? <div className="uempty"><Spin/></div>
          : (
            <div className="ufd">
              {tab==="produtos"  &&<TabProdutos produtos={produtos} variacoes={variacoes} itens={itens} usuarios={usuarios} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast}/>}
              {tab==="usuarios"  &&<TabUsuarios usuarios={usuarios} itens={itens} variacoes={variacoes} produtos={produtos} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast}/>}
              {tab==="analytics" &&<TabAnalytics produtos={produtos} variacoes={variacoes} itens={itens}/>}
              {tab==="log"       &&<TabLog/>}
              {tab==="renovar"   &&<div className="uempty" style={{paddingTop:80}}><IRenew s={40}/><div style={{marginTop:16,fontSize:14}}>Clique no botão abaixo para renovar o banco de uniformes.</div><button className="ub ub-err" style={{marginTop:20}} onClick={()=>setShowRenovar(true)}><IRenew s={15}/> Abrir renovação</button></div>}
            </div>
          )}
      </div>

      {/* Bottom nav */}
      <nav className="ur-nav">
        {TABS.map(t=>(
          <button key={t.id}
            className={`ur-nav-btn${tab===t.id?" on":""}`}
            onClick={()=>{ if(t.id==="renovar"){ setShowRenovar(true); } else { setTab(t.id); } }}>
            <t.I s={22}/>
            <span className="ur-nav-label">{t.l}</span>
            <span className="ur-nav-dot"/>
          </button>
        ))}
      </nav>

      {showRenovar&&<ModalRenovar onClose={()=>setShowRenovar(false)} onConfirm={renovarTudo} renovando={renovando}/>}
      <Toast toasts={toasts}/>
    </div>
  );
}

export default Uniformes;