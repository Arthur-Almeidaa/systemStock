import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, deleteDoc, setDoc, query, where, updateDoc, increment,
  orderBy, limit, serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBH3hxzhFe1IWyIO58wE2kcnL1lpxBy8ZM",
  authDomain: "sytemstock.firebaseapp.com",
  projectId: "sytemstock",
  storageBucket: "sytemstock.firebasestorage.app",
  messagingSenderId: "643733507908",
  appId: "1:643733507908:web:1d3bce112d337534799111",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

// ============================================================
// SVG ICONS — sem emojis, estilo profissional
// ============================================================
const Icon = ({ name, size = 18, color = "currentColor", style = {} }) => {
  const icons = {
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></>,
    utensils: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></>,
    sparkles: <><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></>,
    broom: <><path d="M9 3a1 1 0 0 0-1 1v3H4a1 1 0 0 0-.71 1.71l8 8a1 1 0 0 0 1.42 0l8-8A1 1 0 0 0 20 7h-4V4a1 1 0 0 0-1-1H9z"/><path d="M8 21h8"/></>,
    wrench: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
    tools: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/><path d="M2 14.5C2 16.43 3.57 18 5.5 18S9 16.43 9 14.5 7.43 11 5.5 11" /></>,
    hammer: <><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    package: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    barChart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
    maintenance: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    chevronRight: <><polyline points="9 18 15 12 9 6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display:"inline-block", flexShrink:0, ...style }}>
      {icons[name] || null}
    </svg>
  );
};

// ============================================================
// SETORES
// ============================================================
const SETORES = {
  ti:           { label:"TI",              iconName:"monitor",     color:"#3b82f6", col:"estoque_ti"           },
  exfood:       { label:"X-food",          iconName:"utensils",    color:"#f5a623", col:"estoque_exfood"       },
  limpeza:      { label:"Limpeza",         iconName:"sparkles",    color:"#52c41a", col:"estoque_limpeza"      },
  ferramentas:  { label:"Ferramentas",     iconName:"tools",       color:"#a855f7", col:"estoque_ferramentas"  },
};

// Sub-setores de Ferramentas com coleções próprias
const FERRAMENTAS_SUB = {
  fti:          { label:"T.I",             iconName:"cpu",         color:"#38bdf8", col:"estoque_ferramentas_ti"          },
  fmanutencao:  { label:"Manutenção",      iconName:"hammer",      color:"#fb923c", col:"estoque_ferramentas_manutencao"  },
};

const IS_FERR_SUB = (k) => k === "fti" || k === "fmanutencao";

// Resolve o setor real (pode ser sub-setor de ferramentas)
const resolveSetor = (setor) => {
  if (IS_FERR_SUB(setor)) return FERRAMENTAS_SUB[setor];
  return SETORES[setor];
};

const getCol = (setor, type) => `${resolveSetor(setor).col}_${type}`;

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR");
};

const DEFAULT_THRESH = { baixo: 5, medio: 15 };

function getStatus(qtd, thresh) {
  const t = thresh || DEFAULT_THRESH;
  if (qtd <= 0)         return "zero";
  if (qtd <= t.baixo)   return "baixo";
  if (qtd <= t.medio)   return "medio";
  return "alto";
}

async function registrarLog(setor, tipo, dados) {
  await addDoc(collection(db, getCol(setor, "log")), { tipo, ...dados, ts: serverTimestamp() });
}

async function gerarCodigoSemBarras(setor) {
  const configRef = doc(db, getCol(setor, "config"), "contador_sem_barras");
  const snap = await getDocs(collection(db, getCol(setor, "config")));
  const contDoc = snap.docs.find(d => d.id === "contador_sem_barras");
  const atual = contDoc ? (contDoc.data().proximo || 1) : 1;
  const codigo = String(atual).padStart(2, "0");
  await setDoc(configRef, { proximo: atual + 1, updatedAt: new Date().toISOString() });
  return codigo;
}

// ============================================================
// ESTILOS
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

  :root {
    --bg:#0a0a0a; --surface:#141414; --surface2:#1c1c1c;
    --border:#2a2a2a; --border2:#333;
    --accent:#f5a623; --accent2:#e85d04;
    --success:#4ade80; --danger:#f87171; --info:#60a5fa; --warn:#facc15;
    --text:#f0f0f0; --text-dim:#777; --text-mid:#aaa;
    --mono:'IBM Plex Mono',monospace;
    --sans:'IBM Plex Sans',sans-serif;
    --display:'Bebas Neue',sans-serif;
    --r:4px;
    --header-h:56px;
    --bottom-h:76px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: var(--bg); color: var(--text); font-family: var(--sans); }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: var(--bg); } ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .app { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }

  /* HEADER */
  .header { background: var(--surface); border-bottom: 1px solid var(--border); height: var(--header-h); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; position: sticky; top: 0; z-index: 200; flex-shrink: 0; }
  .header-logo { font-family: var(--display); font-size: 22px; letter-spacing: 3px; color: var(--accent); display: flex; align-items: center; gap: 8px; }
  .setor-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; padding: 2px 8px; border: 1px solid; }
  .header-right { display: flex; align-items: center; gap: 6px; }
  .hbtn { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 6px 10px; font-family: var(--mono); font-size: 11px; cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: 1px; border-radius: var(--r); white-space: nowrap; -webkit-tap-highlight-color: transparent; display:inline-flex; align-items:center; gap:5px; }
  .hbtn:hover, .hbtn:active { border-color: var(--accent); color: var(--accent); }
  .hbtn.danger:hover, .hbtn.danger:active { border-color: var(--danger); color: var(--danger); }
  .header-email { font-family: var(--mono); font-size: 11px; color: var(--text-dim); }

  /* LAYOUT */
  .main-layout { display: flex; flex: 1; overflow: hidden; }

  /* SIDEBAR */
  .sidebar { width: 200px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto; }
  .sidebar-setor { padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .sidebar-setor-label { font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .sidebar-setor-name { font-family: var(--display); font-size: 20px; letter-spacing: 2px; display:flex; align-items:center; gap:7px; }
  .sidebar-nav { padding: 6px 0; flex: 1; }
  .sidebar-group { padding: 12px 16px 3px; font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; }
  .sitem { display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-family: var(--mono); font-size: 12px; color: var(--text-dim); cursor: pointer; transition: all .15s; border-left: 2px solid transparent; }
  .sitem:hover { background: var(--surface2); color: var(--text); }
  .sitem.active { border-left-color: var(--accent); color: var(--accent); background: rgba(245,166,35,.06); }
  .sitem-icon { width: 20px; text-align: center; display:flex; align-items:center; justify-content:center; }

  /* CONTENT */
  .content { flex: 1; overflow-y: auto; padding: 24px 20px; -webkit-overflow-scrolling: touch; }

  /* BOTTOM NAV */
  .bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--bottom-h);
    background: var(--surface);
    border-top: 2px solid var(--border2);
    z-index: 300;
  }
  .bottom-nav-inner {
    display: flex;
    align-items: stretch;
    height: calc(var(--bottom-h) - env(safe-area-inset-bottom, 0px));
    padding: 0 6px;
    gap: 2px;
  }
  .bnav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 10px 4px 8px;
    cursor: pointer;
    color: var(--text-dim);
    position: relative;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: color .15s;
    border-radius: 6px;
    margin: 4px 0;
  }
  .bnav-item:active { background: var(--surface2); }
  .bnav-item.active { color: var(--accent); }
  .bnav-item.active::before {
    content: '';
    position: absolute;
    top: 0; left: 15%; right: 15%;
    height: 2px;
    background: var(--accent);
    border-radius: 0 0 3px 3px;
  }
  .bnav-icon { display:flex; align-items:center; justify-content:center; }
  .bnav-label { font-family: var(--mono); font-size: 9px; letter-spacing: .5px; text-transform: uppercase; font-weight: 600; }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .bottom-nav { display: block; }
    .header-email { display: none; }
    .content {
      padding: 14px;
      padding-bottom: calc(var(--bottom-h) + 20px + env(safe-area-inset-bottom, 0px));
    }
  }

  /* LOGIN */
  .login-screen { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg); background-image: radial-gradient(circle at 20% 50%, rgba(245,166,35,.04) 0%, transparent 50%); }
  .login-card { background: var(--surface); border: 1px solid var(--border2); padding: 40px 32px; width: 100%; max-width: 400px; }
  .login-card::after { content: ''; display: block; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent2)); margin-top: 40px; margin-left: -32px; width: calc(100% + 64px); }
  .login-title { font-family: var(--display); font-size: 48px; letter-spacing: 5px; line-height: 1; margin-bottom: 2px; }
  .login-title span { color: var(--accent); }
  .login-sub { font-family: var(--mono); font-size: 10px; color: var(--text-dim); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 36px; }

  /* SETOR SCREEN */
  .setor-screen { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; gap: 32px; }
  .setor-heading { text-align: center; }
  .setor-heading h2 { font-family: var(--display); font-size: 36px; letter-spacing: 4px; margin-bottom: 6px; }
  .setor-heading p { font-family: var(--mono); font-size: 11px; color: var(--text-dim); }
  .setor-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; width: 100%; max-width: 900px; }
  .setor-card { background: var(--surface); border: 1px solid var(--border); padding: 32px 12px; cursor: pointer; transition: all .25s; display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent; }
  .setor-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; opacity: 0; transition: opacity .25s; background: var(--c); }
  .setor-card:hover, .setor-card:active { transform: translateY(-4px); border-color: var(--c); }
  .setor-card:hover::after, .setor-card:active::after { opacity: 1; }
  .setor-card-icon { display:flex; align-items:center; justify-content:center; }
  .setor-card-name { font-family: var(--display); font-size: 22px; letter-spacing: 2px; color: var(--c); }
  .setor-card-sub { font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 1px; }
  @media (max-width: 700px) {
    .setor-cards { grid-template-columns: repeat(2, 1fr); max-width: 440px; }
  }
  @media (max-width: 400px) {
    .setor-cards { grid-template-columns: 1fr; max-width: 320px; }
    .setor-card { flex-direction: row; padding: 18px; gap: 14px; align-items: center; }
  }

  /* FERRAMENTAS SUB SCREEN */
  .ferr-sub-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 500px; }
  @media (max-width: 400px) { .ferr-sub-cards { grid-template-columns: 1fr; } }

  /* FORMS */
  .form-group { margin-bottom: 14px; }
  .form-label { display: block; font-family: var(--mono); font-size: 10px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 7px; }
  .form-input, .form-select { width: 100%; background: var(--surface2); border: 1px solid var(--border2); color: var(--text); padding: 13px 14px; font-family: var(--mono); font-size: 14px; outline: none; transition: border-color .2s; border-radius: var(--r); -webkit-appearance: none; appearance: none; }
  .form-input:focus, .form-select:focus { border-color: var(--accent); }
  .form-input:disabled, .form-select:disabled { opacity: .4; }
  .form-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 500px) { .form-row { grid-template-columns: 1fr; } }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; font-family: var(--mono); font-size: 12px; cursor: pointer; transition: all .2s; border-radius: var(--r); letter-spacing: .5px; border: 1px solid transparent; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .btn-accent { background: var(--accent); color: #0a0a0a; border-color: var(--accent); font-weight: 600; }
  .btn-accent:hover:not(:disabled), .btn-accent:active:not(:disabled) { background: var(--accent2); border-color: var(--accent2); }
  .btn-outline { background: transparent; color: var(--text-dim); border-color: var(--border2); }
  .btn-outline:hover:not(:disabled), .btn-outline:active:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: transparent; color: var(--danger); border-color: var(--danger); }
  .btn-danger:hover:not(:disabled), .btn-danger:active:not(:disabled) { background: var(--danger); color: white; }
  .btn-success { background: var(--success); color: #0a0a0a; border-color: var(--success); font-weight: 600; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-lg { padding: 14px 28px; font-size: 13px; }
  .btn-full { width: 100%; }
  .btn-icon-sm { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 9px 10px; cursor: pointer; font-size: 14px; transition: all .15s; border-radius: var(--r); touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-width: 38px; min-height: 38px; display: inline-flex; align-items: center; justify-content: center; }
  .btn-icon-sm:hover, .btn-icon-sm:active { border-color: var(--danger); color: var(--danger); }
  .btn-icon-sm.edit-btn:hover, .btn-icon-sm.edit-btn:active { border-color: var(--info); color: var(--info); }
  .btn-icon-sm:disabled { opacity: .4; cursor: not-allowed; }
  .btn-scan { display:flex; align-items:center; justify-content:center; gap:9px; width:100%; padding:14px; background:var(--surface2); border:1px solid var(--border2); color:var(--text); font-family:var(--mono); font-size:12px; cursor:pointer; border-radius:var(--r); transition:border-color .2s, color .2s; letter-spacing:.5px; -webkit-tap-highlight-color:transparent; }
  .btn-scan:hover, .btn-scan:active { border-color:var(--accent); color:var(--accent); }

  /* PAGE */
  .page-hd { margin-bottom: 18px; }
  .page-title { font-family: var(--display); font-size: 30px; letter-spacing: 4px; line-height: 1; }
  .page-sub { font-family: var(--mono); font-size: 11px; color: var(--text-dim); margin-top: 3px; }

  /* STATS */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
  @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  .stat-card { background: var(--surface); border: 1px solid var(--border); padding: 16px; position: relative; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--c, var(--accent)); }
  .stat-label { font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .stat-value { font-family: var(--display); font-size: 38px; line-height: 1; }
  .stat-sub { font-family: var(--mono); font-size: 9px; color: var(--text-dim); margin-top: 4px; }

  /* FILTRO TABS */
  .filter-tabs { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
  .ftab { background: transparent; border: 1px solid var(--border2); color: var(--text-dim); padding: 6px 12px; font-family: var(--mono); font-size: 10px; cursor: pointer; border-radius: var(--r); transition: all .15s; -webkit-tap-highlight-color: transparent; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 5px; }
  .ftab:active, .ftab:hover { border-color: var(--accent); color: var(--accent); }
  .ftab.active { background: var(--accent); color: #0a0a0a; border-color: var(--accent); font-weight: 600; }
  .ftab-dot { width: 7px; height: 7px; border-radius: 50%; }

  /* TABLE CARD */
  .table-card { background: var(--surface); border: 1px solid var(--border); overflow: hidden; margin-bottom: 16px; }
  .table-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); gap: 10px; flex-wrap: wrap; }
  .table-card-title { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-mid); }

  /* PRODUCT CARD LIST */
  .product-list { display: flex; flex-direction: column; }
  .product-card { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--border); transition: background .1s; }
  .product-card:last-child { border-bottom: none; }
  .product-card:active { background: var(--surface2); }
  .product-card-info { flex: 1; min-width: 0; }
  .product-card-name { font-family: var(--sans); font-size: 14px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .product-card-cat { font-family: var(--mono); font-size: 10px; color: var(--text-dim); }
  .product-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
  .product-qty { font-family: var(--display); font-size: 28px; line-height: 1; }

  /* STATUS BAR */
  .status-bar { display: flex; align-items: center; gap: 6px; }
  .status-bar-track { width: 48px; height: 4px; background: var(--border2); border-radius: 2px; overflow: hidden; }
  .status-bar-fill { height: 100%; border-radius: 2px; transition: width .3s; }

  /* BADGE */
  .badge { display: inline-block; padding: 2px 8px; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; font-family: var(--mono); border-radius: var(--r); }
  .badge-ok   { color: var(--success); border-color: var(--success); background: rgba(74,222,128,.06); }
  .badge-med  { color: var(--warn);    border-color: var(--warn);    background: rgba(250,204,21,.06); }
  .badge-low  { color: var(--accent);  border-color: var(--accent);  background: rgba(245,166,35,.06); }
  .badge-zero { color: var(--danger);  border-color: var(--danger);  background: rgba(248,113,113,.06); }
  .badge-in   { color: var(--success); border-color: var(--success); background: rgba(74,222,128,.06); }
  .badge-out  { color: var(--danger);  border-color: var(--danger);  background: rgba(248,113,113,.06); }

  /* CARD */
  .card { background: var(--surface); border: 1px solid var(--border); padding: 18px; margin-bottom: 14px; border-radius: var(--r); }
  .card-title { font-family: var(--display); font-size: 18px; letter-spacing: 2px; color: var(--accent); margin-bottom: 16px; }
  .err-msg { background: rgba(248,113,113,.08); border: 1px solid var(--danger); color: var(--danger); padding: 10px 14px; font-family: var(--mono); font-size: 12px; margin-top: 12px; border-radius: var(--r); }
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* ENTRADA PREVIEW */
  .entrada-preview { background: var(--surface2); border: 1px solid var(--accent); border-radius: var(--r); padding: 16px; margin: 14px 0; }
  .entrada-preview-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .entrada-preview-name { font-family: var(--display); font-size: 22px; letter-spacing: 2px; color: var(--accent); }
  .entrada-preview-code { font-family: var(--mono); font-size: 11px; color: var(--text-dim); margin-top: 3px; }
  .entrada-preview-qty { font-family: var(--display); font-size: 48px; line-height: 1; color: var(--success); }
  .entrada-preview-label { font-family: var(--mono); font-size: 9px; color: var(--text-dim); text-align: right; letter-spacing: 2px; text-transform: uppercase; }

  /* THRESHOLD SLIDER */
  .thresh-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .thresh-row:last-child { border-bottom: none; }
  .thresh-label { font-family: var(--mono); font-size: 11px; color: var(--text-dim); width: 70px; flex-shrink: 0; }
  .thresh-slider { flex: 1; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
  .thresh-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid var(--bg); }
  .thresh-val { font-family: var(--display); font-size: 22px; width: 36px; text-align: right; flex-shrink: 0; }

  /* SCANNER */
  .scanner-fs { position: fixed; inset: 0; z-index: 2000; background: #000; display: flex; flex-direction: column; }
  .scanner-video-bg { flex: 1; position: relative; overflow: hidden; }
  .scanner-video-bg video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--accent) 30%, var(--accent) 70%, transparent); box-shadow: 0 0 12px 3px rgba(245,166,35,.6); animation: sl 2.5s ease-in-out infinite; z-index: 10; }
  @keyframes sl { 0% { top:5%; } 50% { top:90%; } 100% { top:5%; } }
  .scan-vig { position: absolute; inset: 0; background: radial-gradient(ellipse 75% 55% at 50% 50%, transparent 35%, rgba(0,0,0,.55) 100%); pointer-events: none; z-index: 5; }
  .scan-corners { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
  .scan-c { position: absolute; width: 32px; height: 32px; border-color: var(--accent); border-style: solid; opacity: .9; }
  .scan-c.tl { top:16px; left:16px; border-width:2px 0 0 2px; }
  .scan-c.tr { top:16px; right:16px; border-width:2px 2px 0 0; }
  .scan-c.bl { bottom:145px; left:16px; border-width:0 0 2px 2px; }
  .scan-c.br { bottom:145px; right:16px; border-width:0 2px 2px 0; }
  .scan-confirm-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 20; background: rgba(0,0,0,.8); padding: 20px; }
  .scan-confirm-box { background: var(--surface); border: 2px solid var(--success); padding: 24px 20px; text-align: center; width: 100%; max-width: 340px; border-radius: var(--r); }
  .scan-confirm-code { font-family: var(--display); font-size: 30px; color: var(--success); letter-spacing: 3px; margin-bottom: 6px; word-break: break-all; }
  .scan-confirm-info { font-family: var(--mono); font-size: 11px; color: var(--text-dim); margin-bottom: 18px; }
  .scan-confirm-btns { display: flex; gap: 10px; }
  .scanner-bar { background: rgba(10,10,10,.98); border-top: 1px solid var(--border2); padding: 10px 14px; padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; }
  .scanner-bar-row1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .scanner-bar-title { font-family: var(--display); font-size: 16px; letter-spacing: 3px; color: var(--accent); }
  .scanner-status { font-family: var(--mono); font-size: 11px; color: var(--text-dim); }
  .scanner-status.ok { color: var(--success); } .scanner-status.err { color: var(--danger); }
  .scanner-manual { display: flex; gap: 8px; }
  .scanner-manual input { flex: 1; background: var(--surface2); border: 1px solid var(--border2); color: var(--text); padding: 11px 13px; font-family: var(--mono); font-size: 14px; outline: none; border-radius: var(--r); }
  .scanner-manual input:focus { border-color: var(--accent); }
  .scanner-manual button { background: var(--accent); color: #0a0a0a; border: none; padding: 11px 18px; font-family: var(--display); font-size: 16px; letter-spacing: 2px; cursor: pointer; border-radius: var(--r); }
  .cam-row { display: flex; align-items: center; gap: 8px; }
  .cam-row label { font-family: var(--mono); font-size: 10px; color: var(--text-dim); white-space: nowrap; }
  .cam-row select { flex: 1; background: var(--surface2); border: 1px solid var(--border2); color: var(--text); padding: 6px 10px; font-family: var(--mono); font-size: 11px; outline: none; cursor: pointer; max-width: 240px; border-radius: var(--r); }
  .cdots { display: flex; gap: 5px; padding: 4px 8px; background: var(--surface2); border: 1px solid var(--border); }
  .cdot { width: 7px; height: 7px; border-radius: 50%; background: var(--border2); transition: background .2s; }
  .cdot.on { background: var(--accent); } .cdot.done { background: var(--success); }

  /* FOUND CARD */
  .found-card { background: var(--surface2); border: 1px solid var(--border2); padding: 16px; margin: 14px 0; border-radius: var(--r); }
  .found-card.match { border-color: var(--accent); }
  .found-name { font-family: var(--display); font-size: 24px; letter-spacing: 2px; margin-bottom: 4px; }
  .found-info { font-family: var(--mono); font-size: 11px; color: var(--text-dim); }

  /* LOG */
  .log-entry { display: grid; grid-template-columns: 12px 1fr auto; gap: 10px; align-items: start; padding: 10px 16px; border-bottom: 1px solid var(--border); }
  .log-entry:last-child { border-bottom: none; }
  .log-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
  .log-dot.in { background: var(--success); } .log-dot.out { background: var(--danger); } .log-dot.config { background: var(--info); }
  .log-action { font-family: var(--mono); font-size: 12px; color: var(--text); }
  .log-detail { font-family: var(--mono); font-size: 10px; color: var(--text-dim); margin-top: 2px; }
  .log-time { font-family: var(--mono); font-size: 10px; color: var(--text-dim); white-space: nowrap; }

  /* TOAST */
  .toast-wrap { position: fixed; bottom: calc(var(--bottom-h) + 10px); right: 12px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; max-width: calc(100vw - 24px); }
  @media (min-width: 769px) { .toast-wrap { bottom: 20px; right: 20px; } }
  .toast { padding: 11px 16px; font-family: var(--mono); font-size: 12px; border-left: 3px solid; min-width: 220px; animation: tin .3s ease; border-radius: 0 var(--r) var(--r) 0; display:flex; align-items:center; gap:8px; }
  .toast-success { background: rgba(20,30,20,.97); border-color: var(--success); color: var(--success); }
  .toast-error   { background: rgba(30,15,15,.97);  border-color: var(--danger);  color: var(--danger); }
  .toast-info    { background: rgba(20,20,30,.97);  border-color: var(--info);    color: var(--info); }
  @keyframes tin { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  .empty { text-align: center; padding: 40px 20px; font-family: var(--mono); font-size: 12px; color: var(--text-dim); }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ANALYTICS */
  .period-tabs { display: flex; gap: 4px; background: var(--surface2); border: 1px solid var(--border2); padding: 4px; border-radius: var(--r); margin-bottom: 18px; width: fit-content; }
  .ptab { padding: 7px 16px; font-family: var(--mono); font-size: 11px; cursor: pointer; border-radius: 2px; color: var(--text-dim); transition: all .15s; letter-spacing: 1px; text-transform: uppercase; border: none; background: transparent; }
  .ptab.active { background: var(--accent); color: #0a0a0a; font-weight: 600; }
  .rank-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); }
  .rank-row:last-child { border-bottom: none; }
  .rank-num { font-family: var(--display); font-size: 22px; width: 32px; text-align: center; flex-shrink: 0; color: var(--text-dim); }
  .rank-num.gold { color: #fbbf24; }
  .rank-num.silver { color: #94a3b8; }
  .rank-num.bronze { color: #cd7c3a; }
  .rank-info { flex: 1; min-width: 0; }
  .rank-name { font-family: var(--sans); font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rank-cat { font-family: var(--mono); font-size: 10px; color: var(--text-dim); }
  .rank-bar-wrap { width: 80px; flex-shrink: 0; }
  .rank-bar-track { height: 5px; background: var(--border2); border-radius: 3px; overflow: hidden; margin-bottom: 3px; }
  .rank-bar-fill { height: 100%; border-radius: 3px; background: var(--accent); }
  .rank-val { font-family: var(--display); font-size: 20px; text-align: right; }
  .rank-sub { font-family: var(--mono); font-size: 9px; color: var(--text-dim); text-align: right; }

  /* Mini bar chart */
  .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 80px; padding: 0 4px; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .bar-fill { width: 100%; border-radius: 2px 2px 0 0; min-height: 2px; transition: height .3s; }
  .bar-label { font-family: var(--mono); font-size: 8px; color: var(--text-dim); white-space: nowrap; letter-spacing: .5px; }
  .bar-val { font-family: var(--display); font-size: 13px; color: var(--text-dim); }

  /* Alert badge */
  .alert-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .alert-row:last-child { border-bottom: none; }
  .alert-days { font-family: var(--display); font-size: 28px; flex-shrink: 0; width: 56px; text-align: center; }
  .alert-info { flex: 1; min-width: 0; }
  .alert-name { font-family: var(--sans); font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .alert-sub { font-family: var(--mono); font-size: 10px; color: var(--text-dim); }
  .alert-qty { font-family: var(--display); font-size: 22px; flex-shrink: 0; }

  /* Duplicate modal */
  .dup-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.85); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .dup-modal { background: var(--surface); border: 2px solid var(--warn); padding: 24px 20px; width: 100%; max-width: 380px; border-radius: var(--r); }
  .dup-modal-title { font-family: var(--display); font-size: 22px; letter-spacing: 3px; color: var(--warn); margin-bottom: 6px; }
  .dup-modal-code { font-family: var(--mono); font-size: 13px; color: var(--text-dim); margin-bottom: 16px; word-break: break-all; }
  .dup-modal-product { background: var(--surface2); border: 1px solid var(--border2); padding: 14px; border-radius: var(--r); margin-bottom: 18px; }
  .dup-modal-pname { font-family: var(--display); font-size: 20px; color: var(--accent); }
  .dup-modal-pcat { font-family: var(--mono); font-size: 11px; color: var(--text-dim); margin-top: 3px; }
  .dup-modal-btns { display: flex; flex-direction: column; gap: 8px; }

  /* Inline edit */
  .inline-edit-row { display:flex; align-items:center; gap:6px; }
  .inline-edit-row input { flex:1; background:var(--surface2); border:1px solid var(--accent); color:var(--text); padding:7px 10px; font-family:var(--mono); font-size:13px; outline:none; border-radius:var(--r); }
`;

// ============================================================
// SCANNER — câmera traseira sempre preferida
// ============================================================
const CONFIRMS = 3;
function ScannerModal({ onScan, onClose, title }) {
  const videoRef = useRef(null), streamRef = useRef(null), animRef = useRef(null);
  const detRef = useRef(null), scanRef = useRef(false), histRef = useRef([]), focTimer = useRef(null);
  const [cams, setCams] = useState([]), [selCam, setSelCam] = useState("");
  const [status, setStatus] = useState({ msg:"Iniciando...", t:"" });
  const [cnt, setCnt] = useState(0), [manual, setManual] = useState("");
  const [ready, setReady] = useState(false), [pendingConfirm, setPendingConfirm] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Pede acesso primeiro com preferência traseira
        const tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        tmp.getTracks().forEach(t => t.stop());
        const devs = await navigator.mediaDevices.enumerateDevices();
        const vids = devs.filter(d => d.kind === "videoinput");
        setCams(vids);
        // Prioridade: traseira (environment) → não frontal → primeira disponível
        const traseira = vids.find(d => /(back|rear|environment|trás|tras)/i.test(d.label));
        const naoFrontal = vids.find(d => !/(front|ir|infrared|frontal)/i.test(d.label));
        const pref = traseira || naoFrontal || vids[vids.length - 1] || vids[0];
        if (pref) setSelCam(pref.deviceId);
      } catch { setStatus({ msg: "Permissão negada. Use o campo manual.", t: "err" }); }
    })();
  }, []);

  useEffect(() => { if (selCam) { startCam(selCam); return () => stopAll(); } }, [selCam]);

  const stopAll = () => {
    scanRef.current = false;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (focTimer.current) { clearInterval(focTimer.current); focTimer.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (window.Quagga) { try { window.Quagga.stop(); } catch {} }
  };

  const onRaw = useCallback((code) => {
    const h = histRef.current;
    h.push(code); if (h.length > CONFIRMS) h.shift();
    const ok = h.length === CONFIRMS && h.every(c => c === h[0]);
    if (ok) {
      scanRef.current = false;
      if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
      setCnt(CONFIRMS); setStatus({ msg: "Código lido", t: "ok" }); setPendingConfirm({ code });
    } else {
      const s = h.filter(c => c === code).length;
      setCnt(s); setStatus({ msg: `Confirmando... (${s}/${CONFIRMS})`, t: "" });
    }
  }, []);

  const startCam = async (did) => {
    stopAll(); setReady(false); histRef.current = []; setCnt(0); setPendingConfirm(null);
    setStatus({ msg: "Abrindo câmera...", t: "" });
    try {
      // Solicita câmera traseira explicitamente
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: did },
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30 }
        }
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setReady(true);
      setStatus({ msg: "Aponte o código de barras", t: "" });
      focTimer.current = setInterval(async () => {
        try { if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }); } catch {}
      }, 3000);
      startDet(did);
    } catch (err) { setStatus({ msg: "Erro: " + err.message, t: "err" }); }
  };

  const startDet = useCallback(async (did) => {
    if ("BarcodeDetector" in window) {
      const sup = await window.BarcodeDetector.getSupportedFormats();
      detRef.current = new window.BarcodeDetector({ formats: sup });
      scanRef.current = true;
      const loop = async () => {
        if (!scanRef.current || !videoRef.current || !detRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try { const r = await detRef.current.detect(videoRef.current); if (r.length > 0) onRaw(r[0].rawValue); } catch {}
        }
        animRef.current = requestAnimationFrame(loop);
      };
      loop(); return;
    }
    if (!window.Quagga) {
      await new Promise((res, rej) => {
        if (document.querySelector('script[src*="quagga"]')) { res(); return; }
        const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    scanRef.current = true;
    window.Quagga.init({ inputStream: { name: "Live", type: "LiveStream", target: videoRef.current, constraints: { deviceId: { exact: did }, facingMode: "environment", width: 1280, height: 720 } }, decoder: { readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"] }, locate: true },
      err => { if (err) { setStatus({ msg: "Erro: " + err.message, t: "err" }); return; } window.Quagga.start(); window.Quagga.onDetected(r => { if (scanRef.current) onRaw(r.codeResult.code); }); });
  }, [onRaw]);

  const handleConfirm = () => { if (!pendingConfirm) return; const code = pendingConfirm.code; setPendingConfirm(null); stopAll(); onScan(code); };
  const handleReject = () => {
    setPendingConfirm(null); histRef.current = []; setCnt(0);
    setStatus({ msg: "Aponte o código de barras", t: "" });
    scanRef.current = true;
    if (detRef.current) {
      const loop = async () => {
        if (!scanRef.current || !videoRef.current || !detRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try { const r = await detRef.current.detect(videoRef.current); if (r.length > 0) onRaw(r[0].rawValue); } catch {}
        }
        animRef.current = requestAnimationFrame(loop);
      };
      loop();
    }
  };
  const handleManual = () => { if (!manual.trim()) return; stopAll(); onScan(manual.trim()); };
  const dots = Array.from({ length: CONFIRMS }, (_, i) => ({ on: i < cnt, done: cnt >= CONFIRMS }));

  return (
    <div className="scanner-fs">
      <div className="scanner-video-bg">
        <video ref={videoRef} muted playsInline autoPlay />
        <div className="scan-vig" />
        {ready && !pendingConfirm && (<><div className="scan-line" /><div className="scan-corners"><div className="scan-c tl" /><div className="scan-c tr" /><div className="scan-c bl" /><div className="scan-c br" /></div></>)}
        {!ready && status.t !== "err" && (<div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14 }}><div className="spinner" style={{ width:36,height:36,borderWidth:3 }} /><span style={{ fontFamily:"var(--mono)",fontSize:13,color:"var(--text-dim)" }}>Iniciando câmera...</span></div>)}
        {pendingConfirm && (
          <div className="scan-confirm-overlay">
            <div className="scan-confirm-box">
              <div style={{ fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,marginBottom:8 }}>CÓDIGO LIDO</div>
              <div className="scan-confirm-code">{pendingConfirm.code}</div>
              <div className="scan-confirm-info">Confirme se o código está correto</div>
              <div className="scan-confirm-btns">
                <button className="btn btn-success btn-lg" onClick={handleConfirm} style={{ flex:1 }}><Icon name="check" size={16} /> CONFIRMAR</button>
                <button className="btn btn-danger" onClick={handleReject} style={{ flex:1 }}><Icon name="x" size={16} /> LER DE NOVO</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="scanner-bar">
        <div className="scanner-bar-row1">
          <div className="scanner-bar-title">{title || "ESCANEAR"}</div>
          {cams.length > 1 && (<div className="cam-row" style={{ flex:1,marginLeft:8 }}><label>CAM:</label><select value={selCam} onChange={e => setSelCam(e.target.value)}>{cams.map((c,i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i+1}`}</option>)}</select></div>)}
          {!pendingConfirm && <div className="cdots">{dots.map((d,i) => <div key={i} className={`cdot ${d.done?"done":d.on?"on":""}`} />)}</div>}
          <button className="btn btn-danger" style={{ padding:"7px 12px",fontSize:11,display:"flex",alignItems:"center",gap:5 }} onClick={() => { stopAll(); onClose(); }}><Icon name="x" size={14} /></button>
        </div>
        <div className={`scanner-status ${status.t}`}>{!ready && status.t !== "err" && <span className="spinner" style={{ marginRight:8 }} />}{pendingConfirm ? "Confirme ou leia novamente" : status.msg}</div>
        <div className="scanner-manual">
          <input type="text" inputMode="numeric" placeholder="Digitar código..." value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === "Enter" && handleManual()} />
          <button onClick={handleManual}>OK</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === "success" ? <Icon name="check" size={14} /> : t.type === "error" ? <Icon name="x" size={14} /> : <Icon name="barChart" size={14} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function statusColor(st) {
  if (st === "zero")  return "var(--danger)";
  if (st === "baixo") return "var(--accent)";
  if (st === "medio") return "var(--warn)";
  return "var(--success)";
}
function statusLabel(st) {
  if (st === "zero")  return <span className="badge badge-zero">ZERADO</span>;
  if (st === "baixo") return <span className="badge badge-low">BAIXO</span>;
  if (st === "medio") return <span className="badge badge-med">MÉDIO</span>;
  return <span className="badge badge-ok">OK</span>;
}
function StatusBar({ qtd, thresh }) {
  const t = thresh || DEFAULT_THRESH;
  const max = Math.max(t.medio * 2, qtd + 1);
  const pct = Math.min(100, (qtd / max) * 100);
  const st = getStatus(qtd, t);
  return (
    <div className="status-bar">
      <div className="status-bar-track">
        <div className="status-bar-fill" style={{ width:pct+"%", background:statusColor(st) }} />
      </div>
    </div>
  );
}

// ============================================================
// SEARCH BOX — com histórico salvo por contexto (localStorage)
// ============================================================
const SEARCH_HISTORY_KEY = (ctx) => `park_search_hist_${ctx}`;
const MAX_HIST = 8;

function saveToHistory(ctx, term) {
  if (!term || term.trim().length < 2) return;
  try {
    const key = SEARCH_HISTORY_KEY(ctx);
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [term.trim(), ...prev.filter(h => h.toLowerCase() !== term.trim().toLowerCase())].slice(0, MAX_HIST);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

function loadHistory(ctx) {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY(ctx)) || "[]"); } catch { return []; }
}

function clearHistory(ctx) {
  try { localStorage.removeItem(SEARCH_HISTORY_KEY(ctx)); } catch {}
}

/**
 * SearchBox
 * @param {string}   ctx        – chave única para salvar histórico (ex: "log_ti")
 * @param {string}   value      – valor controlado externamente
 * @param {function} onChange   – callback(value)
 * @param {string}   placeholder
 * @param {string[]} suggestions – sugestões extras (nomes de produtos/categorias)
 * @param {object}   style
 */
function SearchBox({ ctx, value, onChange, placeholder = "Buscar...", suggestions = [], style = {} }) {
  const [open, setOpen]     = useState(false);
  const [hist, setHist]     = useState([]);
  const inputRef            = useRef(null);
  const wrapRef             = useRef(null);

  // Carrega histórico ao montar
  useEffect(() => { setHist(loadHistory(ctx)); }, [ctx]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtra sugestões e histórico baseado no que foi digitado
  const q = value.toLowerCase();
  const filteredHist = hist.filter(h => !q || h.toLowerCase().includes(q));
  const filteredSugg = suggestions.filter(s =>
    s && (!q || s.toLowerCase().includes(q)) && !filteredHist.some(h => h.toLowerCase() === s.toLowerCase())
  );
  const hasItems = filteredHist.length > 0 || filteredSugg.length > 0;

  const pick = (term) => {
    onChange(term);
    saveToHistory(ctx, term);
    setHist(loadHistory(ctx));
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleChange = (e) => { onChange(e.target.value); setOpen(true); };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); onChange(""); }
    if (e.key === "Enter" && value.trim()) {
      saveToHistory(ctx, value);
      setHist(loadHistory(ctx));
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleDelHist = (term, e) => {
    e.stopPropagation();
    const next = hist.filter(h => h !== term);
    try { localStorage.setItem(SEARCH_HISTORY_KEY(ctx), JSON.stringify(next)); } catch {}
    setHist(next);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    clearHistory(ctx);
    setHist([]);
  };

  return (
    <div ref={wrapRef} style={{ position:"relative", ...style }}>
      <div style={{ display:"flex", alignItems:"center", background:"var(--surface2)", border:`1px solid ${open ? "var(--accent)" : "var(--border2)"}`, borderRadius:"var(--r)", transition:"border-color .2s", overflow:"hidden" }}>
        <span style={{ padding:"0 10px", display:"flex", alignItems:"center", color:"var(--text-dim)", flexShrink:0 }}>
          <Icon name="search" size={14} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--text)", fontFamily:"var(--mono)", fontSize:13, padding:"10px 0", minWidth:0 }}
        />
        {value && (
          <button onClick={handleClear} style={{ padding:"0 10px", background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", display:"flex", alignItems:"center" }}>
            <Icon name="x" size={13} />
          </button>
        )}
      </div>

      {open && hasItems && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"var(--r)", zIndex:500, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,.5)" }}>
          {filteredHist.length > 0 && (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px 4px", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, textTransform:"uppercase" }}>Recentes</span>
                <button onClick={handleClearAll} style={{ background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", fontFamily:"var(--mono)", fontSize:9, letterSpacing:1, display:"flex", alignItems:"center", gap:4 }}>
                  <Icon name="trash" size={11} /> LIMPAR
                </button>
              </div>
              {filteredHist.map(h => (
                <div key={h} onClick={() => pick(h)} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", cursor:"pointer", borderBottom:"1px solid var(--border)", transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <Icon name="fileText" size={13} color="var(--text-dim)" style={{ flexShrink:0 }} />
                  <span style={{ flex:1, fontFamily:"var(--mono)", fontSize:12, color:"var(--text)" }}>{h}</span>
                  <button onClick={(e) => handleDelHist(h, e)} style={{ background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", padding:"2px", display:"flex", alignItems:"center" }}>
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </>
          )}
          {filteredSugg.length > 0 && (
            <>
              <div style={{ padding:"6px 12px 4px", borderBottom:"1px solid var(--border)", borderTop: filteredHist.length > 0 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, textTransform:"uppercase" }}>Sugestões</span>
              </div>
              {filteredSugg.slice(0, 6).map(s => (
                <div key={s} onClick={() => pick(s)} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", cursor:"pointer", borderBottom:"1px solid var(--border)", transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <Icon name="search" size={13} color="var(--accent)" style={{ flexShrink:0 }} />
                  <span style={{ flex:1, fontFamily:"var(--mono)", fontSize:12, color:"var(--text)" }}>{s}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false), [err, setErr] = useState("");
  const go = async (e) => {
    e.preventDefault(); setErr(""); setLoading(true);
    try { const r = await signInWithEmailAndPassword(auth, email, pw); onLogin(r.user); }
    catch (ex) { const m = { "auth/invalid-credential":"Email ou senha incorretos.", "auth/too-many-requests":"Muitas tentativas." }; setErr(m[ex.code] || "Erro: " + ex.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="login-screen"><div className="login-card">
      <div className="login-title">PARK<span>.</span></div>
      <div className="login-sub">Controle de Estoque</div>
      <form onSubmit={go}>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" required autoFocus /></div>
        <div className="form-group"><label className="form-label">Senha</label><input className="form-input" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required /></div>
        <button className="btn btn-accent btn-lg btn-full" type="submit" disabled={loading} style={{ marginTop:8 }}>{loading ? "ENTRANDO..." : "ENTRAR"}</button>
        {err && <div className="err-msg">{err}</div>}
      </form>
    </div></div>
  );
}

// ============================================================
// SETOR SCREEN
// ============================================================
function SetorScreen({ user, onSelect }) {
  return (
    <div className="setor-screen">
      <div className="setor-heading"><h2>SELECIONE O SETOR</h2><p>{user.email}</p></div>
      <div className="setor-cards">
        {Object.entries(SETORES).map(([key, s]) => (
          <div key={key} className="setor-card" style={{ "--c": s.color }} onClick={() => onSelect(key)}>
            <span className="setor-card-icon"><Icon name={s.iconName} size={38} color={s.color} /></span>
            <div><div className="setor-card-name">{s.label}</div><div className="setor-card-sub">Gestão de Estoque</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FERRAMENTAS SUB-SETOR SCREEN
// ============================================================
function FerramentasSubScreen({ user, onSelect, onBack }) {
  return (
    <div className="setor-screen">
      <div className="setor-heading">
        <h2>FERRAMENTAS</h2>
        <p>Selecione o sub-setor</p>
      </div>
      <div className="ferr-sub-cards">
        {Object.entries(FERRAMENTAS_SUB).map(([key, s]) => (
          <div key={key} className="setor-card" style={{ "--c": s.color }} onClick={() => onSelect(key)}>
            <span className="setor-card-icon"><Icon name={s.iconName} size={38} color={s.color} /></span>
            <div><div className="setor-card-name">{s.label}</div><div className="setor-card-sub">Ferramentas</div></div>
          </div>
        ))}
      </div>
      <button className="btn btn-outline" onClick={onBack} style={{ marginTop:8 }}>
        <Icon name="arrowLeft" size={15} /> Voltar aos Setores
      </button>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ setor, products, thresh }) {
  const s = resolveSetor(setor);
  const [filtro, setFiltro] = useState("todos");
  const [search, setSearch] = useState("");

  const withStatus = products.map(p => ({ ...p, _st: getStatus(p.quantidade || 0, thresh) }));
  const total      = products.length;
  const totalItens = products.reduce((a, p) => a + (p.quantidade || 0), 0);
  const zerados    = withStatus.filter(p => p._st === "zero").length;
  const baixos     = withStatus.filter(p => p._st === "baixo").length;

  const byFiltro   = filtro === "todos" ? withStatus : withStatus.filter(p => p._st === filtro);
  const filtered   = search.trim()
    ? byFiltro.filter(p =>
        (p.nome||"").toLowerCase().includes(search.toLowerCase()) ||
        (p.categoria||"").toLowerCase().includes(search.toLowerCase()))
    : byFiltro;

  const allNames = [...new Set(products.map(p => p.nome).filter(Boolean))];
  const allCats  = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  const suggestions = [...allNames, ...allCats];

  const filterBtns = [
    { id:"todos", label:"Todos",  dot:"#aaa",           count:total },
    { id:"alto",  label:"OK",     dot:"var(--success)", count:withStatus.filter(p=>p._st==="alto").length },
    { id:"medio", label:"Médio",  dot:"var(--warn)",    count:withStatus.filter(p=>p._st==="medio").length },
    { id:"baixo", label:"Baixo",  dot:"var(--accent)",  count:baixos },
    { id:"zero",  label:"Zerado", dot:"var(--danger)",  count:zerados },
  ];

  return (
    <div>
      <div className="page-hd"><div className="page-title">DASHBOARD</div><div className="page-sub">Setor {s.label}</div></div>
      <div className="stats-grid">
        <div className="stat-card" style={{ "--c":s.color }}><div className="stat-label">Produtos</div><div className="stat-value" style={{ color:s.color }}>{total}</div><div className="stat-sub">SKUs</div></div>
        <div className="stat-card" style={{ "--c":"var(--success)" }}><div className="stat-label">Em Estoque</div><div className="stat-value" style={{ color:"var(--success)" }}>{totalItens}</div><div className="stat-sub">unidades</div></div>
        <div className="stat-card" style={{ "--c":baixos>0?"var(--accent)":"var(--success)" }}><div className="stat-label">Baixo</div><div className="stat-value" style={{ color:baixos>0?"var(--accent)":"var(--success)" }}>{baixos}</div><div className="stat-sub">produtos</div></div>
        <div className="stat-card" style={{ "--c":zerados>0?"var(--danger)":"var(--success)" }}><div className="stat-label">Zerados</div><div className="stat-value" style={{ color:zerados>0?"var(--danger)":"var(--success)" }}>{zerados}</div><div className="stat-sub">produtos</div></div>
      </div>

      {/* Busca + filtro */}
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"flex-start" }}>
        <SearchBox
          ctx={`dash_${setor}`}
          value={search}
          onChange={setSearch}
          placeholder="Buscar produto ou categoria..."
          suggestions={suggestions}
          style={{ flex:1, minWidth:200 }}
        />
      </div>

      <div className="filter-tabs">
        {filterBtns.map(fb => (
          <button key={fb.id} className={`ftab ${filtro===fb.id?"active":""}`} onClick={() => setFiltro(fb.id)}>
            {filtro !== fb.id && <span className="ftab-dot" style={{ background:fb.dot }} />}
            {fb.label} {fb.count > 0 && <span style={{ opacity:.7 }}>({fb.count})</span>}
          </button>
        ))}
      </div>
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">{filtered.length} produto{filtered.length!==1?"s":""}</div>
          {search && <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)" }}>"{search}"</span>}
        </div>
        <div className="product-list">
          {filtered.length === 0
            ? <div className="empty">Nenhum produto encontrado.</div>
            : filtered.sort((a,b) => (a.quantidade||0)-(b.quantidade||0)).map(p => (
              <div key={p.id} className="product-card">
                <div className="product-card-info"><div className="product-card-name">{p.nome}</div><div className="product-card-cat">{p.categoria}</div></div>
                <div className="product-card-right">
                  <div className="product-qty" style={{ color:statusColor(p._st) }}>{p.quantidade||0}</div>
                  <StatusBar qtd={p.quantidade||0} thresh={thresh} />
                  {statusLabel(p._st)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONFIGURAÇÕES — com validação de duplicatas em tempo real
// ============================================================

// Card que aparece quando detecta duplicata, mostrando o item existente
function DupAlert({ tipo, existente, onScrollTo, onEdit, onDelete, onDismiss }) {
  return (
    <div style={{
      background:"rgba(250,204,21,.06)", border:"1px solid var(--warn)",
      borderRadius:"var(--r)", padding:"12px 14px", marginBottom:10,
      animation:"tin .25s ease"
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--warn)", letterSpacing:2, textTransform:"uppercase", marginBottom:3 }}>
            {tipo === "cat" ? "Categoria já existe" : "Produto já existe"}
          </div>
          <div style={{ fontFamily:"var(--display)", fontSize:18, letterSpacing:1, color:"var(--text)" }}>
            {existente.nome}
          </div>
          {tipo === "prod" && (
            <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginTop:2 }}>
              Categoria: {existente.categoria}
            </div>
          )}
        </div>
        <button onClick={onDismiss} style={{ background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", flexShrink:0, padding:2 }}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        <button className="btn btn-outline" style={{ fontSize:10, padding:"7px 10px" }} onClick={onScrollTo}>
          <Icon name="search" size={13} /> Ver existente
        </button>
        <button className="btn btn-outline" style={{ fontSize:10, padding:"7px 10px", color:"var(--info)", borderColor:"var(--info)" }} onClick={onEdit}>
          <Icon name="edit" size={13} /> Renomear existente
        </button>
        <button className="btn btn-outline" style={{ fontSize:10, padding:"7px 10px", color:"var(--danger)", borderColor:"var(--danger)" }} onClick={onDelete}>
          <Icon name="trash" size={13} /> Excluir existente
        </button>
      </div>
    </div>
  );
}

function Configuracoes({ setor, user, addToast, thresh, onThreshChange }) {
  const colCat    = getCol(setor, "categorias");
  const colPadrao = getCol(setor, "produtos_padrao");
  const colEst    = getCol(setor, "produtos");

  const [cats, setCats]     = useState([]);
  const [prods, setProds]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeCat, setNomeCat] = useState("");
  const [nomeProd, setNomeProd] = useState(""), [catProd, setCatProd] = useState("");
  const [localThresh, setLocalThresh] = useState(thresh || DEFAULT_THRESH);
  const [savingThresh, setSavingThresh] = useState(false);

  // Edição inline
  const [editCatId, setEditCatId]   = useState(null);
  const [editCatVal, setEditCatVal] = useState("");
  const [editProdId, setEditProdId]   = useState(null);
  const [editProdVal, setEditProdVal] = useState("");

  // Buscas internas
  const [searchCat, setSearchCat]   = useState("");
  const [searchProd, setSearchProd] = useState("");

  // Duplicatas detectadas em tempo real
  const [dupCat, setDupCat]   = useState(null); // categoria existente com mesmo nome
  const [dupProd, setDupProd] = useState(null); // produto existente com mesmo nome

  // Refs para rolar até o item existente
  const catItemRefs  = useRef({});
  const prodItemRefs = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]);
      setCats(sc.docs.map(d => ({ id:d.id, ...d.data() })));
      setProds(sp.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); setLocalThresh(thresh || DEFAULT_THRESH); }, [setor, thresh]);

  // Detecta duplicata de categoria em tempo real conforme digita
  useEffect(() => {
    const v = nomeCat.trim().toLowerCase();
    if (!v) { setDupCat(null); return; }
    const found = cats.find(c => c.nome.toLowerCase() === v);
    setDupCat(found || null);
  }, [nomeCat, cats]);

  // Detecta duplicata de produto em tempo real conforme digita
  useEffect(() => {
    const v = nomeProd.trim().toLowerCase();
    if (!v) { setDupProd(null); return; }
    const found = prods.find(p => p.nome.toLowerCase() === v);
    setDupProd(found || null);
  }, [nomeProd, prods]);

  // Também bloqueia na edição inline: verifica se novo nome já existe em outro item
  const checkEditCatDup = (val, selfId) => cats.find(c => c.id !== selfId && c.nome.toLowerCase() === val.trim().toLowerCase()) || null;
  const checkEditProdDup = (val, selfId) => prods.find(p => p.id !== selfId && p.nome.toLowerCase() === val.trim().toLowerCase()) || null;

  const addCat = async () => {
    if (!nomeCat.trim()) return;
    if (dupCat) { addToast(`"${dupCat.nome}" já existe. Altere o nome ou edite/exclua a existente.`, "error"); return; }
    const nomeNorm = nomeCat.trim();
    try {
      await addDoc(collection(db, colCat), { nome: nomeNorm, criadoEm: new Date().toISOString() });
      await registrarLog(setor, "config", { descricao:`Categoria criada: ${nomeNorm}`, usuario:user.email });
      addToast("Categoria criada!", "success");
      setNomeCat(""); setDupCat(null); load();
    } catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const delCat = async (c) => {
    if (!confirm(`Excluir "${c.nome}"?\nIsso NÃO remove os produtos desta categoria do estoque.`)) return;
    try { await deleteDoc(doc(db, colCat, c.id)); addToast("Removida.", "success"); load(); }
    catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const saveCat = async (c) => {
    const novo = editCatVal.trim();
    if (!novo || novo === c.nome) { setEditCatId(null); return; }
    // Bloqueia se novo nome já existe
    const dup = checkEditCatDup(novo, c.id);
    if (dup) { addToast(`"${dup.nome}" já existe. Escolha outro nome.`, "error"); return; }
    try {
      await updateDoc(doc(db, colCat, c.id), { nome: novo });
      const snapPad = await getDocs(query(collection(db, colPadrao), where("categoria", "==", c.nome)));
      await Promise.all(snapPad.docs.map(d => updateDoc(doc(db, colPadrao, d.id), { categoria: novo })));
      const snapEst = await getDocs(query(collection(db, colEst), where("categoria", "==", c.nome)));
      await Promise.all(snapEst.docs.map(d => updateDoc(doc(db, colEst, d.id), { categoria: novo })));
      await registrarLog(setor, "config", { descricao:`Categoria renomeada: "${c.nome}" → "${novo}"`, usuario:user.email });
      addToast(`Categoria renomeada para "${novo}"`, "success");
      setEditCatId(null); load();
    } catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const addProd = async () => {
    if (!nomeProd.trim() || !catProd) { addToast("Preencha nome e categoria.", "error"); return; }
    if (dupProd) { addToast(`"${dupProd.nome}" já existe na categoria "${dupProd.categoria}". Edite/exclua o existente ou mude o nome.`, "error"); return; }
    const nomeNorm = nomeProd.trim();
    try {
      await addDoc(collection(db, colPadrao), { nome: nomeNorm, categoria: catProd, criadoEm: new Date().toISOString() });
      await registrarLog(setor, "config", { descricao:`Produto criado: ${nomeNorm}`, usuario:user.email });
      addToast(`"${nomeNorm}" criado!`, "success");
      setNomeProd(""); setDupProd(null); load();
    } catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const delProd = async (p) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await deleteDoc(doc(db, colPadrao, p.id)); addToast("Removido.", "success"); load(); }
    catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const saveProd = async (p) => {
    const novo = editProdVal.trim();
    if (!novo || novo === p.nome) { setEditProdId(null); return; }
    const dup = checkEditProdDup(novo, p.id);
    if (dup) { addToast(`"${dup.nome}" já existe na categoria "${dup.categoria}". Escolha outro nome.`, "error"); return; }
    try {
      await updateDoc(doc(db, colPadrao, p.id), { nome: novo });
      const snapEst = await getDocs(query(collection(db, colEst), where("nome", "==", p.nome)));
      await Promise.all(snapEst.docs.map(d => updateDoc(doc(db, colEst, d.id), { nome: novo })));
      await registrarLog(setor, "config", { descricao:`Produto renomeado: "${p.nome}" → "${novo}"`, usuario:user.email });
      addToast(`Produto renomeado para "${novo}"`, "success");
      setEditProdId(null); load();
    } catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const saveThresh = async () => {
    if (localThresh.baixo >= localThresh.medio) { addToast("'Baixo' deve ser menor que 'Médio'.", "error"); return; }
    setSavingThresh(true);
    try {
      await setDoc(doc(db, getCol(setor, "config"), "thresholds"), { ...localThresh, updatedAt: new Date().toISOString() });
      onThreshChange(localThresh);
      await registrarLog(setor, "config", { descricao:`Thresholds: baixo≤${localThresh.baixo}, médio≤${localThresh.medio}`, usuario:user.email });
      addToast("Limites salvos!", "success");
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setSavingThresh(false); }
  };

  // Scroll até o item existente e destaca com borda
  const [highlightCat, setHighlightCat]   = useState(null);
  const [highlightProd, setHighlightProd] = useState(null);

  const scrollToCat = (c) => {
    setSearchCat(""); // limpa filtro para garantir que aparece
    setHighlightCat(c.id);
    setTimeout(() => {
      catItemRefs.current[c.id]?.scrollIntoView({ behavior:"smooth", block:"center" });
    }, 80);
    setTimeout(() => setHighlightCat(null), 2500);
  };

  const scrollToProd = (p) => {
    setSearchProd(""); // limpa filtro
    setHighlightProd(p.id);
    setTimeout(() => {
      prodItemRefs.current[p.id]?.scrollIntoView({ behavior:"smooth", block:"center" });
    }, 80);
    setTimeout(() => setHighlightProd(null), 2500);
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-hd"><div className="page-title">CONFIG</div><div className="page-sub">Configurações — {resolveSetor(setor).label}</div></div>

      {/* Threshold */}
      <div className="card">
        <div className="card-title">NÍVEIS DE ESTOQUE</div>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {[["ZERADO","0","var(--danger)"],["BAIXO",`1–${localThresh.baixo}`,"var(--accent)"],["MÉDIO",`${localThresh.baixo+1}–${localThresh.medio}`,"var(--warn)"],["OK",`${localThresh.medio+1}+`,"var(--success)"]].map(([lbl,val,cor]) => (
            <div key={lbl} style={{ flex:1,minWidth:80,background:"var(--surface2)",border:`1px solid ${cor}`,borderRadius:"var(--r)",padding:"10px 14px",textAlign:"center" }}>
              <div style={{ fontFamily:"var(--mono)",fontSize:9,color:cor,letterSpacing:2,marginBottom:4 }}>{lbl}</div>
              <div style={{ fontFamily:"var(--display)",fontSize:22,color:cor }}>{val}</div>
            </div>
          ))}
        </div>
        <div className="thresh-row">
          <div className="thresh-label" style={{ color:"var(--accent)" }}>BAIXO ≤</div>
          <input type="range" min={1} max={50} value={localThresh.baixo} onChange={e => setLocalThresh(p => ({ ...p, baixo:Math.min(Number(e.target.value),p.medio-1) }))} className="thresh-slider" style={{ background:`linear-gradient(to right, var(--accent) 0%, var(--accent) ${(localThresh.baixo/50)*100}%, var(--border2) ${(localThresh.baixo/50)*100}%, var(--border2) 100%)` }} />
          <div className="thresh-val" style={{ color:"var(--accent)" }}>{localThresh.baixo}</div>
        </div>
        <div className="thresh-row">
          <div className="thresh-label" style={{ color:"var(--warn)" }}>MÉDIO ≤</div>
          <input type="range" min={2} max={200} value={localThresh.medio} onChange={e => setLocalThresh(p => ({ ...p, medio:Math.max(Number(e.target.value),p.baixo+1) }))} className="thresh-slider" style={{ background:`linear-gradient(to right, var(--warn) 0%, var(--warn) ${(localThresh.medio/200)*100}%, var(--border2) ${(localThresh.medio/200)*100}%, var(--border2) 100%)` }} />
          <div className="thresh-val" style={{ color:"var(--warn)" }}>{localThresh.medio}</div>
        </div>
        <button className="btn btn-accent btn-full" style={{ marginTop:16 }} onClick={saveThresh} disabled={savingThresh}>
          {savingThresh ? <><span className="spinner" /> SALVANDO...</> : <><Icon name="save" size={15} /> SALVAR LIMITES</>}
        </button>
      </div>

      {/* ── CATEGORIAS ── */}
      <div className="card">
        <div className="card-title">CATEGORIAS</div>

        {/* Campo de criação */}
        <div style={{ display:"flex", gap:8, marginBottom: dupCat ? 8 : 10 }}>
          <input
            className="form-input"
            placeholder="Nova categoria..."
            value={nomeCat}
            onChange={e => setNomeCat(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCat()}
            style={{ flex:1, borderColor: dupCat ? "var(--warn)" : undefined }}
          />
          <button
            className="btn btn-accent"
            onClick={addCat}
            disabled={!!dupCat}
            style={{ padding:"12px 16px", opacity: dupCat ? .4 : 1 }}
            title={dupCat ? "Nome já existe" : "Criar categoria"}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>

        {/* Alerta de duplicata de categoria */}
        {dupCat && (
          <DupAlert
            tipo="cat"
            existente={dupCat}
            onDismiss={() => setNomeCat("")}
            onScrollTo={() => scrollToCat(dupCat)}
            onEdit={() => { scrollToCat(dupCat); setTimeout(() => { setEditCatId(dupCat.id); setEditCatVal(dupCat.nome); }, 300); setNomeCat(""); }}
            onDelete={() => { delCat(dupCat); setNomeCat(""); }}
          />
        )}

        {/* Filtro */}
        <SearchBox
          ctx={`cfg_cat_${setor}`}
          value={searchCat}
          onChange={setSearchCat}
          placeholder="Filtrar categorias..."
          suggestions={cats.map(c => c.nome)}
          style={{ marginBottom:10 }}
        />

        {/* Lista */}
        {(() => {
          const visibleCats = searchCat.trim()
            ? cats.filter(c => c.nome.toLowerCase().includes(searchCat.toLowerCase()))
            : cats;
          if (visibleCats.length === 0) return <div style={{ fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)" }}>{cats.length === 0 ? "Nenhuma categoria." : "Nenhuma categoria encontrada."}</div>;
          return (
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {visibleCats.map(c => {
                const isHighlight = highlightCat === c.id;
                const editDup = editCatId === c.id ? checkEditCatDup(editCatVal, c.id) : null;
                return (
                  <div
                    key={c.id}
                    ref={el => catItemRefs.current[c.id] = el}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"10px 12px", background: isHighlight ? "rgba(250,204,21,.08)" : "var(--surface2)",
                      border: isHighlight ? "1px solid var(--warn)" : "1px solid var(--border)",
                      borderRadius:"var(--r)",
                      transition:"border-color .3s, background .3s",
                    }}
                  >
                    {editCatId === c.id
                      ? <div style={{ flex:1, marginRight:6 }}>
                          <div className="inline-edit-row">
                            <input
                              autoFocus
                              value={editCatVal}
                              onChange={e => setEditCatVal(e.target.value)}
                              onKeyDown={e => { if(e.key==="Enter") saveCat(c); if(e.key==="Escape") setEditCatId(null); }}
                              style={{ borderColor: editDup ? "var(--warn)" : undefined }}
                            />
                            <button className="btn-icon-sm" style={{ borderColor:"var(--success)",color:"var(--success)" }} onClick={() => saveCat(c)} disabled={!!editDup}><Icon name="check" size={14} /></button>
                            <button className="btn-icon-sm" onClick={() => setEditCatId(null)}><Icon name="x" size={14} /></button>
                          </div>
                          {editDup && (
                            <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--warn)", marginTop:5, display:"flex", alignItems:"center", gap:5 }}>
                              <Icon name="x" size={12} /> Nome já existe — escolha outro
                            </div>
                          )}
                        </div>
                      : <span style={{ fontFamily:"var(--mono)", fontSize:13, flex:1 }}>{c.nome}</span>
                    }
                    {editCatId !== c.id && (
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="btn-icon-sm edit-btn" onClick={() => { setEditCatId(c.id); setEditCatVal(c.nome); }}><Icon name="edit" size={14} /></button>
                        <button className="btn-icon-sm" onClick={() => delCat(c)}><Icon name="trash" size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── PRODUTOS PADRÃO ── */}
      <div className="card">
        <div className="card-title">PRODUTOS PADRÃO</div>

        {/* Campo de criação */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom: dupProd ? 8 : 10 }}>
          <select className="form-select" value={catProd} onChange={e => setCatProd(e.target.value)}>
            <option value="">Selecionar categoria...</option>
            {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <div style={{ display:"flex", gap:8 }}>
            <input
              className="form-input"
              placeholder="Nome do produto..."
              value={nomeProd}
              onChange={e => setNomeProd(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addProd()}
              style={{ flex:1, borderColor: dupProd ? "var(--warn)" : undefined }}
            />
            <button
              className="btn btn-accent"
              onClick={addProd}
              disabled={!!dupProd}
              style={{ padding:"12px 16px", opacity: dupProd ? .4 : 1 }}
              title={dupProd ? "Nome já existe" : "Criar produto"}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>

        {/* Alerta de duplicata de produto */}
        {dupProd && (
          <DupAlert
            tipo="prod"
            existente={dupProd}
            onDismiss={() => setNomeProd("")}
            onScrollTo={() => scrollToProd(dupProd)}
            onEdit={() => { scrollToProd(dupProd); setTimeout(() => { setEditProdId(dupProd.id); setEditProdVal(dupProd.nome); }, 300); setNomeProd(""); }}
            onDelete={() => { delProd(dupProd); setNomeProd(""); }}
          />
        )}

        {/* Filtro */}
        <SearchBox
          ctx={`cfg_prod_${setor}`}
          value={searchProd}
          onChange={setSearchProd}
          placeholder="Filtrar produtos..."
          suggestions={prods.map(p => p.nome)}
          style={{ marginBottom:10 }}
        />

        {/* Lista */}
        {(() => {
          const qp = searchProd.toLowerCase();
          const filteredProds = qp
            ? prods.filter(p => p.nome.toLowerCase().includes(qp) || p.categoria.toLowerCase().includes(qp))
            : prods;
          if (filteredProds.length === 0) return <div style={{ fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)" }}>{prods.length === 0 ? "Nenhum produto padrão." : "Nenhum produto encontrado."}</div>;
          const catsComProds = cats.filter(c => filteredProds.some(p => p.categoria === c.nome));
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:360, overflowY:"auto" }}>
              {catsComProds.map(c => {
                const ps = filteredProds.filter(p => p.categoria === c.nome);
                if (!ps.length) return null;
                return (
                  <div key={c.id}>
                    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, textTransform:"uppercase", padding:"8px 0 4px" }}>{c.nome}</div>
                    {ps.map(p => {
                      const isHighlight = highlightProd === p.id;
                      const editDup = editProdId === p.id ? checkEditProdDup(editProdVal, p.id) : null;
                      return (
                        <div
                          key={p.id}
                          ref={el => prodItemRefs.current[p.id] = el}
                          style={{
                            display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding:"9px 12px",
                            background: isHighlight ? "rgba(250,204,21,.08)" : "var(--surface2)",
                            border: isHighlight ? "1px solid var(--warn)" : "1px solid var(--border)",
                            borderRadius:"var(--r)", marginBottom:4,
                            transition:"border-color .3s, background .3s",
                          }}
                        >
                          {editProdId === p.id
                            ? <div style={{ flex:1, marginRight:6 }}>
                                <div className="inline-edit-row">
                                  <input
                                    autoFocus
                                    value={editProdVal}
                                    onChange={e => setEditProdVal(e.target.value)}
                                    onKeyDown={e => { if(e.key==="Enter") saveProd(p); if(e.key==="Escape") setEditProdId(null); }}
                                    style={{ borderColor: editDup ? "var(--warn)" : undefined }}
                                  />
                                  <button className="btn-icon-sm" style={{ borderColor:"var(--success)",color:"var(--success)" }} onClick={() => saveProd(p)} disabled={!!editDup}><Icon name="check" size={14} /></button>
                                  <button className="btn-icon-sm" onClick={() => setEditProdId(null)}><Icon name="x" size={14} /></button>
                                </div>
                                {editDup && (
                                  <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--warn)", marginTop:5, display:"flex", alignItems:"center", gap:5 }}>
                                    <Icon name="x" size={12} /> Nome já existe em "{editDup.categoria}" — escolha outro
                                  </div>
                                )}
                              </div>
                            : <span style={{ fontFamily:"var(--mono)", fontSize:12, flex:1 }}>{p.nome}</span>
                          }
                          {editProdId !== p.id && (
                            <div style={{ display:"flex", gap:4 }}>
                              <button className="btn-icon-sm edit-btn" onClick={() => { setEditProdId(p.id); setEditProdVal(p.nome); }}><Icon name="edit" size={14} /></button>
                              <button className="btn-icon-sm" onClick={() => delProd(p)}><Icon name="trash" size={14} /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================================
// ENTRADA
// ============================================================
function Entrada({ setor, onRefresh, addToast, user }) {
  const colEst    = getCol(setor, "produtos");
  const colCat    = getCol(setor, "categorias");
  const colPadrao = getCol(setor, "produtos_padrao");

  const [cats, setCats]         = useState([]);
  const [padrao, setPadrao]     = useState([]);
  const [catSel, setCatSel]     = useState("");
  const [prodSel, setProdSel]   = useState("");
  const [quantidade, setQtd]    = useState(1);
  const [barcode, setBarcode]   = useState("");
  const [scanner, setScanner]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [loadData, setLoadData] = useState(true);
  const [existente, setExistente] = useState(null);
  const [dupModal, setDupModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]);
        setCats(sc.docs.map(d => ({ id:d.id, ...d.data() })));
        setPadrao(sp.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch (e) { addToast("Erro: " + e.message, "error"); }
      finally { setLoadData(false); }
    })();
  }, [setor]);

  useEffect(() => {
    if (!prodSel) { setExistente(null); return; }
    (async () => {
      try {
        const q = query(collection(db, colEst), where("nome", "==", prodSel));
        const snap = await getDocs(q);
        if (!snap.empty) setExistente({ id:snap.docs[0].id, ...snap.docs[0].data() });
        else setExistente(null);
      } catch {}
    })();
  }, [prodSel]);

  const prodsFiltrados = padrao.filter(p => !catSel || p.categoria === catSel);
  const qtdNum = Math.max(1, parseInt(quantidade) || 1);

  const onBarcodeScan = async (code) => {
    setScanner(false);
    try {
      const q = query(collection(db, colEst), where("barcodes", "array-contains", code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const prod = { id:snap.docs[0].id, ...snap.docs[0].data() };
        if (prodSel && prod.nome === prodSel) { setBarcode(code); addToast(`Código vinculado a "${prod.nome}"`, "info"); }
        else { setDupModal({ code, produto:prod }); }
      } else { setBarcode(code); addToast(`Código: ${code}`, "info"); }
    } catch { setBarcode(code); }
  };

  const confirmarDuplicado = () => {
    if (!dupModal) return;
    setBarcode(dupModal.code); setProdSel(dupModal.produto.nome);
    setDupModal(null); addToast(`Código vinculado a "${dupModal.produto.nome}"`, "info");
  };

  const gerarSemBarras = async () => {
    setLoading(true);
    try { const codigo = await gerarCodigoSemBarras(setor); setBarcode(codigo); addToast(`Código gerado: ${codigo}`, "info"); }
    catch (e) { addToast("Erro ao gerar código: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  const salvar = async () => {
    if (!prodSel) { addToast("Selecione um produto.", "error"); return; }
    setLoading(true);
    try {
      const categoriaFinal = padrao.find(p => p.nome === prodSel)?.categoria || catSel;
      if (existente) {
        const novosBarcodes = barcode && !existente.barcodes?.includes(barcode)
          ? [...(existente.barcodes || []), barcode]
          : (existente.barcodes || []);
        await updateDoc(doc(db, colEst, existente.id), {
          quantidade: increment(qtdNum),
          ...(novosBarcodes.length > 0 && { barcodes: novosBarcodes }),
          ultimaEntrada: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, colEst), {
          nome: prodSel, categoria: categoriaFinal,
          barcodes: barcode ? [barcode] : [],
          quantidade: qtdNum,
          criadoEm: new Date().toISOString(),
          ultimaEntrada: new Date().toISOString(),
        });
      }
      await registrarLog(setor, "entrada", { produto:prodSel, categoria:categoriaFinal, quantidade:qtdNum, barcode:barcode||"—", usuario:user.email });
      addToast(`${qtdNum}x "${prodSel}" registrado!`, "success");
      onRefresh(); setProdSel(""); setBarcode(""); setQtd(1); setExistente(null);
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  if (loadData) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">ENTRADA</div>
        <div className="page-sub">Registrar produtos — {resolveSetor(setor).label}</div>
      </div>
      {cats.length === 0 && <div className="err-msg">Vá em Configurações e crie as categorias primeiro.</div>}
      <div className="card">
        <div className="card-title">REGISTRAR ENTRADA</div>
        <div className="form-row" style={{ marginBottom:14 }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Categoria</label>
            <select className="form-select" value={catSel} onChange={e => { setCatSel(e.target.value); setProdSel(""); }}>
              <option value="">Todas</option>
              {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Produto *</label>
            <select className="form-select" value={prodSel} onChange={e => setProdSel(e.target.value)}>
              <option value="">Selecionar...</option>
              {prodsFiltrados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ maxWidth:160 }}>
          <label className="form-label">Quantidade *</label>
          <input className="form-input" type="number" inputMode="numeric" min={1} value={quantidade} onChange={e => setQtd(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Código de Barras
            {barcode && barcode.startsWith("SB-") && <span style={{ marginLeft:8,color:"var(--info)",fontSize:9,letterSpacing:1 }}>SEM BARRAS</span>}
            {!barcode && <span style={{ color:"var(--text-dim)",fontWeight:400,marginLeft:6 }}>(opcional)</span>}
          </label>
          {barcode
            ? <div style={{ display:"flex",gap:8,alignItems:"center",background:"var(--surface2)",border:"1px solid var(--border2)",padding:"12px 14px",borderRadius:"var(--r)" }}>
                <span style={{ flex:1,fontFamily:"var(--mono)",fontSize:13,color:"var(--accent)" }}>{barcode}</span>
                <button className="btn btn-outline" onClick={() => setBarcode("")} style={{ padding:"6px 12px",fontSize:11 }}><Icon name="x" size={13} /> LIMPAR</button>
              </div>
            : <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <button className="btn-scan" style={{ flex:2,minWidth:160 }} onClick={() => setScanner(true)}>
                  <Icon name="camera" size={16} /> ESCANEAR CÓDIGO DE BARRAS
                </button>
                <button className="btn btn-outline" style={{ flex:1,minWidth:130,borderStyle:"dashed",color:"var(--info)",borderColor:"var(--info)" }} onClick={gerarSemBarras} disabled={loading}>
                  <Icon name="tag" size={15} /> SEM BARRAS
                </button>
              </div>}
        </div>
        {existente && (
          <div className="entrada-preview">
            <div style={{ fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,marginBottom:8 }}>JÁ NO ESTOQUE — será somado</div>
            <div style={{ display:"flex",gap:10,alignItems:"center" }}>
              <span style={{ fontFamily:"var(--display)",fontSize:28,color:"var(--text-dim)" }}>{existente.quantidade||0}</span>
              <span style={{ fontFamily:"var(--mono)",fontSize:13,color:"var(--accent)" }}>+ {qtdNum}</span>
              <span style={{ fontFamily:"var(--mono)",fontSize:13,color:"var(--text-dim)" }}>→</span>
              <span style={{ fontFamily:"var(--display)",fontSize:28,color:"var(--success)" }}>{(existente.quantidade||0)+qtdNum}</span>
            </div>
          </div>
        )}
        <div className="divider" />
        <button className="btn btn-accent btn-lg btn-full" onClick={salvar} disabled={!prodSel||loading}>
          {loading ? <><span className="spinner" /> SALVANDO...</> : <><Icon name="arrowUp" size={16} /> REGISTRAR {qtdNum} {qtdNum===1?"UNIDADE":"UNIDADES"}</>}
        </button>
      </div>
      {dupModal && (
        <div className="dup-modal-overlay">
          <div className="dup-modal">
            <div className="dup-modal-title">CÓDIGO EXISTENTE</div>
            <div className="dup-modal-code">Código: {dupModal.code}</div>
            <div style={{ fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",marginBottom:10 }}>Este código já está cadastrado no produto:</div>
            <div className="dup-modal-product">
              <div className="dup-modal-pname">{dupModal.produto.nome}</div>
              <div className="dup-modal-pcat">{dupModal.produto.categoria} · {dupModal.produto.quantidade||0} un. em estoque</div>
            </div>
            <div className="dup-modal-btns">
              <button className="btn btn-accent btn-lg btn-full" onClick={confirmarDuplicado}>
                <Icon name="check" size={15} /> USAR PRODUTO ORIGINAL ({dupModal.produto.nome})
              </button>
              <button className="btn btn-outline btn-full" onClick={() => { setDupModal(null); addToast("Código descartado.", "info"); }}>
                <Icon name="x" size={15} /> DESCARTAR CÓDIGO
              </button>
            </div>
          </div>
        </div>
      )}
      {scanner && <ScannerModal title="ESCANEAR CÓDIGO" onScan={onBarcodeScan} onClose={() => setScanner(false)} />}
    </div>
  );
}

// ============================================================
// SAÍDA — com quantidade editável
// ============================================================
function Saida({ setor, onRefresh, addToast, user }) {
  const colEst    = getCol(setor, "produtos");
  const colCat    = getCol(setor, "categorias");
  const colPadrao = getCol(setor, "produtos_padrao");

  const [pw, setPw]           = useState("");
  const [authOk, setAuthOk]   = useState(false);
  const [scanner, setScanner] = useState(false);
  const [found, setFound]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual]   = useState("");
  const [modo, setModo]       = useState("scanner");

  const [cats, setCats]                     = useState([]);
  const [padrao, setPadrao]                 = useState([]);
  const [catSel, setCatSel]                 = useState("");
  const [prodSel, setProdSel]               = useState("");
  const [prodEncontrado, setProdEncontrado] = useState(null);
  const [loadData, setLoadData]             = useState(false);

  // Quantidade de saída
  const [qtdSaida, setQtdSaida] = useState(1);

  const doAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signInWithEmailAndPassword(auth, user.email, pw); setAuthOk(true); addToast("Autorizado.", "success"); }
    catch { addToast("Senha incorreta.", "error"); } finally { setLoading(false); }
  };

  const entrarSemBarras = async () => {
    setModo("sembarras"); setFound(null); setManual(""); setQtdSaida(1);
    if (cats.length > 0) return;
    setLoadData(true);
    try {
      const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]);
      setCats(sc.docs.map(d => ({ id:d.id, ...d.data() })));
      setPadrao(sp.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoadData(false); }
  };

  useEffect(() => {
    if (modo !== "sembarras" || !prodSel) { setProdEncontrado(null); return; }
    (async () => {
      try {
        const q = query(collection(db, colEst), where("nome", "==", prodSel));
        const snap = await getDocs(q);
        if (!snap.empty) setProdEncontrado({ id:snap.docs[0].id, ...snap.docs[0].data() });
        else setProdEncontrado(null);
      } catch {}
    })();
  }, [prodSel, modo]);

  const prodsFiltrados = padrao.filter(p => !catSel || p.categoria === catSel);

  const buscarPorCodigo = async (code) => {
    setLoading(true);
    try {
      let f = null;
      const q1 = query(collection(db, colEst), where("barcodes", "array-contains", code));
      const s1 = await getDocs(q1);
      if (!s1.empty) { f = { id:s1.docs[0].id, ...s1.docs[0].data() }; }
      if (!f) {
        const q2 = query(collection(db, colEst), where("barcode", "==", code));
        const s2 = await getDocs(q2);
        if (!s2.empty) { f = { id:s2.docs[0].id, ...s2.docs[0].data() }; }
      }
      if (f) { setFound(f); setQtdSaida(1); addToast(`Encontrado: ${f.nome}`, "info"); }
      else { setFound(null); addToast(`Código "${code}" não encontrado.`, "error"); }
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  const onBarcode = (code) => { setScanner(false); setManual(code); buscarPorCodigo(code); };

  const doSaida = async (produto) => {
    const p = produto || found;
    const qtd = Math.max(1, parseInt(qtdSaida) || 1);
    if (!p || (p.quantidade||0) <= 0) { addToast("Sem estoque!", "error"); return; }
    if (qtd > (p.quantidade||0)) { addToast(`Estoque insuficiente! Disponível: ${p.quantidade}`, "error"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, colEst, p.id), { quantidade: increment(-qtd) });
      await registrarLog(setor, "saida", { produto:p.nome, categoria:p.categoria, quantidade:qtd, usuario:user.email });
      addToast(`Saída: ${qtd}x "${p.nome}". Restam ${(p.quantidade||qtd)-qtd} un.`, "success");
      setFound(null); setManual(""); setQtdSaida(1);
      setProdSel(""); setCatSel(""); setProdEncontrado(null);
      setAuthOk(false); onRefresh();
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  const ProdutoCard = ({ p }) => {
    const qtd = Math.max(1, parseInt(qtdSaida) || 1);
    const apos = (p.quantidade||0) - qtd;
    return (
      <div className="found-card match" style={{ marginTop:14 }}>
        <div style={{ fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,marginBottom:8 }}>PRODUTO ENCONTRADO</div>
        <div className="found-name">{p.nome}</div>
        <div className="found-info" style={{ marginBottom:12 }}>
          {p.categoria} · Estoque: <strong style={{ color:(p.quantidade||0)>0?"var(--success)":"var(--danger)" }}>{p.quantidade||0} un.</strong>
        </div>
        {(p.quantidade||0) > 0 && (
          <>
            {/* Campo de quantidade */}
            <div className="form-group" style={{ marginBottom:10 }}>
              <label className="form-label">Quantidade a retirar</label>
              <input
                className="form-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={p.quantidade||1}
                value={qtdSaida}
                onChange={e => setQtdSaida(e.target.value)}
                style={{ maxWidth:140 }}
              />
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)",marginBottom:14 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,marginBottom:4 }}>ATUAL</div>
                <div style={{ fontFamily:"var(--display)",fontSize:36,color:"var(--text-dim)" }}>{p.quantidade}</div>
              </div>
              <div style={{ fontFamily:"var(--display)",fontSize:24,color:"var(--danger)" }}>−{qtd}</div>
              <div style={{ fontFamily:"var(--display)",fontSize:20,color:"var(--text-dim)" }}>→</div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,marginBottom:4 }}>APÓS SAÍDA</div>
                <div style={{ fontFamily:"var(--display)",fontSize:36,color:apos>0?"var(--success)":"var(--danger)" }}>{Math.max(0,apos)}</div>
              </div>
            </div>
          </>
        )}
        {(p.quantidade||0) > 0
          ? <button className="btn btn-success btn-lg btn-full" onClick={() => doSaida(p)} disabled={loading||qtd>(p.quantidade||0)}>
              {loading ? "REGISTRANDO..." : <><Icon name="arrowDown" size={16} /> CONFIRMAR SAÍDA (−{qtd})</>}
            </button>
          : <div style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--danger)",padding:"10px 0" }}>Estoque zerado.</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="page-hd"><div className="page-title">SAÍDA</div><div className="page-sub">Retirada — {resolveSetor(setor).label}</div></div>
      {!authOk
        ? <div className="card">
            <div className="card-title">CONFIRMAR IDENTIDADE</div>
            <form onSubmit={doAuth}>
              <div className="form-group"><label className="form-label">Administrador</label><input className="form-input" value={user.email} disabled /></div>
              <div className="form-group" style={{ marginTop:10 }}><label className="form-label">Senha</label><input className="form-input" type="password" autoComplete="current-password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} required autoFocus /></div>
              <button className="btn btn-danger btn-lg btn-full" style={{ marginTop:4 }} type="submit" disabled={loading}>{loading ? "VERIFICANDO..." : "CONFIRMAR"}</button>
            </form>
          </div>
        : <div className="card">
            <div className="card-title">REGISTRAR SAÍDA</div>
            <div style={{ display:"flex",gap:8,marginBottom:20 }}>
              <button
                className={`btn ${modo==="scanner"?"btn-accent":"btn-outline"}`}
                style={{ flex:1 }}
                onClick={() => { setModo("scanner"); setFound(null); setProdSel(""); setCatSel(""); setProdEncontrado(null); setQtdSaida(1); }}
              >
                <Icon name="camera" size={15} /> CÓDIGO DE BARRAS
              </button>
              <button
                className={`btn ${modo==="sembarras"?"btn-accent":"btn-outline"}`}
                style={{ flex:1, borderStyle:modo!=="sembarras"?"dashed":"solid", color:modo!=="sembarras"?"var(--info)":undefined, borderColor:modo!=="sembarras"?"var(--info)":undefined }}
                onClick={entrarSemBarras}
              >
                <Icon name="tag" size={15} /> SEM BARRAS
              </button>
            </div>

            {modo === "scanner" && (
              <>
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <input className="form-input" inputMode="numeric" placeholder="Código de barras..." value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key==="Enter" && buscarPorCodigo(manual)} style={{ flex:1 }} />
                  <button className="btn btn-outline" onClick={() => buscarPorCodigo(manual)} disabled={loading||!manual}>{loading ? <span className="spinner" /> : <Icon name="search" size={15} />}</button>
                </div>
                <button className="btn-scan" onClick={() => setScanner(true)}><Icon name="camera" size={16} /> ESCANEAR CÓDIGO</button>
                {found && <ProdutoCard p={found} />}
              </>
            )}

            {modo === "sembarras" && (
              <>
                {loadData
                  ? <div className="empty"><span className="spinner" /></div>
                  : <>
                      <div style={{ fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",marginBottom:14 }}>
                        Selecione o produto e a quantidade de saída.
                      </div>
                      <div className="form-group">
                        <label className="form-label">Categoria</label>
                        <select className="form-select" value={catSel} onChange={e => { setCatSel(e.target.value); setProdSel(""); setProdEncontrado(null); }}>
                          <option value="">Todas as categorias</option>
                          {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Produto *</label>
                        <select className="form-select" value={prodSel} onChange={e => { setProdSel(e.target.value); setQtdSaida(1); }}>
                          <option value="">Selecionar produto...</option>
                          {prodsFiltrados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                        </select>
                      </div>
                      {prodEncontrado && <ProdutoCard p={prodEncontrado} />}
                      {prodSel && !prodEncontrado && <div className="err-msg">Produto "{prodSel}" não encontrado no estoque.</div>}
                    </>}
              </>
            )}
          </div>}
      {scanner && <ScannerModal title="SAÍDA — ESCANEAR" onScan={onBarcode} onClose={() => setScanner(false)} />}
    </div>
  );
}

// ============================================================
// INVENTÁRIO
// ============================================================
function Inventario({ setor, products, onDelete, addToast, thresh }) {
  const colEst = getCol(setor, "produtos");
  const [search, setSearch] = useState(""), [loadId, setLoadId] = useState(null);

  const allNames = [...new Set(products.map(p => p.nome).filter(Boolean))];
  const allCats  = [...new Set(products.map(p => p.categoria).filter(Boolean))];

  const filtered = products.filter(p =>
    (p.nome||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria||"").toLowerCase().includes(search.toLowerCase())
  ).map(p => ({ ...p, _st:getStatus(p.quantidade||0, thresh) }));

  const del = async (p) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    setLoadId(p.id);
    try { await deleteDoc(doc(db, colEst, p.id)); onDelete(); addToast(`"${p.nome}" removido.`, "success"); }
    catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoadId(null); }
  };

  return (
    <div>
      <div className="page-hd"><div className="page-title">INVENTÁRIO</div><div className="page-sub">{products.length} produtos · {resolveSetor(setor).label}</div></div>
      <SearchBox
        ctx={`inv_${setor}`}
        value={search}
        onChange={setSearch}
        placeholder="Buscar produto ou categoria..."
        suggestions={[...allNames, ...allCats]}
        style={{ marginBottom:12 }}
      />
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">{filtered.length} produto{filtered.length!==1?"s":""}</div>
          {search && <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)" }}>"{search}"</span>}
        </div>
        <div className="product-list">
          {filtered.length === 0
            ? <div className="empty">Nenhum produto encontrado.</div>
            : filtered.sort((a,b) => (a.quantidade||0)-(b.quantidade||0)).map(p => (
              <div key={p.id} className="product-card">
                <div className="product-card-info">
                  <div className="product-card-name">{p.nome}</div>
                  <div className="product-card-cat">{p.categoria}</div>
                </div>
                <div className="product-card-right">
                  <div className="product-qty" style={{ color:statusColor(p._st) }}>{p.quantidade||0}</div>
                  <StatusBar qtd={p.quantidade||0} thresh={thresh} />
                  {statusLabel(p._st)}
                </div>
                <button className="btn-icon-sm" onClick={() => del(p)} disabled={loadId===p.id} style={{ marginLeft:6 }}>
                  {loadId===p.id ? <span className="spinner" /> : <Icon name="trash" size={14} />}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOG
// ============================================================
function LogCompleto({ setor, addToast }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, getCol(setor, "log")), orderBy("ts", "desc"), limit(200)));
        setLogs(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
    })();
  }, [setor]);

  const byTipo = filtro === "todos" ? logs : logs.filter(l => l.tipo === filtro);
  const q = search.toLowerCase();
  const filtered = q
    ? byTipo.filter(l =>
        (l.produto||"").toLowerCase().includes(q) ||
        (l.categoria||"").toLowerCase().includes(q) ||
        (l.descricao||"").toLowerCase().includes(q) ||
        (l.usuario||"").toLowerCase().includes(q))
    : byTipo;

  // Sugestões: nomes de produtos e categorias distintos dos logs
  const sugestoes = [...new Set([
    ...logs.map(l => l.produto).filter(Boolean),
    ...logs.map(l => l.categoria).filter(Boolean),
  ])];

  return (
    <div>
      <div className="page-hd"><div className="page-title">LOG</div><div className="page-sub">Histórico — {resolveSetor(setor).label}</div></div>

      <SearchBox
        ctx={`log_${setor}`}
        value={search}
        onChange={setSearch}
        placeholder="Buscar por produto, categoria, usuário..."
        suggestions={sugestoes}
        style={{ marginBottom:10 }}
      />

      <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center" }}>
        {[["todos","Todos"],["entrada","Entrada"],["saida","Saída"],["config","Config"]].map(([f,label]) => (
          <button key={f} className={`btn ${filtro===f?"btn-accent":"btn-outline"}`} onClick={() => setFiltro(f)} style={{ fontSize:11,padding:"8px 12px",textTransform:"uppercase" }}>{label}</button>
        ))}
        <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--text-dim)",alignSelf:"center",marginLeft:4 }}>{filtered.length} reg.</span>
        {search && <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)" }}>"{search}"</span>}
      </div>

      <div className="table-card">
        {loading ? <div className="empty"><span className="spinner" /></div> :
          filtered.length === 0 ? <div className="empty">Nenhum registro encontrado.</div> :
            filtered.map(l => (
              <div key={l.id} className="log-entry">
                <div><div className={`log-dot ${l.tipo==="entrada"?"in":l.tipo==="saida"?"out":"config"}`} /></div>
                <div>
                  <div className="log-action">
                    {l.tipo === "entrada" && <><span className="badge badge-in" style={{ marginRight:6 }}>↑</span>{l.quantidade}x {l.produto} {l.barcode&&l.barcode!=="—"&&<span style={{ color:"var(--text-dim)",fontSize:10 }}>· {l.barcode}</span>}</>}
                    {l.tipo === "saida"   && <><span className="badge badge-out" style={{ marginRight:6 }}>↓</span>{l.quantidade||1}x {l.produto}</>}
                    {l.tipo === "config"  && <><span className="badge" style={{ marginRight:6,color:"var(--info)",borderColor:"var(--info)" }}>CFG</span>{l.descricao}</>}
                  </div>
                  <div className="log-detail">{l.categoria&&`${l.categoria} · `}{l.usuario}</div>
                </div>
                <div className="log-time">{fmtDate(l.ts)}</div>
              </div>
            ))}
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS
// ============================================================
function Analytics({ setor, products }) {
  const [periodo, setPeriodo] = useState("semana");
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, getCol(setor, "log")),
          where("tipo", "==", "saida"),
          orderBy("ts", "desc"),
          limit(500)
        ));
        setLogs(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch { setLogs([]); }
      finally { setLoading(false); }
    })();
  }, [setor]);

  const agora = Date.now();
  const periodos = { dia:86400000, semana:604800000, mes:2592000000 };
  const cutoff = agora - (periodos[periodo] || periodos.semana);

  const logsF = logs.filter(l => {
    if (!l.ts) return false;
    const t = l.ts.toDate ? l.ts.toDate().getTime() : new Date(l.ts).getTime();
    return t >= cutoff;
  });

  // Top saídas
  const saidasMap = {};
  logsF.forEach(l => {
    const qtd = l.quantidade || 1;
    saidasMap[l.produto] = (saidasMap[l.produto] || { nome:l.produto, cat:l.categoria, total:0 });
    saidasMap[l.produto].total += qtd;
  });
  const topSaidasAll = Object.values(saidasMap).sort((a,b) => b.total-a.total).slice(0, 10);

  // Aplica search no top saídas e alertas
  const q = search.toLowerCase();
  const topSaidas = q
    ? topSaidasAll.filter(item => item.nome?.toLowerCase().includes(q) || item.cat?.toLowerCase().includes(q))
    : topSaidasAll;
  const maxS = (topSaidas[0]?.total || topSaidasAll[0]?.total || 1);

  const totalSaidas = logsF.reduce((a, l) => a + (l.quantidade||1), 0);

  // Gráfico por dia (últimos 7 dias)
  const dias7 = Array.from({ length:7 }, (_, i) => {
    const d = new Date(agora - (6-i)*86400000);
    return { label:d.toLocaleDateString("pt-BR",{weekday:"short"}), ts:[d.setHours(0,0,0,0), d.setHours(23,59,59,999)] };
  });
  const grafico = dias7.map(d => {
    const ini = agora - (6 - dias7.indexOf(d)) * 86400000 - (agora % 86400000);
    const fim = ini + 86399999;
    const total = logs.filter(l => {
      if (!l.ts) return false;
      const t = l.ts.toDate ? l.ts.toDate().getTime() : new Date(l.ts).getTime();
      return t >= ini && t <= fim;
    }).reduce((a,l) => a+(l.quantidade||1),0);
    return { label:d.label, total };
  });
  const maxG = Math.max(...grafico.map(g => g.total), 1);

  // Alertas (filtrado por search)
  const alertasAll = products.filter(p => (p.quantidade||0) <= 5).sort((a,b) => (a.quantidade||0)-(b.quantidade||0));
  const alertas = q
    ? alertasAll.filter(p => p.nome?.toLowerCase().includes(q) || p.categoria?.toLowerCase().includes(q))
    : alertasAll;

  // Sugestões para search
  const sugestoes = [...new Set([
    ...products.map(p => p.nome).filter(Boolean),
    ...products.map(p => p.categoria).filter(Boolean),
    ...topSaidasAll.map(s => s.nome).filter(Boolean),
  ])];

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-hd"><div className="page-title">ANALYTICS</div><div className="page-sub">{resolveSetor(setor).label}</div></div>

      <SearchBox
        ctx={`analytics_${setor}`}
        value={search}
        onChange={setSearch}
        placeholder="Filtrar por produto ou categoria..."
        suggestions={sugestoes}
        style={{ marginBottom:14 }}
      />

      <div className="period-tabs">
        {[["dia","Hoje"],["semana","Semana"],["mes","Mês"]].map(([k,l]) => (
          <button key={k} className={`ptab ${periodo===k?"active":""}`} onClick={() => setPeriodo(k)}>{l}</button>
        ))}
      </div>
      <div className="stats-grid" style={{ marginBottom:18 }}>
        <div className="stat-card" style={{ "--c":"var(--danger)" }}><div className="stat-label">Saídas (período)</div><div className="stat-value" style={{ color:"var(--danger)" }}>{totalSaidas}</div><div className="stat-sub">unidades</div></div>
        <div className="stat-card" style={{ "--c":"var(--accent)" }}><div className="stat-label">Produtos Ativos</div><div className="stat-value" style={{ color:"var(--accent)" }}>{products.length}</div><div className="stat-sub">SKUs</div></div>
        <div className="stat-card" style={{ "--c":"var(--warn)" }}><div className="stat-label">Alertas</div><div className="stat-value" style={{ color:"var(--warn)" }}>{alertasAll.length}</div><div className="stat-sub">estoque baixo</div></div>
        <div className="stat-card" style={{ "--c":"var(--info)" }}><div className="stat-label">Movimentos</div><div className="stat-value" style={{ color:"var(--info)" }}>{logsF.length}</div><div className="stat-sub">registros</div></div>
      </div>

      {/* Gráfico 7 dias — não filtra por search (é geral) */}
      {!search && (
        <div className="table-card" style={{ marginBottom:16 }}>
          <div className="table-card-header"><div className="table-card-title">SAÍDAS — ÚLTIMOS 7 DIAS</div></div>
          <div style={{ padding:"16px 12px" }}>
            <div className="bar-chart">
              {grafico.map((g,i) => (
                <div key={i} className="bar-col">
                  <div className="bar-val">{g.total||""}</div>
                  <div className="bar-fill" style={{ height:`${(g.total/maxG)*100}%`, background:"var(--accent)", opacity:g.total?1:.15 }} />
                  <div className="bar-label">{g.label}</div>
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
          {search && <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)" }}>"{search}" · {topSaidas.length} result.</span>}
        </div>
        {topSaidas.length === 0
          ? <div className="empty">{search ? `Nenhum resultado para "${search}".` : "Sem saídas no período."}</div>
          : topSaidas.map((item, i) => (
            <div key={item.nome} className="rank-row">
              <div className={`rank-num ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i+1}</div>
              <div className="rank-info"><div className="rank-name">{item.nome}</div><div className="rank-cat">{item.cat}</div></div>
              <div className="rank-bar-wrap">
                <div className="rank-bar-track"><div className="rank-bar-fill" style={{ width:`${(item.total/maxS)*100}%` }} /></div>
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
            <div className="table-card-title">ALERTAS DE ESTOQUE BAIXO</div>
            {search && <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)" }}>{alertas.length} result.</span>}
          </div>
          {alertas.map(p => (
            <div key={p.id} className="alert-row">
              <div className="alert-days" style={{ color:(p.quantidade||0)===0?"var(--danger)":"var(--accent)" }}>{p.quantidade||0}</div>
              <div className="alert-info">
                <div className="alert-name">{p.nome}</div>
                <div className="alert-sub">{p.categoria}</div>
              </div>
              {statusLabel(getStatus(p.quantidade||0, DEFAULT_THRESH))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [user, setUser]       = useState(null);
  const [setor, setSetor]     = useState(null);    // pode ser key de SETORES ou FERRAMENTAS_SUB
  const [showFerrSub, setShowFerrSub] = useState(false); // tela de sub-setor ferramentas
  const [tab, setTab]         = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [toasts, setToasts]   = useState([]);
  const [loadingP, setLoadingP] = useState(false);
  const [thresh, setThresh]   = useState(DEFAULT_THRESH);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now(); setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const loadThresh = useCallback(async (sk) => {
    try {
      const snap = await getDocs(collection(db, getCol(sk, "config")));
      const t = snap.docs.find(d => d.id === "thresholds");
      if (t) setThresh(t.data()); else setThresh(DEFAULT_THRESH);
    } catch { setThresh(DEFAULT_THRESH); }
  }, []);

  const loadProducts = useCallback(async (sk) => {
    const key = sk || setor; if (!key) return; setLoadingP(true);
    try {
      const snap = await getDocs(collection(db, getCol(key, "produtos")));
      setProducts(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoadingP(false); }
  }, [setor, addToast]);

  useEffect(() => { if (user && setor) { loadProducts(setor); loadThresh(setor); } }, [user, setor]);

  const logout = async () => { await signOut(auth); setUser(null); setSetor(null); setShowFerrSub(false); setTab("dashboard"); setProducts([]); };

  const selectSetor = (k) => {
    if (k === "ferramentas") { setShowFerrSub(true); return; }
    setSetor(k); setShowFerrSub(false); setTab("dashboard"); setProducts([]); setThresh(DEFAULT_THRESH);
  };

  const selectFerrSub = (k) => {
    setSetor(k); setShowFerrSub(false); setTab("dashboard"); setProducts([]); setThresh(DEFAULT_THRESH);
  };

  const back = () => { setSetor(null); setShowFerrSub(false); setTab("dashboard"); setProducts([]); };

  const s = setor ? resolveSetor(setor) : null;

  const navItems = [
    { id:"dashboard",  icon:"home",      label:"Home"    },
    { id:"entrada",    icon:"arrowUp",   label:"Entrada" },
    { id:"saida",      icon:"arrowDown", label:"Saída"   },
    { id:"inventario", icon:"package",   label:"Estoque" },
    { id:"analytics",  icon:"barChart",  label:"Analytics" },
    { id:"log",        icon:"fileText",  label:"Log"     },
    { id:"config",     icon:"settings",  label:"Config"  },
  ];
  const navGroups = [
    { group:"GERAL",     items:[navItems[0]] },
    { group:"MOVIMENT.", items:[navItems[1], navItems[2]] },
    { group:"CONTROLE",  items:[navItems[3], navItems[4]] },
    { group:"SISTEMA",   items:[navItems[5], navItems[6]] },
  ];

  if (!user) return <><style>{styles}</style><LoginScreen onLogin={setUser} /><Toast toasts={toasts} /></>;

  if (!setor) {
    return (
      <><style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">PARK</div>
          <div className="header-right">
            <span className="header-email">{user.email}</span>
            <button className="hbtn danger" onClick={logout}><Icon name="logout" size={14} /> SAIR</button>
          </div>
        </header>
        {showFerrSub
          ? <FerramentasSubScreen user={user} onSelect={selectFerrSub} onBack={() => setShowFerrSub(false)} />
          : <SetorScreen user={user} onSelect={selectSetor} />}
      </div>
      <Toast toasts={toasts} /></>
    );
  }

  return (
    <><style>{styles}</style>
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <Icon name={s.iconName} size={20} color={s.color} />
          PARK
          <span className="setor-tag" style={{ borderColor:s.color, color:s.color }}>{s.label}</span>
        </div>
        <div className="header-right">
          <span className="header-email">{user.email}</span>
          <button className="hbtn" onClick={back}><Icon name="arrowLeft" size={14} /> Setores</button>
          <button className="hbtn danger" onClick={logout}><Icon name="logout" size={14} /></button>
        </div>
      </header>
      <div className="main-layout">
        <nav className="sidebar">
          <div className="sidebar-setor">
            <div className="sidebar-setor-label">Setor ativo</div>
            <div className="sidebar-setor-name" style={{ color:s.color }}><Icon name={s.iconName} size={18} color={s.color} /> {s.label}</div>
          </div>
          <div className="sidebar-nav">
            {navGroups.map(g => (
              <div key={g.group}>
                <div className="sidebar-group">{g.group}</div>
                {g.items.map(item => (
                  <div key={item.id} className={`sitem ${tab===item.id?"active":""}`} onClick={() => setTab(item.id)}>
                    <span className="sitem-icon"><Icon name={item.icon} size={15} /></span>{item.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </nav>
        <main className="content">
          {loadingP
            ? <div className="empty"><span className="spinner" style={{ width:28,height:28,borderWidth:3 }} /></div>
            : <>
              {tab==="dashboard"  && <Dashboard   setor={setor} products={products} thresh={thresh} />}
              {tab==="entrada"    && <Entrada     setor={setor} onRefresh={() => loadProducts(setor)} addToast={addToast} user={user} />}
              {tab==="saida"      && <Saida       setor={setor} onRefresh={() => loadProducts(setor)} addToast={addToast} user={user} />}
              {tab==="inventario" && <Inventario  setor={setor} products={products} onDelete={() => loadProducts(setor)} addToast={addToast} thresh={thresh} />}
              {tab==="analytics"  && <Analytics   setor={setor} products={products} />}
              {tab==="log"        && <LogCompleto setor={setor} addToast={addToast} />}
              {tab==="config"     && <Configuracoes setor={setor} user={user} addToast={addToast} thresh={thresh} onThreshChange={t => setThresh(t)} />}
            </>}
        </main>
      </div>
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map(item => (
            <div key={item.id} className={`bnav-item ${tab===item.id?"active":""}`} onClick={() => setTab(item.id)}>
              <span className="bnav-icon"><Icon name={item.icon} size={22} /></span>
              <span className="bnav-label">{item.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </div>
    <Toast toasts={toasts} /></>
  );
}