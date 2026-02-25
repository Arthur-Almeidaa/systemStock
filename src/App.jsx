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

const SETORES = {
  ti:      { label:"TI",      icon:"💻", color:"#3b82f6", col:"estoque_ti"      },
  exfood:  { label:"Exfood",  icon:"🍽️", color:"#f5a623", col:"estoque_exfood"  },
  limpeza: { label:"Limpeza", icon:"🧹", color:"#52c41a", col:"estoque_limpeza" },
};

const getCol = (setor, type) => `${SETORES[setor].col}_${type}`;

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

// Gera próximo código "SEM BARRAS" por setor
// Formato simples: 01, 02, 03... (sempre incrementa, nunca reutiliza)
// O contador fica salvo no Firestore para garantir sequência global por setor
async function gerarCodigoSemBarras(setor) {
  const configRef = doc(db, getCol(setor, "config"), "contador_sem_barras");
  // Busca contador atual
  const snap = await getDocs(collection(db, getCol(setor, "config")));
  const contDoc = snap.docs.find(d => d.id === "contador_sem_barras");
  const atual = contDoc ? (contDoc.data().proximo || 1) : 1;
  const codigo = String(atual).padStart(2, "0");
  // Salva próximo
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
  .hbtn { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 6px 10px; font-family: var(--mono); font-size: 11px; cursor: pointer; transition: all .2s; text-transform: uppercase; letter-spacing: 1px; border-radius: var(--r); white-space: nowrap; -webkit-tap-highlight-color: transparent; }
  .hbtn:hover, .hbtn:active { border-color: var(--accent); color: var(--accent); }
  .hbtn.danger:hover, .hbtn.danger:active { border-color: var(--danger); color: var(--danger); }
  .header-email { font-family: var(--mono); font-size: 11px; color: var(--text-dim); }

  /* LAYOUT */
  .main-layout { display: flex; flex: 1; overflow: hidden; }

  /* SIDEBAR */
  .sidebar { width: 200px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto; }
  .sidebar-setor { padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .sidebar-setor-label { font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .sidebar-setor-name { font-family: var(--display); font-size: 20px; letter-spacing: 2px; }
  .sidebar-nav { padding: 6px 0; flex: 1; }
  .sidebar-group { padding: 12px 16px 3px; font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; }
  .sitem { display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-family: var(--mono); font-size: 12px; color: var(--text-dim); cursor: pointer; transition: all .15s; border-left: 2px solid transparent; }
  .sitem:hover { background: var(--surface2); color: var(--text); }
  .sitem.active { border-left-color: var(--accent); color: var(--accent); background: rgba(245,166,35,.06); }
  .sitem-icon { font-size: 15px; width: 20px; text-align: center; }

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
  .bnav-icon { font-size: 24px; line-height: 1; }
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
  .setor-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; width: 100%; max-width: 700px; }
  .setor-card { background: var(--surface); border: 1px solid var(--border); padding: 32px 12px; cursor: pointer; transition: all .25s; display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent; }
  .setor-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; opacity: 0; transition: opacity .25s; background: var(--c); }
  .setor-card:hover, .setor-card:active { transform: translateY(-4px); border-color: var(--c); }
  .setor-card:hover::after, .setor-card:active::after { opacity: 1; }
  .setor-card-icon { font-size: 40px; line-height: 1; }
  .setor-card-name { font-family: var(--display); font-size: 26px; letter-spacing: 2px; color: var(--c); }
  .setor-card-sub { font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 1px; }
  @media (max-width: 500px) {
    .setor-cards { grid-template-columns: 1fr; max-width: 320px; }
    .setor-card { flex-direction: row; padding: 18px; gap: 14px; align-items: center; }
    .setor-card-icon { font-size: 34px; flex-shrink: 0; }
  }

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
  .btn-icon-sm { background: transparent; border: 1px solid var(--border); color: var(--text-dim); padding: 9px 12px; cursor: pointer; font-size: 14px; transition: all .15s; border-radius: var(--r); touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-width: 40px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; }
  .btn-icon-sm:hover, .btn-icon-sm:active { border-color: var(--danger); color: var(--danger); }
  .btn-icon-sm:disabled { opacity: .4; cursor: not-allowed; }

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
  .toast { padding: 11px 16px; font-family: var(--mono); font-size: 12px; border-left: 3px solid; min-width: 220px; animation: tin .3s ease; border-radius: 0 var(--r) var(--r) 0; }
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
`;

// ============================================================
// SCANNER — lê 1 código e retorna
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
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
        tmp.getTracks().forEach(t => t.stop());
        const devs = await navigator.mediaDevices.enumerateDevices();
        const vids = devs.filter(d => d.kind === "videoinput");
        setCams(vids);
        const pref = vids.find(d => !/(front|ir|infrared)/i.test(d.label)) || vids[0];
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
      setCnt(CONFIRMS); setStatus({ msg: "✓ Código lido", t: "ok" }); setPendingConfirm({ code });
    } else {
      const s = h.filter(c => c === code).length;
      setCnt(s); setStatus({ msg: `Confirmando... (${s}/${CONFIRMS})`, t: "" });
    }
  }, []);

  const startCam = async (did) => {
    stopAll(); setReady(false); histRef.current = []; setCnt(0); setPendingConfirm(null);
    setStatus({ msg: "Abrindo câmera...", t: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: did }, width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 }, frameRate: { ideal: 30 } } });
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
    window.Quagga.init({ inputStream: { name: "Live", type: "LiveStream", target: videoRef.current, constraints: { deviceId: { exact: did }, width: 1280, height: 720 } }, decoder: { readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"] }, locate: true },
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
        {!ready && status.t !== "err" && (<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}><div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} /><span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-dim)" }}>Iniciando câmera...</span></div>)}
        {pendingConfirm && (
          <div className="scan-confirm-overlay">
            <div className="scan-confirm-box">
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-dim)", letterSpacing: 2, marginBottom: 8 }}>CÓDIGO LIDO</div>
              <div className="scan-confirm-code">{pendingConfirm.code}</div>
              <div className="scan-confirm-info">Confirme se o código está correto</div>
              <div className="scan-confirm-btns">
                <button className="btn btn-success btn-lg" onClick={handleConfirm} style={{ flex: 1 }}>✓ CONFIRMAR</button>
                <button className="btn btn-danger" onClick={handleReject} style={{ flex: 1 }}>✕ LER DE NOVO</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="scanner-bar">
        <div className="scanner-bar-row1">
          <div className="scanner-bar-title">{title || "ESCANEAR"}</div>
          {cams.length > 1 && (<div className="cam-row" style={{ flex: 1, marginLeft: 8 }}><label>CAM:</label><select value={selCam} onChange={e => setSelCam(e.target.value)}>{cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>)}</select></div>)}
          {!pendingConfirm && <div className="cdots">{dots.map((d, i) => <div key={i} className={`cdot ${d.done ? "done" : d.on ? "on" : ""}`} />)}</div>}
          <button className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 11 }} onClick={() => { stopAll(); onClose(); }}>✕</button>
        </div>
        <div className={`scanner-status ${status.t}`}>{!ready && status.t !== "err" && <span className="spinner" style={{ marginRight: 8 }} />}{pendingConfirm ? "Confirme ou leia novamente" : status.msg}</div>
        <div className="scanner-manual">
          <input type="text" inputMode="numeric" placeholder="Digitar código..." value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === "Enter" && handleManual()} />
          <button onClick={handleManual}>OK</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  return <div className="toast-wrap">{toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.type === "success" ? "✓" : t.type === "error" ? "✗" : "ℹ"} {t.message}</div>)}</div>;
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
        <div className="status-bar-fill" style={{ width: pct + "%", background: statusColor(st) }} />
      </div>
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
    catch (ex) { const m = { "auth/invalid-credential": "Email ou senha incorretos.", "auth/too-many-requests": "Muitas tentativas." }; setErr(m[ex.code] || "Erro: " + ex.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="login-screen"><div className="login-card">
      <div className="login-title">PARK<span>.</span></div>
      <div className="login-sub">Controle de Estoque</div>
      <form onSubmit={go}>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@empresa.com" required autoFocus /></div>
        <div className="form-group"><label className="form-label">Senha</label><input className="form-input" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required /></div>
        <button className="btn btn-accent btn-lg btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>{loading ? "ENTRANDO..." : "ENTRAR"}</button>
        {err && <div className="err-msg">{err}</div>}
      </form>
    </div></div>
  );
}

// ============================================================
// SETOR
// ============================================================
function SetorScreen({ user, onSelect }) {
  return (
    <div className="setor-screen">
      <div className="setor-heading"><h2>SELECIONE O SETOR</h2><p>{user.email}</p></div>
      <div className="setor-cards">
        {Object.entries(SETORES).map(([key, s]) => (
          <div key={key} className="setor-card" style={{ "--c": s.color }} onClick={() => onSelect(key)}>
            <span className="setor-card-icon">{s.icon}</span>
            <div><div className="setor-card-name">{s.label}</div><div className="setor-card-sub">Gestão de Estoque</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ setor, products, thresh }) {
  const s = SETORES[setor];
  const [filtro, setFiltro] = useState("todos");

  const withStatus = products.map(p => ({ ...p, _st: getStatus(p.quantidade || 0, thresh) }));
  const total      = products.length;
  const totalItens = products.reduce((a, p) => a + (p.quantidade || 0), 0);
  const zerados    = withStatus.filter(p => p._st === "zero").length;
  const baixos     = withStatus.filter(p => p._st === "baixo").length;
  const filtered   = filtro === "todos" ? withStatus : withStatus.filter(p => p._st === filtro);

  const filterBtns = [
    { id: "todos",  label: "Todos",  dot: "#aaa",           count: total },
    { id: "alto",   label: "OK",     dot: "var(--success)", count: withStatus.filter(p=>p._st==="alto").length },
    { id: "medio",  label: "Médio",  dot: "var(--warn)",    count: withStatus.filter(p=>p._st==="medio").length },
    { id: "baixo",  label: "Baixo",  dot: "var(--accent)",  count: baixos },
    { id: "zero",   label: "Zerado", dot: "var(--danger)",  count: zerados },
  ];

  return (
    <div>
      <div className="page-hd"><div className="page-title">DASHBOARD</div><div className="page-sub">Setor {s.label}</div></div>
      <div className="stats-grid">
        <div className="stat-card" style={{ "--c": s.color }}><div className="stat-label">Produtos</div><div className="stat-value" style={{ color: s.color }}>{total}</div><div className="stat-sub">SKUs</div></div>
        <div className="stat-card" style={{ "--c": "var(--success)" }}><div className="stat-label">Em Estoque</div><div className="stat-value" style={{ color: "var(--success)" }}>{totalItens}</div><div className="stat-sub">unidades</div></div>
        <div className="stat-card" style={{ "--c": baixos > 0 ? "var(--accent)" : "var(--success)" }}><div className="stat-label">Baixo</div><div className="stat-value" style={{ color: baixos > 0 ? "var(--accent)" : "var(--success)" }}>{baixos}</div><div className="stat-sub">produtos</div></div>
        <div className="stat-card" style={{ "--c": zerados > 0 ? "var(--danger)" : "var(--success)" }}><div className="stat-label">Zerados</div><div className="stat-value" style={{ color: zerados > 0 ? "var(--danger)" : "var(--success)" }}>{zerados}</div><div className="stat-sub">produtos</div></div>
      </div>
      <div className="filter-tabs">
        {filterBtns.map(fb => (
          <button key={fb.id} className={`ftab ${filtro === fb.id ? "active" : ""}`} onClick={() => setFiltro(fb.id)}>
            {filtro !== fb.id && <span className="ftab-dot" style={{ background: fb.dot }} />}
            {fb.label} {fb.count > 0 && <span style={{ opacity: .7 }}>({fb.count})</span>}
          </button>
        ))}
      </div>
      <div className="table-card">
        <div className="table-card-header"><div className="table-card-title">{filtered.length} produto{filtered.length !== 1 ? "s" : ""}</div></div>
        <div className="product-list">
          {filtered.length === 0
            ? <div className="empty">Nenhum produto nessa categoria.</div>
            : filtered.sort((a, b) => (a.quantidade || 0) - (b.quantidade || 0)).map(p => (
              <div key={p.id} className="product-card">
                <div className="product-card-info"><div className="product-card-name">{p.nome}</div><div className="product-card-cat">{p.categoria}</div></div>
                <div className="product-card-right">
                  <div className="product-qty" style={{ color: statusColor(p._st) }}>{p.quantidade || 0}</div>
                  <StatusBar qtd={p.quantidade || 0} thresh={thresh} />
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
// CONFIGURAÇÕES
// ============================================================
function Configuracoes({ setor, user, addToast, thresh, onThreshChange }) {
  const colCat = getCol(setor, "categorias"), colPadrao = getCol(setor, "produtos_padrao");
  const [cats, setCats] = useState([]), [prods, setProds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeCat, setNomeCat] = useState(""), [nomeProd, setNomeProd] = useState(""), [catProd, setCatProd] = useState("");
  const [localThresh, setLocalThresh] = useState(thresh || DEFAULT_THRESH);
  const [savingThresh, setSavingThresh] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]); setCats(sc.docs.map(d => ({ id: d.id, ...d.data() }))); setProds(sp.docs.map(d => ({ id: d.id, ...d.data() }))); }
    catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); setLocalThresh(thresh || DEFAULT_THRESH); }, [setor, thresh]);

  const addCat = async () => {
    if (!nomeCat.trim()) return;
    try { await addDoc(collection(db, colCat), { nome: nomeCat.trim(), criadoEm: new Date().toISOString() }); await registrarLog(setor, "config", { descricao: `Categoria: ${nomeCat.trim()}`, usuario: user.email }); addToast("Categoria criada!", "success"); setNomeCat(""); load(); }
    catch (e) { addToast("Erro: " + e.message, "error"); }
  };
  const delCat = async (c) => {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try { await deleteDoc(doc(db, colCat, c.id)); addToast("Removida.", "success"); load(); } catch (e) { addToast("Erro: " + e.message, "error"); }
  };
  const addProd = async () => {
    if (!nomeProd.trim() || !catProd) { addToast("Preencha nome e categoria.", "error"); return; }
    try { await addDoc(collection(db, colPadrao), { nome: nomeProd.trim(), categoria: catProd, criadoEm: new Date().toISOString() }); await registrarLog(setor, "config", { descricao: `Produto: ${nomeProd.trim()}`, usuario: user.email }); addToast(`"${nomeProd}" criado!`, "success"); setNomeProd(""); load(); }
    catch (e) { addToast("Erro: " + e.message, "error"); }
  };
  const delProd = async (p) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    try { await deleteDoc(doc(db, colPadrao, p.id)); addToast("Removido.", "success"); load(); } catch (e) { addToast("Erro: " + e.message, "error"); }
  };

  const saveThresh = async () => {
    if (localThresh.baixo >= localThresh.medio) { addToast("'Baixo' deve ser menor que 'Médio'.", "error"); return; }
    setSavingThresh(true);
    try {
      await setDoc(doc(db, getCol(setor, "config"), "thresholds"), { ...localThresh, updatedAt: new Date().toISOString() });
      onThreshChange(localThresh);
      await registrarLog(setor, "config", { descricao: `Thresholds: baixo≤${localThresh.baixo}, médio≤${localThresh.medio}`, usuario: user.email });
      addToast("Limites salvos!", "success");
    } catch (e) { addToast("Erro: " + e.message, "error"); } finally { setSavingThresh(false); }
  };

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-hd"><div className="page-title">CONFIG</div><div className="page-sub">Configurações do setor {SETORES[setor].label}</div></div>
      <div className="card">
        <div className="card-title">NÍVEIS DE ESTOQUE</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[["ZERADO","0","var(--danger)"],["BAIXO",`1–${localThresh.baixo}`,"var(--accent)"],["MÉDIO",`${localThresh.baixo+1}–${localThresh.medio}`,"var(--warn)"],["OK",`${localThresh.medio+1}+`,"var(--success)"]].map(([lbl,val,cor]) => (
            <div key={lbl} style={{ flex:1, minWidth:80, background:"var(--surface2)", border:`1px solid ${cor}`, borderRadius:"var(--r)", padding:"10px 14px", textAlign:"center" }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:9, color:cor, letterSpacing:2, marginBottom:4 }}>{lbl}</div>
              <div style={{ fontFamily:"var(--display)", fontSize:22, color:cor }}>{val}</div>
            </div>
          ))}
        </div>
        <div className="thresh-row">
          <div className="thresh-label" style={{ color:"var(--accent)" }}>BAIXO ≤</div>
          <input type="range" min={1} max={50} value={localThresh.baixo} onChange={e => setLocalThresh(p => ({ ...p, baixo: Math.min(Number(e.target.value), p.medio - 1) }))} className="thresh-slider" style={{ background:`linear-gradient(to right, var(--accent) 0%, var(--accent) ${(localThresh.baixo/50)*100}%, var(--border2) ${(localThresh.baixo/50)*100}%, var(--border2) 100%)` }} />
          <div className="thresh-val" style={{ color:"var(--accent)" }}>{localThresh.baixo}</div>
        </div>
        <div className="thresh-row">
          <div className="thresh-label" style={{ color:"var(--warn)" }}>MÉDIO ≤</div>
          <input type="range" min={2} max={200} value={localThresh.medio} onChange={e => setLocalThresh(p => ({ ...p, medio: Math.max(Number(e.target.value), p.baixo + 1) }))} className="thresh-slider" style={{ background:`linear-gradient(to right, var(--warn) 0%, var(--warn) ${(localThresh.medio/200)*100}%, var(--border2) ${(localThresh.medio/200)*100}%, var(--border2) 100%)` }} />
          <div className="thresh-val" style={{ color:"var(--warn)" }}>{localThresh.medio}</div>
        </div>
        <button className="btn btn-accent btn-full" style={{ marginTop:16 }} onClick={saveThresh} disabled={savingThresh}>{savingThresh ? <><span className="spinner" /> SALVANDO...</> : "💾 SALVAR LIMITES"}</button>
      </div>
      <div className="card">
        <div className="card-title">CATEGORIAS</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input className="form-input" placeholder="Nova categoria..." value={nomeCat} onChange={e => setNomeCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()} style={{ flex:1 }} />
          <button className="btn btn-accent" onClick={addCat} style={{ padding:"12px 16px" }}>+</button>
        </div>
        {cats.length === 0 ? <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)" }}>Nenhuma categoria.</div> :
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {cats.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)" }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:13 }}>{c.nome}</span>
                <button className="btn-icon-sm" onClick={() => delCat(c)}>🗑</button>
              </div>
            ))}
          </div>}
      </div>
      <div className="card">
        <div className="card-title">PRODUTOS PADRÃO</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
          <select className="form-select" value={catProd} onChange={e => setCatProd(e.target.value)}>
            <option value="">Selecionar categoria...</option>
            {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <div style={{ display:"flex", gap:8 }}>
            <input className="form-input" placeholder="Nome do produto..." value={nomeProd} onChange={e => setNomeProd(e.target.value)} onKeyDown={e => e.key === "Enter" && addProd()} style={{ flex:1 }} />
            <button className="btn btn-accent" onClick={addProd} style={{ padding:"12px 16px" }}>+</button>
          </div>
        </div>
        {prods.length === 0 ? <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)" }}>Nenhum produto padrão.</div> :
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
            {cats.map(c => { const ps = prods.filter(p => p.categoria === c.nome); if (!ps.length) return null; return (
              <div key={c.id}>
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, textTransform:"uppercase", padding:"8px 0 4px" }}>{c.nome}</div>
                {ps.map(p => (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)", marginBottom:4 }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:12 }}>{p.nome}</span>
                    <button className="btn-icon-sm" onClick={() => delProd(p)}>🗑</button>
                  </div>
                ))}
              </div>
            ); })}
          </div>}
      </div>
    </div>
  );
}

// ============================================================
// ENTRADA — 1 código (ou sem barras) + quantidade
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
  // Modal de código duplicado
  const [dupModal, setDupModal] = useState(null); // { code, produto }

  useEffect(() => {
    (async () => {
      try {
        const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]);
        setCats(sc.docs.map(d => ({ id: d.id, ...d.data() })));
        setPadrao(sp.docs.map(d => ({ id: d.id, ...d.data() })));
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
        if (!snap.empty) setExistente({ id: snap.docs[0].id, ...snap.docs[0].data() });
        else setExistente(null);
      } catch {}
    })();
  }, [prodSel]);

  const prodsFiltrados = padrao.filter(p => !catSel || p.categoria === catSel);
  const qtdNum = Math.max(1, parseInt(quantidade) || 1);

  // Quando escaneia: verifica se código já existe em OUTRO produto
  const onBarcodeScan = async (code) => {
    setScanner(false);
    // Busca se código já está cadastrado
    try {
      const q = query(collection(db, colEst), where("barcodes", "array-contains", code));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const prod = { id: snap.docs[0].id, ...snap.docs[0].data() };
        // Se é o mesmo produto selecionado, apenas aceita
        if (prodSel && prod.nome === prodSel) {
          setBarcode(code);
          addToast(`Código já vinculado a "${prod.nome}" — ok!`, "info");
        } else {
          // Produto DIFERENTE — abre modal de confirmação
          setDupModal({ code, produto: prod });
        }
      } else {
        setBarcode(code);
        addToast(`Código: ${code}`, "info");
      }
    } catch {
      setBarcode(code);
    }
  };

  // Usuário confirma: vincula código ao produto JÁ cadastrado (ignora produto selecionado)
  const confirmarDuplicado = () => {
    if (!dupModal) return;
    setBarcode(dupModal.code);
    // Seleciona o produto original automaticamente
    setProdSel(dupModal.produto.nome);
    setDupModal(null);
    addToast(`Código vinculado a "${dupModal.produto.nome}"`, "info");
  };

  // Gera código "Sem Barras"
  const gerarSemBarras = async () => {
    setLoading(true);
    try {
      const codigo = await gerarCodigoSemBarras(setor);
      setBarcode(codigo);
      addToast(`Código gerado: ${codigo}`, "info");
    } catch (e) { addToast("Erro ao gerar código: " + e.message, "error"); }
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
          nome: prodSel,
          categoria: categoriaFinal,
          barcodes: barcode ? [barcode] : [],
          quantidade: qtdNum,
          criadoEm: new Date().toISOString(),
          ultimaEntrada: new Date().toISOString(),
        });
      }

      await registrarLog(setor, "entrada", {
        produto: prodSel,
        categoria: categoriaFinal,
        quantidade: qtdNum,
        barcode: barcode || "—",
        usuario: user.email,
      });

      addToast(`✓ ${qtdNum}x "${prodSel}" registrado!`, "success");
      onRefresh();
      setProdSel(""); setBarcode(""); setQtd(1); setExistente(null);
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  if (loadData) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">ENTRADA</div>
        <div className="page-sub">Registrar produtos — {SETORES[setor].label}</div>
      </div>

      {cats.length === 0 && <div className="err-msg">⚠ Vá em Configurações e crie as categorias primeiro.</div>}

      <div className="card">
        <div className="card-title">REGISTRAR ENTRADA</div>

        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Categoria</label>
            <select className="form-select" value={catSel} onChange={e => { setCatSel(e.target.value); setProdSel(""); }}>
              <option value="">Todas</option>
              {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Produto *</label>
            <select className="form-select" value={prodSel} onChange={e => setProdSel(e.target.value)}>
              <option value="">Selecionar...</option>
              {prodsFiltrados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: 160 }}>
          <label className="form-label">Quantidade *</label>
          <input className="form-input" type="number" inputMode="numeric" min={1} value={quantidade} onChange={e => setQtd(e.target.value)} />
        </div>

        {/* Código de barras */}
        <div className="form-group">
          <label className="form-label">
            Código de Barras
            {barcode && barcode.startsWith("SB-") && (
              <span style={{ marginLeft:8, color:"var(--info)", fontSize:9, letterSpacing:1 }}>SEM BARRAS</span>
            )}
            {!barcode && <span style={{ color:"var(--text-dim)", fontWeight:400, marginLeft:6 }}>(opcional)</span>}
          </label>

          {barcode ? (
            <div style={{ display:"flex", gap:8, alignItems:"center", background:"var(--surface2)", border:"1px solid var(--border2)", padding:"12px 14px", borderRadius:"var(--r)" }}>
              <span style={{ flex:1, fontFamily:"var(--mono)", fontSize:13, color:"var(--accent)" }}>{barcode}</span>
              <button className="btn btn-outline" onClick={() => setBarcode("")} style={{ padding:"6px 12px", fontSize:11 }}>✕ LIMPAR</button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button className="btn-scan" style={{ flex:2, minWidth:160 }} onClick={() => setScanner(true)}>
                📷 ESCANEAR CÓDIGO DE BARRAS
              </button>
              <button
                className="btn btn-outline"
                style={{ flex:1, minWidth:130, borderStyle:"dashed", color:"var(--info)", borderColor:"var(--info)" }}
                onClick={gerarSemBarras}
                disabled={loading}
                title="Gera código interno automático para produtos sem código de barras"
              >
                🏷️ SEM BARRAS
              </button>
            </div>
          )}
        </div>

        {/* Preview quantidade */}
        {existente && (
          <div className="entrada-preview">
            <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, marginBottom:8 }}>JÁ NO ESTOQUE — será somado</div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontFamily:"var(--display)", fontSize:28, color:"var(--text-dim)" }}>{existente.quantidade || 0}</span>
              <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"var(--accent)" }}>+ {qtdNum}</span>
              <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"var(--text-dim)" }}>→</span>
              <span style={{ fontFamily:"var(--display)", fontSize:28, color:"var(--success)" }}>{(existente.quantidade || 0) + qtdNum}</span>
            </div>
          </div>
        )}

        <div className="divider" />
        <button className="btn btn-accent btn-lg btn-full" onClick={salvar} disabled={!prodSel || loading}>
          {loading ? <><span className="spinner" /> SALVANDO...</> : `✓ REGISTRAR ${qtdNum} ${qtdNum === 1 ? "UNIDADE" : "UNIDADES"}`}
        </button>
      </div>

      {/* Modal: código duplicado em outro produto */}
      {dupModal && (
        <div className="dup-modal-overlay">
          <div className="dup-modal">
            <div className="dup-modal-title">⚠ CÓDIGO EXISTENTE</div>
            <div className="dup-modal-code">Código: {dupModal.code}</div>
            <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:10 }}>
              Este código já está cadastrado no produto:
            </div>
            <div className="dup-modal-product">
              <div className="dup-modal-pname">{dupModal.produto.nome}</div>
              <div className="dup-modal-pcat">{dupModal.produto.categoria} · {dupModal.produto.quantidade || 0} un. em estoque</div>
            </div>
            <div className="dup-modal-btns">
              <button className="btn btn-accent btn-lg btn-full" onClick={confirmarDuplicado}>
                ✓ USAR PRODUTO ORIGINAL ({dupModal.produto.nome})
              </button>
              <button className="btn btn-outline btn-full" onClick={() => { setDupModal(null); addToast("Código descartado.", "info"); }}>
                ✕ DESCARTAR CÓDIGO
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
// SAÍDA — scanner normal OU modo "Sem Barras" (cat+produto → -1)
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
  const [modo, setModo]       = useState("scanner"); // "scanner" | "sembarras"

  // Estado modo sem barras
  const [cats, setCats]               = useState([]);
  const [padrao, setPadrao]           = useState([]);
  const [catSel, setCatSel]           = useState("");
  const [prodSel, setProdSel]         = useState("");
  const [prodEncontrado, setProdEncontrado] = useState(null);
  const [loadData, setLoadData]       = useState(false);

  const doAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signInWithEmailAndPassword(auth, user.email, pw); setAuthOk(true); addToast("Autorizado.", "success"); }
    catch { addToast("Senha incorreta.", "error"); } finally { setLoading(false); }
  };

  const entrarSemBarras = async () => {
    setModo("sembarras"); setFound(null); setManual("");
    if (cats.length > 0) return;
    setLoadData(true);
    try {
      const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]);
      setCats(sc.docs.map(d => ({ id: d.id, ...d.data() })));
      setPadrao(sp.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoadData(false); }
  };

  // Busca produto no estoque quando seleciona no modo sem barras
  useEffect(() => {
    if (modo !== "sembarras" || !prodSel) { setProdEncontrado(null); return; }
    (async () => {
      try {
        const q = query(collection(db, colEst), where("nome", "==", prodSel));
        const snap = await getDocs(q);
        if (!snap.empty) setProdEncontrado({ id: snap.docs[0].id, ...snap.docs[0].data() });
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
      if (!s1.empty) { f = { id: s1.docs[0].id, ...s1.docs[0].data() }; }
      if (!f) {
        const q2 = query(collection(db, colEst), where("barcode", "==", code));
        const s2 = await getDocs(q2);
        if (!s2.empty) { f = { id: s2.docs[0].id, ...s2.docs[0].data() }; }
      }
      if (f) { setFound(f); addToast(`Encontrado: ${f.nome}`, "info"); }
      else { setFound(null); addToast(`Código "${code}" não encontrado.`, "error"); }
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  const onBarcode = (code) => { setScanner(false); setManual(code); buscarPorCodigo(code); };

  const doSaida = async (produto) => {
    const p = produto || found;
    if (!p || (p.quantidade || 0) <= 0) { addToast("Sem estoque!", "error"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, colEst, p.id), { quantidade: increment(-1) });
      await registrarLog(setor, "saida", { produto: p.nome, categoria: p.categoria, quantidade: 1, usuario: user.email });
      addToast(`✓ Saída: "${p.nome}". Restam ${(p.quantidade || 1) - 1} un.`, "success");
      setFound(null); setManual("");
      setProdSel(""); setCatSel(""); setProdEncontrado(null);
      setAuthOk(false); onRefresh();
    } catch (e) { addToast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  // Card reutilizável para mostrar produto encontrado
  const ProdutoCard = ({ p }) => (
    <div className="found-card match" style={{ marginTop:14 }}>
      <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, marginBottom:8 }}>PRODUTO ENCONTRADO</div>
      <div className="found-name">{p.nome}</div>
      <div className="found-info" style={{ marginBottom:12 }}>
        {p.categoria} · Estoque: <strong style={{ color:(p.quantidade||0)>0?"var(--success)":"var(--danger)" }}>{p.quantidade||0} un.</strong>
      </div>
      {(p.quantidade||0) > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", marginBottom:14 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, marginBottom:4 }}>ATUAL</div>
            <div style={{ fontFamily:"var(--display)", fontSize:36, color:"var(--text-dim)" }}>{p.quantidade}</div>
          </div>
          <div style={{ fontFamily:"var(--display)", fontSize:24, color:"var(--danger)" }}>{"−1"}</div>
          <div style={{ fontFamily:"var(--display)", fontSize:20, color:"var(--text-dim)" }}>{"→"}</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, marginBottom:4 }}>APÓS SAÍDA</div>
            <div style={{ fontFamily:"var(--display)", fontSize:36, color:(p.quantidade-1)>0?"var(--success)":"var(--danger)" }}>{(p.quantidade||0)-1}</div>
          </div>
        </div>
      )}
      {(p.quantidade||0)>0
        ? <button className="btn btn-success btn-lg btn-full" onClick={() => doSaida(p)} disabled={loading}>{loading ? "REGISTRANDO..." : "✓ CONFIRMAR SAÍDA (−1)"}</button>
        : <div style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--danger)", padding:"10px 0" }}>⚠ Estoque zerado.</div>}
    </div>
  );

  return (
    <div>
      <div className="page-hd"><div className="page-title">SAÍDA</div><div className="page-sub">Retirada — {SETORES[setor].label}</div></div>
      {!authOk ? (
        <div className="card">
          <div className="card-title">CONFIRMAR IDENTIDADE</div>
          <form onSubmit={doAuth}>
            <div className="form-group"><label className="form-label">Administrador</label><input className="form-input" value={user.email} disabled /></div>
            <div className="form-group" style={{ marginTop:10 }}><label className="form-label">Senha</label><input className="form-input" type="password" autoComplete="current-password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} required autoFocus /></div>
            <button className="btn btn-danger btn-lg btn-full" style={{ marginTop:4 }} type="submit" disabled={loading}>{loading ? "VERIFICANDO..." : "CONFIRMAR"}</button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">REGISTRAR SAÍDA</div>

          {/* Toggle scanner / sem barras */}
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            <button
              className={`btn ${modo==="scanner" ? "btn-accent" : "btn-outline"}`}
              style={{ flex:1 }}
              onClick={() => { setModo("scanner"); setFound(null); setProdSel(""); setCatSel(""); setProdEncontrado(null); }}
            >
              📷 CÓDIGO DE BARRAS
            </button>
            <button
              className={`btn ${modo==="sembarras" ? "btn-accent" : "btn-outline"}`}
              style={{ flex:1, borderStyle: modo!=="sembarras" ? "dashed" : "solid", color: modo!=="sembarras" ? "var(--info)" : undefined, borderColor: modo!=="sembarras" ? "var(--info)" : undefined }}
              onClick={entrarSemBarras}
            >
              🏷️ SEM BARRAS
            </button>
          </div>

          {/* Modo scanner */}
          {modo === "scanner" && (
            <>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <input className="form-input" inputMode="numeric" placeholder="Código de barras..." value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key==="Enter" && buscarPorCodigo(manual)} style={{ flex:1 }} />
                <button className="btn btn-outline" onClick={() => buscarPorCodigo(manual)} disabled={loading || !manual}>{loading ? <span className="spinner" /> : "BUSCAR"}</button>
              </div>
              <button className="btn-scan" onClick={() => setScanner(true)}>📷 ESCANEAR CÓDIGO</button>
              {found && <ProdutoCard p={found} />}
            </>
          )}

          {/* Modo sem barras */}
          {modo === "sembarras" && (
            <>
              {loadData
                ? <div className="empty"><span className="spinner" /></div>
                : (
                  <>
                    <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:14 }}>
                      Selecione o produto e confirme a saída de <strong style={{ color:"var(--accent)" }}>1 unidade</strong>.
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
                      <select className="form-select" value={prodSel} onChange={e => setProdSel(e.target.value)}>
                        <option value="">Selecionar produto...</option>
                        {prodsFiltrados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                      </select>
                    </div>
                    {prodEncontrado && <ProdutoCard p={prodEncontrado} />}
                    {prodSel && !prodEncontrado && (
                      <div className="err-msg">⚠ Produto "{prodSel}" não encontrado no estoque.</div>
                    )}
                  </>
                )}
            </>
          )}
        </div>
      )}
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

  const filtered = products.filter(p =>
    (p.nome || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria || "").toLowerCase().includes(search.toLowerCase())
  ).map(p => ({ ...p, _st: getStatus(p.quantidade || 0, thresh) }));

  const del = async (p) => {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    setLoadId(p.id);
    try { await deleteDoc(doc(db, colEst, p.id)); onDelete(); addToast(`"${p.nome}" removido.`, "success"); }
    catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoadId(null); }
  };

  return (
    <div>
      <div className="page-hd"><div className="page-title">INVENTÁRIO</div><div className="page-sub">{products.length} produtos · {SETORES[setor].label}</div></div>
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Produtos</div>
          <input className="form-input" style={{ width:180, margin:0, padding:"9px 12px", fontSize:12 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="product-list">
          {filtered.length === 0
            ? <div className="empty">Nenhum produto encontrado.</div>
            : filtered.sort((a, b) => (a.quantidade || 0) - (b.quantidade || 0)).map(p => (
              <div key={p.id} className="product-card">
                <div className="product-card-info">
                  <div className="product-card-name">{p.nome}</div>
                  <div className="product-card-cat">{p.categoria}</div>
                </div>
                <div className="product-card-right">
                  <div className="product-qty" style={{ color:statusColor(p._st) }}>{p.quantidade || 0}</div>
                  <StatusBar qtd={p.quantidade || 0} thresh={thresh} />
                  {statusLabel(p._st)}
                </div>
                <button className="btn-icon-sm" onClick={() => del(p)} disabled={loadId === p.id} style={{ marginLeft:6 }}>
                  {loadId === p.id ? <span className="spinner" /> : "🗑"}
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
  const [logs, setLogs] = useState([]), [loading, setLoading] = useState(true), [filtro, setFiltro] = useState("todos");
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const snap = await getDocs(query(collection(db, getCol(setor, "log")), orderBy("ts", "desc"), limit(200))); setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
      catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
    })();
  }, [setor]);
  const filtered = filtro === "todos" ? logs : logs.filter(l => l.tipo === filtro);
  return (
    <div>
      <div className="page-hd"><div className="page-title">LOG</div><div className="page-sub">Histórico — {SETORES[setor].label}</div></div>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["todos","Todos"],["entrada","↑ Entrada"],["saida","↓ Saída"],["config","⚙ Config"]].map(([f, label]) => (
          <button key={f} className={`btn ${filtro === f ? "btn-accent" : "btn-outline"}`} onClick={() => setFiltro(f)} style={{ fontSize:11, padding:"8px 12px", textTransform:"uppercase" }}>{label}</button>
        ))}
        <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", alignSelf:"center", marginLeft:4 }}>{filtered.length} reg.</span>
      </div>
      <div className="table-card">
        {loading ? <div className="empty"><span className="spinner" /></div> :
          filtered.length === 0 ? <div className="empty">Nenhum registro.</div> :
            filtered.map(l => (
              <div key={l.id} className="log-entry">
                <div><div className={`log-dot ${l.tipo === "entrada" ? "in" : l.tipo === "saida" ? "out" : "config"}`} /></div>
                <div>
                  <div className="log-action">
                    {l.tipo === "entrada" && <><span className="badge badge-in" style={{ marginRight:6 }}>↑</span>{l.quantidade}x {l.produto} {l.barcode && l.barcode !== "—" && <span style={{ color:"var(--text-dim)", fontSize:10 }}>· {l.barcode}</span>}</>}
                    {l.tipo === "saida"   && <><span className="badge badge-out" style={{ marginRight:6 }}>↓</span>1x {l.produto}</>}
                    {l.tipo === "config"  && <><span className="badge" style={{ marginRight:6, color:"var(--info)", borderColor:"var(--info)" }}>⚙</span>{l.descricao}</>}
                  </div>
                  <div className="log-detail">{l.categoria && `${l.categoria} · `}{l.usuario}</div>
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
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setLogs([]); }
      finally { setLoading(false); }
    })();
  }, [setor]);

  // Filtra por período
  const agora = Date.now();
  const periodos = { semana: 7, mes: 30, trimestre: 90, ano: 365 };
  const diasFiltro = periodos[periodo] || 7;
  const filtrados = logs.filter(l => {
    const ts = l.ts?.toDate ? l.ts.toDate().getTime() : 0;
    return (agora - ts) <= diasFiltro * 86400000;
  });

  // Ranking: produtos que mais saíram
  const rankMap = {};
  filtrados.forEach(l => {
    const k = l.produto || "?";
    if (!rankMap[k]) rankMap[k] = { nome: k, categoria: l.categoria || "—", total: 0 };
    rankMap[k].total += (l.quantidade || 1);
  });
  const ranking = Object.values(rankMap).sort((a, b) => b.total - a.total).slice(0, 10);
  const maxRank = ranking[0]?.total || 1;

  // Giro por sub-período (últimos 7 blocos)
  const blocos = Array.from({ length: 7 }, (_, i) => {
    const fim = agora - i * (diasFiltro / 7) * 86400000;
    const ini = fim - (diasFiltro / 7) * 86400000;
    const total = filtrados.filter(l => {
      const ts = l.ts?.toDate ? l.ts.toDate().getTime() : 0;
      return ts >= ini && ts < fim;
    }).reduce((a, l) => a + (l.quantidade || 1), 0);
    const label = new Date(ini).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
    return { label, total };
  }).reverse();
  const maxBarra = Math.max(...blocos.map(b => b.total), 1);

  // Produtos parados (no estoque, sem saída no período)
  const nomesComSaida = new Set(filtrados.map(l => l.produto));
  const parados = products
    .filter(p => p.quantidade > 0 && !nomesComSaida.has(p.nome))
    .map(p => {
      const ue = p.ultimaEntrada ? new Date(p.ultimaEntrada) : null;
      const dias = ue ? Math.floor((agora - ue.getTime()) / 86400000) : null;
      return { ...p, diasParado: dias };
    })
    .sort((a, b) => (b.diasParado || 999) - (a.diasParado || 999))
    .slice(0, 8);

  // Tempo médio em estoque (estimativa por produto: entradas vs saídas)
  const entradaLogs = [];
  (async () => {})(); // só para estrutura — usamos products.criadoEm como proxy
  const tempoMedio = products
    .filter(p => nomesComSaida.has(p.nome))
    .map(p => {
      const entrada = p.ultimaEntrada ? new Date(p.ultimaEntrada).getTime() : 0;
      const saidas = filtrados.filter(l => l.produto === p.nome);
      if (!saidas.length || !entrada) return null;
      const ultimaSaida = Math.max(...saidas.map(l => l.ts?.toDate ? l.ts.toDate().getTime() : 0));
      return { nome: p.nome, categoria: p.categoria, dias: Math.max(0, Math.floor((ultimaSaida - entrada) / 86400000)) };
    })
    .filter(Boolean)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 6);

  const totalSaidas = filtrados.reduce((a, l) => a + (l.quantidade || 1), 0);
  const totalEntradas = logs.filter(l => l.tipo !== "saida").length; // proxy

  if (loading) return <div className="empty"><span className="spinner" style={{ width:28, height:28, borderWidth:3 }} /></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">ANALYTICS</div>
        <div className="page-sub">Giro e desempenho — {SETORES[setor].label}</div>
      </div>

      {/* Período */}
      <div className="period-tabs">
        {[["semana","7D"],["mes","30D"],["trimestre","90D"],["ano","1A"]].map(([p, label]) => (
          <button key={p} className={`ptab ${periodo === p ? "active" : ""}`} onClick={() => setPeriodo(p)}>{label}</button>
        ))}
      </div>

      {/* Stats rápidos */}
      <div className="stats-grid" style={{ marginBottom:18 }}>
        <div className="stat-card" style={{ "--c":"var(--danger)" }}>
          <div className="stat-label">Saídas</div>
          <div className="stat-value" style={{ color:"var(--danger)" }}>{totalSaidas}</div>
          <div className="stat-sub">no período</div>
        </div>
        <div className="stat-card" style={{ "--c":"var(--accent)" }}>
          <div className="stat-label">Produtos</div>
          <div className="stat-value" style={{ color:"var(--accent)" }}>{ranking.length}</div>
          <div className="stat-sub">com saída</div>
        </div>
        <div className="stat-card" style={{ "--c":"var(--warn)" }}>
          <div className="stat-label">Parados</div>
          <div className="stat-value" style={{ color:"var(--warn)" }}>{parados.length}</div>
          <div className="stat-sub">sem saída</div>
        </div>
        <div className="stat-card" style={{ "--c":"var(--success)" }}>
          <div className="stat-label">Média/dia</div>
          <div className="stat-value" style={{ color:"var(--success)", fontSize:28 }}>
            {diasFiltro > 0 ? (totalSaidas / diasFiltro).toFixed(1) : "0"}
          </div>
          <div className="stat-sub">unidades</div>
        </div>
      </div>

      {/* Gráfico de barras — giro no período */}
      <div className="table-card" style={{ marginBottom:16 }}>
        <div className="table-card-header">
          <div className="table-card-title">GIRO NO PERÍODO</div>
          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>saídas por bloco de tempo</span>
        </div>
        <div style={{ padding:"16px 16px 8px" }}>
          <div className="bar-chart">
            {blocos.map((b, i) => (
              <div key={i} className="bar-col">
                <div className="bar-val">{b.total > 0 ? b.total : ""}</div>
                <div
                  className="bar-fill"
                  style={{
                    height: `${Math.max(4, (b.total / maxBarra) * 60)}px`,
                    background: b.total === 0 ? "var(--border2)" : `hsl(${38 + (b.total/maxBarra)*20},90%,${55 - (b.total/maxBarra)*15}%)`,
                  }}
                />
                <div className="bar-label">{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div className="table-card" style={{ marginBottom:16 }}>
        <div className="table-card-header">
          <div className="table-card-title">🏆 RANKING — MAIS VENDIDOS</div>
          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>por saídas</span>
        </div>
        {ranking.length === 0
          ? <div className="empty">Sem saídas no período.</div>
          : ranking.map((r, i) => (
            <div key={r.nome} className="rank-row">
              <div className={`rank-num ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i + 1}</div>
              <div className="rank-info">
                <div className="rank-name">{r.nome}</div>
                <div className="rank-cat">{r.categoria}</div>
              </div>
              <div className="rank-bar-wrap">
                <div className="rank-bar-track">
                  <div className="rank-bar-fill" style={{ width:`${(r.total/maxRank)*100}%`, background: i===0?"var(--success)":i===1?"var(--info)":i===2?"var(--accent)":"var(--border2)" }} />
                </div>
                <div className="rank-val" style={{ color: i===0?"var(--success)":i===1?"var(--info)":i===2?"var(--accent)":"var(--text)" }}>{r.total}</div>
                <div className="rank-sub">saídas</div>
              </div>
            </div>
          ))}
      </div>

      {/* Tempo médio em estoque */}
      {tempoMedio.length > 0 && (
        <div className="table-card" style={{ marginBottom:16 }}>
          <div className="table-card-header">
            <div className="table-card-title">⏱ TEMPO MÉDIO EM ESTOQUE</div>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>entrada → saída</span>
          </div>
          {tempoMedio.map(t => (
            <div key={t.nome} className="alert-row">
              <div className="alert-days" style={{ color: t.dias <= 3 ? "var(--success)" : t.dias <= 14 ? "var(--warn)" : "var(--danger)" }}>
                {t.dias}
              </div>
              <div className="alert-info">
                <div className="alert-name">{t.nome}</div>
                <div className="alert-sub">{t.categoria} · {t.dias} dias até sair</div>
              </div>
              <div style={{ fontFamily:"var(--mono)", fontSize:9, color: t.dias<=3?"var(--success)":t.dias<=14?"var(--warn)":"var(--danger)", letterSpacing:1, textTransform:"uppercase" }}>
                {t.dias<=3?"RÁPIDO":t.dias<=14?"MÉDIO":"LENTO"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Produtos parados */}
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">🧊 PRODUTOS PARADOS</div>
          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>sem saída no período</span>
        </div>
        {parados.length === 0
          ? <div className="empty">Todos os produtos tiveram saída! 🎉</div>
          : parados.map(p => (
            <div key={p.id} className="alert-row">
              <div className="alert-days" style={{ color:"var(--warn)" }}>
                {p.diasParado != null ? p.diasParado : "?"}
              </div>
              <div className="alert-info">
                <div className="alert-name">{p.nome}</div>
                <div className="alert-sub">{p.categoria} · {p.diasParado != null ? `${p.diasParado} dias em estoque` : "Data desconhecida"}</div>
              </div>
              <div className="alert-qty" style={{ color:"var(--text-dim)" }}>{p.quantidade}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [user, setUser] = useState(null), [setor, setSetor] = useState(null);
  const [tab, setTab] = useState("dashboard"), [products, setProducts] = useState([]);
  const [toasts, setToasts] = useState([]), [loadingP, setLoadingP] = useState(false);
  const [thresh, setThresh] = useState(DEFAULT_THRESH);

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
    try { const snap = await getDocs(collection(db, getCol(key, "produtos"))); setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoadingP(false); }
  }, [setor, addToast]);

  useEffect(() => { if (user && setor) { loadProducts(setor); loadThresh(setor); } }, [user, setor]);

  const logout = async () => { await signOut(auth); setUser(null); setSetor(null); setTab("dashboard"); setProducts([]); };
  const selectSetor = (k) => { setSetor(k); setTab("dashboard"); setProducts([]); setThresh(DEFAULT_THRESH); };
  const back = () => { setSetor(null); setTab("dashboard"); setProducts([]); };

  if (!user) return <><style>{styles}</style><LoginScreen onLogin={setUser} /><Toast toasts={toasts} /></>;
  if (!setor) return (
    <><style>{styles}</style>
    <div className="app">
      <header className="header">
        <div className="header-logo">PARK</div>
        <div className="header-right"><span className="header-email">{user.email}</span><button className="hbtn danger" onClick={logout}>SAIR</button></div>
      </header>
      <SetorScreen user={user} onSelect={selectSetor} />
    </div>
    <Toast toasts={toasts} /></>
  );

  const s = SETORES[setor];
  const navItems = [
    { id: "dashboard",  icon: "▦",  label: "Home"      },
    { id: "entrada",    icon: "↑",  label: "Entrada"   },
    { id: "saida",      icon: "↓",  label: "Saída"     },
    { id: "inventario", icon: "≡",  label: "Estoque"   },
    { id: "analytics",  icon: "📊", label: "Analytics" },
    { id: "log",        icon: "📋", label: "Log"       },
    { id: "config",     icon: "⚙",  label: "Config"    },
  ];
  const navGroups = [
    { group: "GERAL",     items: [navItems[0]] },
    { group: "MOVIMENT.", items: [navItems[1], navItems[2]] },
    { group: "CONTROLE",  items: [navItems[3], navItems[4]] },
    { group: "SISTEMA",   items: [navItems[5], navItems[6]] },
  ];

  return (
    <><style>{styles}</style>
    <div className="app">
      <header className="header">
        <div className="header-logo"><span>{s.icon}</span> PARK <span className="setor-tag" style={{ borderColor:s.color, color:s.color }}>{s.label}</span></div>
        <div className="header-right">
          <span className="header-email">{user.email}</span>
          <button className="hbtn" onClick={back}>← Setores</button>
          <button className="hbtn danger" onClick={logout}>Sair</button>
        </div>
      </header>
      <div className="main-layout">
        <nav className="sidebar">
          <div className="sidebar-setor">
            <div className="sidebar-setor-label">Setor ativo</div>
            <div className="sidebar-setor-name" style={{ color:s.color }}>{s.icon} {s.label}</div>
          </div>
          <div className="sidebar-nav">
            {navGroups.map(g => (
              <div key={g.group}>
                <div className="sidebar-group">{g.group}</div>
                {g.items.map(item => (
                  <div key={item.id} className={`sitem ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
                    <span className="sitem-icon">{item.icon}</span>{item.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </nav>
        <main className="content">
          {loadingP
            ? <div className="empty"><span className="spinner" style={{ width:28, height:28, borderWidth:3 }} /></div>
            : <>
              {tab === "dashboard"  && <Dashboard   setor={setor} products={products} thresh={thresh} />}
              {tab === "entrada"    && <Entrada     setor={setor} onRefresh={() => loadProducts(setor)} addToast={addToast} user={user} />}
              {tab === "saida"      && <Saida       setor={setor} onRefresh={() => loadProducts(setor)} addToast={addToast} user={user} />}
              {tab === "inventario" && <Inventario  setor={setor} products={products} onDelete={() => loadProducts(setor)} addToast={addToast} thresh={thresh} />}
              {tab === "analytics"  && <Analytics   setor={setor} products={products} />}
              {tab === "log"        && <LogCompleto setor={setor} addToast={addToast} />}
              {tab === "config"     && <Configuracoes setor={setor} user={user} addToast={addToast} thresh={thresh} onThreshChange={t => setThresh(t)} />}
            </>}
        </main>
      </div>
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.map(item => (
            <div key={item.id} className={`bnav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
              <span className="bnav-icon">{item.icon}</span>
              <span className="bnav-label">{item.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </div>
    <Toast toasts={toasts} /></>
  );
}