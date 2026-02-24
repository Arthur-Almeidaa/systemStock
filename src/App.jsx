import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, deleteDoc, query, where, updateDoc, increment,
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

async function registrarLog(setor, tipo, dados) {
  await addDoc(collection(db, getCol(setor, "log")), { tipo, ...dados, ts: serverTimestamp() });
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
    --success:#4ade80; --danger:#f87171; --info:#60a5fa;
    --text:#f0f0f0; --text-dim:#777; --text-mid:#aaa;
    --mono:'IBM Plex Mono',monospace;
    --sans:'IBM Plex Sans',sans-serif;
    --display:'Bebas Neue',sans-serif;
    --r:4px;
    --header-h:56px;
    --bottom-h:62px;
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

  /* MAIN LAYOUT */
  .main-layout { display: flex; flex: 1; overflow: hidden; }

  /* SIDEBAR — desktop only */
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

  /* BOTTOM NAV — mobile only, hidden on desktop */
  .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; height: var(--bottom-h); background: var(--surface); border-top: 1px solid var(--border); z-index: 200; }
  .bottom-nav-inner { display: flex; height: 100%; align-items: stretch; padding-bottom: env(safe-area-inset-bottom, 0px); }
  .bnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; color: var(--text-dim); position: relative; -webkit-tap-highlight-color: transparent; padding: 6px 2px; }
  .bnav-item.active { color: var(--accent); }
  .bnav-item.active::after { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: var(--accent); }
  .bnav-icon { font-size: 20px; line-height: 1; }
  .bnav-label { font-family: var(--mono); font-size: 9px; letter-spacing: .5px; text-transform: uppercase; }

  /* RESPONSIVE */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .bottom-nav { display: flex; }
    .header-email { display: none; }
    .content { padding: 14px; padding-bottom: calc(var(--bottom-h) + 16px + env(safe-area-inset-bottom, 0px)); }
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
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); padding: 16px; position: relative; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--c, var(--accent)); }
  .stat-label { font-family: var(--mono); font-size: 9px; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .stat-value { font-family: var(--display); font-size: 38px; line-height: 1; }
  .stat-sub { font-family: var(--mono); font-size: 9px; color: var(--text-dim); margin-top: 4px; }

  /* TABLE CARD */
  .table-card { background: var(--surface); border: 1px solid var(--border); overflow: hidden; margin-bottom: 16px; }
  .table-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); gap: 10px; flex-wrap: wrap; }
  .table-card-title { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-mid); }

  /* PRODUCT CARD LIST — usada no inventário e dashboard */
  .product-list { display: flex; flex-direction: column; }
  .product-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); transition: background .1s; }
  .product-card:last-child { border-bottom: none; }
  .product-card:active { background: var(--surface2); }
  .product-card-info { flex: 1; min-width: 0; }
  .product-card-name { font-family: var(--sans); font-size: 14px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .product-card-cat { font-family: var(--mono); font-size: 10px; color: var(--text-dim); }
  .product-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
  .product-qty { font-family: var(--display); font-size: 28px; line-height: 1; }

  /* BADGE */
  .badge { display: inline-block; padding: 2px 8px; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; font-family: var(--mono); border-radius: var(--r); }
  .badge-ok   { color: var(--success); border-color: var(--success); background: rgba(74,222,128,.06); }
  .badge-low  { color: var(--accent);  border-color: var(--accent);  background: rgba(245,166,35,.06); }
  .badge-zero { color: var(--danger);  border-color: var(--danger);  background: rgba(248,113,113,.06); }
  .badge-in   { color: var(--success); border-color: var(--success); background: rgba(74,222,128,.06); }
  .badge-out  { color: var(--danger);  border-color: var(--danger);  background: rgba(248,113,113,.06); }

  /* CARD */
  .card { background: var(--surface); border: 1px solid var(--border); padding: 18px; margin-bottom: 14px; border-radius: var(--r); }
  .card-title { font-family: var(--display); font-size: 18px; letter-spacing: 2px; color: var(--accent); margin-bottom: 16px; }
  .err-msg { background: rgba(248,113,113,.08); border: 1px solid var(--danger); color: var(--danger); padding: 10px 14px; font-family: var(--mono); font-size: 12px; margin-top: 12px; border-radius: var(--r); }
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* SCAN BTN */
  .btn-scan { background: var(--surface2); border: 1px dashed var(--border2); color: var(--text-dim); padding: 16px; font-family: var(--mono); font-size: 13px; cursor: pointer; transition: all .2s; width: 100%; display: flex; align-items: center; gap: 8px; justify-content: center; letter-spacing: 1px; border-radius: var(--r); touch-action: manipulation; -webkit-tap-highlight-color: transparent; min-height: 52px; }
  .btn-scan:hover, .btn-scan:active { border-color: var(--accent); color: var(--accent); background: rgba(245,166,35,.05); }

  /* BATCH */
  .batch-progress { background: var(--surface2); border: 1px solid var(--border2); padding: 16px; margin-bottom: 14px; border-radius: var(--r); }
  .batch-track { height: 6px; background: var(--border2); border-radius: 3px; overflow: hidden; margin: 10px 0 8px; }
  .batch-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s ease; }
  .batch-fill.done { background: var(--success); }
  .batch-count { font-family: var(--display); font-size: 36px; color: var(--accent); line-height: 1; }
  .batch-label { font-family: var(--mono); font-size: 11px; color: var(--text-dim); margin-top: 2px; }
  .batch-list { display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; margin-top: 12px; }
  .batch-item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; background: var(--surface); border: 1px solid var(--border); font-family: var(--mono); font-size: 11px; border-radius: var(--r); }
  .batch-item .ok { color: var(--success); } .batch-item .dup { color: var(--accent); }

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
  .scanner-counter { font-family: var(--display); font-size: 20px; color: var(--success); margin-left: auto; }
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

  /* TAG */
  .tag { display: inline-flex; align-items: center; gap: 5px; background: var(--surface2); border: 1px solid var(--border2); padding: 4px 10px; font-family: var(--mono); font-size: 11px; border-radius: var(--r); }
  .tag button { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; padding: 0; line-height: 1; }
  .tag button:hover { color: var(--danger); }

  /* TOAST */
  .toast-wrap { position: fixed; bottom: calc(var(--bottom-h) + 8px); right: 12px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; max-width: calc(100vw - 24px); }
  @media (min-width: 769px) { .toast-wrap { bottom: 20px; right: 20px; } }
  .toast { padding: 11px 16px; font-family: var(--mono); font-size: 12px; border-left: 3px solid; min-width: 220px; animation: tin .3s ease; border-radius: 0 var(--r) var(--r) 0; }
  .toast-success { background: rgba(20,30,20,.97); border-color: var(--success); color: var(--success); }
  .toast-error   { background: rgba(30,15,15,.97);  border-color: var(--danger);  color: var(--danger); }
  .toast-info    { background: rgba(20,20,30,.97);  border-color: var(--info);    color: var(--info); }
  @keyframes tin { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  .empty { text-align: center; padding: 40px 20px; font-family: var(--mono); font-size: 12px; color: var(--text-dim); }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ============================================================
// SCANNER
// ============================================================
const CONFIRMS = 3;
function ScannerModal({ onScan, onClose, title, totalTarget, scannedCount }) {
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

  const resumeScanning = useCallback(() => {
    histRef.current = []; setCnt(0);
    setStatus({ msg: "Pronto — próximo código", t: "" });
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

  const handleConfirm = () => { if (!pendingConfirm) return; const code = pendingConfirm.code; setPendingConfirm(null); onScan(code); };
  const handleReject = () => { setPendingConfirm(null); resumeScanning(); };
  const handleManual = () => { if (!manual.trim()) return; setPendingConfirm({ code: manual.trim() }); setManual(""); };
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
              <div className="scan-confirm-info">{totalTarget != null && `Item ${scannedCount + 1} de ${totalTarget}`}</div>
              <div className="scan-confirm-btns">
                <button className="btn btn-success btn-lg" onClick={handleConfirm} style={{ flex: 1 }}>✓ OK</button>
                <button className="btn btn-danger" onClick={handleReject} style={{ flex: 1 }}>✕ LER DE NOVO</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="scanner-bar">
        <div className="scanner-bar-row1">
          <div className="scanner-bar-title">{title || "ESCANEAR"}</div>
          {totalTarget != null && <div className="scanner-counter">{scannedCount}/{totalTarget}</div>}
          {cams.length > 1 && (<div className="cam-row" style={{ flex: 1, marginLeft: 8 }}><label>CAM:</label><select value={selCam} onChange={e => setSelCam(e.target.value)}>{cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>)}</select></div>)}
          {!pendingConfirm && <div className="cdots">{dots.map((d, i) => <div key={i} className={`cdot ${d.done ? "done" : d.on ? "on" : ""}`} />)}</div>}
          <button className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 11 }} onClick={onClose}>✕</button>
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
function Dashboard({ setor, products }) {
  const s = SETORES[setor];
  const total = products.length;
  const totalItens = products.reduce((a, p) => a + (p.quantidade || 0), 0);
  const zerados = products.filter(p => (p.quantidade || 0) === 0).length;
  const alertas = products.filter(p => (p.quantidade || 0) <= 5);
  return (
    <div>
      <div className="page-hd"><div className="page-title">DASHBOARD</div><div className="page-sub">Setor {s.label}</div></div>
      <div className="stats-grid">
        <div className="stat-card" style={{ "--c": s.color }}><div className="stat-label">Produtos</div><div className="stat-value" style={{ color: s.color }}>{total}</div><div className="stat-sub">SKUs</div></div>
        <div className="stat-card" style={{ "--c": "var(--success)" }}><div className="stat-label">Em Estoque</div><div className="stat-value" style={{ color: "var(--success)" }}>{totalItens}</div><div className="stat-sub">unidades</div></div>
        <div className="stat-card" style={{ "--c": zerados > 0 ? "var(--danger)" : "var(--success)" }}><div className="stat-label">Zerados</div><div className="stat-value" style={{ color: zerados > 0 ? "var(--danger)" : "var(--success)" }}>{zerados}</div><div className="stat-sub">produtos</div></div>
      </div>
      {alertas.length > 0 ? (
        <div className="table-card">
          <div className="table-card-header"><div className="table-card-title">⚠ Estoque Baixo / Zerado</div></div>
          <div className="product-list">
            {alertas.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-card-info"><div className="product-card-name">{p.nome}</div><div className="product-card-cat">{p.categoria}</div></div>
                <div className="product-card-right">
                  <div className="product-qty" style={{ color: p.quantidade === 0 ? "var(--danger)" : "var(--accent)" }}>{p.quantidade}</div>
                  {p.quantidade === 0 ? <span className="badge badge-zero">ZERADO</span> : <span className="badge badge-low">BAIXO</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--success)", padding: "14px 0" }}>✓ Todos os produtos com estoque normal.</div>}
    </div>
  );
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function Configuracoes({ setor, user, addToast }) {
  const colCat = getCol(setor, "categorias"), colPadrao = getCol(setor, "produtos_padrao");
  const [cats, setCats] = useState([]), [prods, setProds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeCat, setNomeCat] = useState(""), [nomeProd, setNomeProd] = useState(""), [catProd, setCatProd] = useState("");

  const load = async () => {
    setLoading(true);
    try { const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]); setCats(sc.docs.map(d => ({ id: d.id, ...d.data() }))); setProds(sp.docs.map(d => ({ id: d.id, ...d.data() }))); }
    catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [setor]);

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

  if (loading) return <div className="empty"><span className="spinner" /></div>;
  return (
    <div>
      <div className="page-hd"><div className="page-title">CONFIG</div><div className="page-sub">Categorias e produtos — {SETORES[setor].label}</div></div>
      <div className="card">
        <div className="card-title">CATEGORIAS</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input className="form-input" placeholder="Nova categoria..." value={nomeCat} onChange={e => setNomeCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()} style={{ flex: 1 }} />
          <button className="btn btn-accent" onClick={addCat} style={{ padding: "12px 16px" }}>+</button>
        </div>
        {cats.length === 0 ? <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>Nenhuma categoria.</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cats.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{c.nome}</span>
                <button className="btn-icon-sm" onClick={() => delCat(c)}>🗑</button>
              </div>
            ))}
          </div>}
      </div>
      <div className="card">
        <div className="card-title">PRODUTOS PADRÃO</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <select className="form-select" value={catProd} onChange={e => setCatProd(e.target.value)}>
            <option value="">Selecionar categoria...</option>
            {cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="form-input" placeholder="Nome do produto..." value={nomeProd} onChange={e => setNomeProd(e.target.value)} onKeyDown={e => e.key === "Enter" && addProd()} style={{ flex: 1 }} />
            <button className="btn btn-accent" onClick={addProd} style={{ padding: "12px 16px" }}>+</button>
          </div>
        </div>
        {prods.length === 0 ? <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>Nenhum produto padrão.</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {cats.map(c => { const ps = prods.filter(p => p.categoria === c.nome); if (!ps.length) return null; return (
              <div key={c.id}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-dim)", letterSpacing: 2, textTransform: "uppercase", padding: "8px 0 4px" }}>{c.nome}</div>
                {ps.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r)", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.nome}</span>
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
// ENTRADA — lote contínuo
// ============================================================
function Entrada({ setor, onRefresh, addToast, user }) {
  const colEst = getCol(setor, "produtos"), colCat = getCol(setor, "categorias"), colPadrao = getCol(setor, "produtos_padrao");
  const [cats, setCats] = useState([]), [padrao, setPadrao] = useState([]);
  const [catSel, setCatSel] = useState(""), [prodSel, setProdSel] = useState("");
  const [qtdTotal, setQtdTotal] = useState(1);
  const [batchAtivo, setBatchAtivo] = useState(false), [scannedItems, setScannedItems] = useState([]);
  const [scanner, setScanner] = useState(false), [loading, setLoading] = useState(false), [loadData, setLoadData] = useState(true);

  useEffect(() => {
    (async () => {
      try { const [sc, sp] = await Promise.all([getDocs(collection(db, colCat)), getDocs(collection(db, colPadrao))]); setCats(sc.docs.map(d => ({ id: d.id, ...d.data() }))); setPadrao(sp.docs.map(d => ({ id: d.id, ...d.data() }))); }
      catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoadData(false); }
    })();
  }, [setor]);

  const prodsFiltrados = padrao.filter(p => !catSel || p.categoria === catSel);
  const qtdNum = parseInt(qtdTotal) || 1;
  const restante = qtdNum - scannedItems.length;
  const concluido = scannedItems.length >= qtdNum;

  const iniciarLote = () => { if (!prodSel) { addToast("Selecione um produto.", "error"); return; } setBatchAtivo(true); setScannedItems([]); setScanner(true); };

  const handleScanCode = useCallback(async (code) => {
    const jaEscaneado = scannedItems.find(i => i.code === code);
    const newItem = { code, dup: !!jaEscaneado, ts: Date.now() };
    const newList = [...scannedItems, newItem];
    setScannedItems(newList);
    if (jaEscaneado) { addToast(`⚠ Duplicado: ${code}`, "error"); } else { addToast(`✓ Item ${newList.length}/${qtdNum}`, "success"); }
    if (newList.length >= qtdNum) { setScanner(false); await salvarLote(newList); }
  }, [scannedItems, qtdNum, prodSel, catSel, padrao]);

  const salvarLote = async (items) => {
    setLoading(true);
    try {
      const categoriaFinal = padrao.find(p => p.nome === prodSel)?.categoria || catSel;
      const uniqueCodes = [...new Set(items.filter(i => !i.dup).map(i => i.code))];
      let foundDoc = null;
      for (const bc of uniqueCodes) { const q = query(collection(db, colEst), where("barcodes", "array-contains", bc)); const snap = await getDocs(q); if (!snap.empty) { foundDoc = snap.docs[0]; break; } }
      if (!foundDoc) { const qn = query(collection(db, colEst), where("nome", "==", prodSel)); const sn = await getDocs(qn); if (!sn.empty) foundDoc = sn.docs[0]; }
      const qtdReal = items.filter(i => !i.dup).length;
      if (foundDoc) { await updateDoc(doc(db, colEst, foundDoc.id), { quantidade: increment(qtdReal), barcodes: [...new Set([...(foundDoc.data().barcodes || []), ...uniqueCodes])] }); }
      else { await addDoc(collection(db, colEst), { nome: prodSel, categoria: categoriaFinal, barcodes: uniqueCodes, quantidade: qtdReal, criadoEm: new Date().toISOString() }); }
      await registrarLog(setor, "entrada", { produto: prodSel, categoria: categoriaFinal, quantidade: qtdReal, barcodes: uniqueCodes, usuario: user.email });
      addToast(`✓ ${qtdReal}x "${prodSel}" registradas!`, "success");
      onRefresh(); setBatchAtivo(false); setScannedItems([]);
    } catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
  };

  const cancelarLote = () => { setScanner(false); setBatchAtivo(false); setScannedItems([]); };
  const salvarParcial = () => { setScanner(false); salvarLote(scannedItems); };

  if (loadData) return <div className="empty"><span className="spinner" /></div>;
  return (
    <div>
      <div className="page-hd"><div className="page-title">ENTRADA</div><div className="page-sub">Lote — {SETORES[setor].label}</div></div>
      {cats.length === 0 && <div className="err-msg">⚠ Vá em Configurações e crie as categorias primeiro.</div>}
      {!batchAtivo && (
        <div className="card">
          <div className="card-title">CONFIGURAR ENTRADA</div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Categoria</label><select className="form-select" value={catSel} onChange={e => { setCatSel(e.target.value); setProdSel(""); }}><option value="">Todas</option>{cats.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</select></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Produto *</label><select className="form-select" value={prodSel} onChange={e => setProdSel(e.target.value)}><option value="">Selecionar...</option>{prodsFiltrados.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select></div>
          </div>
          <div className="form-group" style={{ maxWidth: 160 }}><label className="form-label">Quantidade</label><input className="form-input" type="number" inputMode="numeric" min={1} value={qtdTotal} onChange={e => setQtdTotal(e.target.value)} /></div>
          <div className="divider" />
          <button className="btn btn-accent btn-lg btn-full" onClick={iniciarLote} disabled={!prodSel || loading}>📷 INICIAR — {qtdNum} {qtdNum === 1 ? "ITEM" : "ITENS"}</button>
        </div>
      )}
      {batchAtivo && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div className="card-title" style={{ margin: 0 }}>{prodSel}</div>
            <button className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 11 }} onClick={cancelarLote}>CANCELAR</button>
          </div>
          <div className="batch-progress">
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-dim)", letterSpacing: 2, textTransform: "uppercase" }}>PROGRESSO</div>
            <div className="batch-track"><div className={`batch-fill${concluido ? " done" : ""}`} style={{ width: `${Math.min(100, (scannedItems.length / qtdNum) * 100)}%` }} /></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="batch-count" style={{ color: concluido ? "var(--success)" : "var(--accent)" }}>{scannedItems.length}</div>
              <div className="batch-label">de {qtdNum}</div>
            </div>
            {restante > 0 && !concluido && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Faltam {restante}</div>}
            {concluido && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--success)", marginTop: 4 }}>✓ Completo! Salvando...</div>}
            {scannedItems.length > 0 && (
              <div className="batch-list">
                {scannedItems.map((item, i) => (
                  <div key={i} className="batch-item">
                    <span className={item.dup ? "dup" : "ok"}>{item.dup ? "⚠" : "✓"}</span>
                    <span style={{ flex: 1 }}>{item.code}</span>
                    <span style={{ color: "var(--text-dim)", fontSize: 10 }}>#{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!concluido && !scanner && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-accent btn-lg" style={{ flex: 1, minWidth: 160 }} onClick={() => setScanner(true)} disabled={loading}>📷 {scannedItems.length === 0 ? "ABRIR CÂMERA" : `CONTINUAR (${restante})`}</button>
              {scannedItems.length > 0 && <button className="btn btn-outline" onClick={salvarParcial} disabled={loading}>SALVAR PARCIAL</button>}
            </div>
          )}
          {loading && <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-dim)", marginTop: 12 }}><span className="spinner" />Salvando...</div>}
        </div>
      )}
      {scanner && <ScannerModal title={`LOTE: ${prodSel}`} totalTarget={qtdNum} scannedCount={scannedItems.length} onScan={handleScanCode} onClose={() => setScanner(false)} />}
    </div>
  );
}

// ============================================================
// SAÍDA
// ============================================================
function Saida({ setor, onRefresh, addToast, user }) {
  const colEst = getCol(setor, "produtos");
  const [pw, setPw] = useState(""), [authOk, setAuthOk] = useState(false);
  const [scanner, setScanner] = useState(false), [found, setFound] = useState(null);
  const [loading, setLoading] = useState(false), [manual, setManual] = useState("");

  const doAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signInWithEmailAndPassword(auth, user.email, pw); setAuthOk(true); addToast("Autorizado.", "success"); }
    catch { addToast("Senha incorreta.", "error"); } finally { setLoading(false); }
  };

  const onBarcode = async (code) => {
    setScanner(false); setManual(code); setLoading(true);
    try {
      let f = null;
      const q1 = query(collection(db, colEst), where("barcodes", "array-contains", code)); const s1 = await getDocs(q1); if (!s1.empty) { const d = s1.docs[0]; f = { id: d.id, ...d.data() }; }
      if (!f) { const q2 = query(collection(db, colEst), where("barcode", "==", code)); const s2 = await getDocs(q2); if (!s2.empty) { const d = s2.docs[0]; f = { id: d.id, ...d.data() }; } }
      if (f) { setFound(f); addToast(`Encontrado: ${f.nome}`, "info"); } else { setFound(null); addToast(`Código "${code}" não encontrado.`, "error"); }
    } catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
  };

  const doSaida = async () => {
    if (!found || (found.quantidade || 0) <= 0) { addToast("Sem estoque!", "error"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, colEst, found.id), { quantidade: increment(-1) });
      await registrarLog(setor, "saida", { produto: found.nome, categoria: found.categoria, quantidade: 1, usuario: user.email });
      addToast(`✓ Saída: "${found.nome}" registrada.`, "success");
      setFound(null); setManual(""); setPw(""); setAuthOk(false); onRefresh();
    } catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-hd"><div className="page-title">SAÍDA</div><div className="page-sub">Retirada — {SETORES[setor].label}</div></div>
      {!authOk ? (
        <div className="card">
          <div className="card-title">CONFIRMAR IDENTIDADE</div>
          <form onSubmit={doAuth}>
            <div className="form-group"><label className="form-label">Administrador</label><input className="form-input" value={user.email} disabled /></div>
            <div className="form-group" style={{ marginTop: 10 }}><label className="form-label">Senha</label><input className="form-input" type="password" autoComplete="current-password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} required autoFocus /></div>
            <button className="btn btn-danger btn-lg btn-full" style={{ marginTop: 4 }} type="submit" disabled={loading}>{loading ? "VERIFICANDO..." : "CONFIRMAR"}</button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">REGISTRAR SAÍDA</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input className="form-input" inputMode="numeric" placeholder="Código de barras..." value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === "Enter" && onBarcode(manual)} style={{ flex: 1 }} />
            <button className="btn btn-outline" onClick={() => onBarcode(manual)} disabled={loading}>{loading ? <span className="spinner" /> : "OK"}</button>
          </div>
          <button className="btn-scan" onClick={() => setScanner(true)}>📷 ESCANEAR CÓDIGO</button>
          {found && (
            <div className="found-card match" style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-dim)", letterSpacing: 2, marginBottom: 8 }}>ENCONTRADO</div>
              <div className="found-name">{found.nome}</div>
              <div className="found-info">{found.categoria} · <strong style={{ color: (found.quantidade || 0) > 0 ? "var(--success)" : "var(--danger)" }}>{found.quantidade} un.</strong></div>
              {(found.quantidade || 0) > 0
                ? <button className="btn btn-success btn-lg btn-full" style={{ marginTop: 14 }} onClick={doSaida} disabled={loading}>{loading ? "REGISTRANDO..." : "✓ CONFIRMAR SAÍDA"}</button>
                : <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 12, color: "var(--danger)" }}>⚠ Estoque zerado.</div>}
            </div>
          )}
        </div>
      )}
      {scanner && <ScannerModal title="SAÍDA" onScan={onBarcode} onClose={() => setScanner(false)} />}
    </div>
  );
}

// ============================================================
// INVENTÁRIO — sem códigos visíveis, lista em card
// ============================================================
function Inventario({ setor, products, onDelete, addToast }) {
  const colEst = getCol(setor, "produtos");
  const [search, setSearch] = useState(""), [loadId, setLoadId] = useState(null);

  // Busca só por nome e categoria — sem códigos
  const filtered = products.filter(p =>
    (p.nome || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria || "").toLowerCase().includes(search.toLowerCase())
  );

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
          <input className="form-input" style={{ width: 180, margin: 0, padding: "9px 12px", fontSize: 12 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="product-list">
          {filtered.length === 0
            ? <div className="empty">Nenhum produto encontrado.</div>
            : filtered.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-card-info">
                  <div className="product-card-name">{p.nome}</div>
                  <div className="product-card-cat">{p.categoria}</div>
                </div>
                <div className="product-card-right">
                  <div className="product-qty" style={{ color: p.quantidade === 0 ? "var(--danger)" : p.quantidade <= 5 ? "var(--accent)" : "var(--success)" }}>{p.quantidade}</div>
                  {p.quantidade === 0 ? <span className="badge badge-zero">ZERADO</span> : p.quantidade <= 5 ? <span className="badge badge-low">BAIXO</span> : <span className="badge badge-ok">OK</span>}
                </div>
                <button className="btn-icon-sm" onClick={() => del(p)} disabled={loadId === p.id} style={{ marginLeft: 6 }}>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["todos", "Todos"], ["entrada", "↑ Entrada"], ["saida", "↓ Saída"], ["config", "⚙ Config"]].map(([f, label]) => (
          <button key={f} className={`btn ${filtro === f ? "btn-accent" : "btn-outline"}`} onClick={() => setFiltro(f)} style={{ fontSize: 11, padding: "8px 12px", textTransform: "uppercase" }}>{label}</button>
        ))}
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)", alignSelf: "center", marginLeft: 4 }}>{filtered.length} reg.</span>
      </div>
      <div className="table-card">
        {loading ? <div className="empty"><span className="spinner" /></div> :
          filtered.length === 0 ? <div className="empty">Nenhum registro.</div> :
            filtered.map(l => (
              <div key={l.id} className="log-entry">
                <div><div className={`log-dot ${l.tipo === "entrada" ? "in" : l.tipo === "saida" ? "out" : "config"}`} /></div>
                <div>
                  <div className="log-action">
                    {l.tipo === "entrada" && <><span className="badge badge-in" style={{ marginRight: 6 }}>↑</span>{l.quantidade}x {l.produto}</>}
                    {l.tipo === "saida" && <><span className="badge badge-out" style={{ marginRight: 6 }}>↓</span>{l.produto}</>}
                    {l.tipo === "config" && <><span className="badge" style={{ marginRight: 6, color: "var(--info)", borderColor: "var(--info)" }}>⚙</span>{l.descricao}</>}
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
// APP
// ============================================================
export default function App() {
  const [user, setUser] = useState(null), [setor, setSetor] = useState(null);
  const [tab, setTab] = useState("dashboard"), [products, setProducts] = useState([]);
  const [toasts, setToasts] = useState([]), [loadingP, setLoadingP] = useState(false);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now(); setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const loadProducts = useCallback(async (sk) => {
    const key = sk || setor; if (!key) return; setLoadingP(true);
    try { const snap = await getDocs(collection(db, getCol(key, "produtos"))); setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    catch (e) { addToast("Erro: " + e.message, "error"); } finally { setLoadingP(false); }
  }, [setor, addToast]);

  useEffect(() => { if (user && setor) loadProducts(setor); }, [user, setor]);

  const logout = async () => { await signOut(auth); setUser(null); setSetor(null); setTab("dashboard"); setProducts([]); };
  const selectSetor = (k) => { setSetor(k); setTab("dashboard"); setProducts([]); };
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
    { id: "dashboard", icon: "▦", label: "Home" },
    { id: "entrada",   icon: "↑", label: "Entrada" },
    { id: "saida",     icon: "↓", label: "Saída" },
    { id: "inventario",icon: "≡", label: "Estoque" },
    { id: "log",       icon: "📋", label: "Log" },
    { id: "config",    icon: "⚙", label: "Config" },
  ];
  const navGroups = [
    { group: "GERAL",     items: [navItems[0]] },
    { group: "MOVIMENT.", items: [navItems[1], navItems[2]] },
    { group: "CONTROLE",  items: [navItems[3], navItems[4]] },
    { group: "SISTEMA",   items: [navItems[5]] },
  ];

  return (
    <><style>{styles}</style>
    <div className="app">
      <header className="header">
        <div className="header-logo"><span>{s.icon}</span> PARK <span className="setor-tag" style={{ borderColor: s.color, color: s.color }}>{s.label}</span></div>
        <div className="header-right">
          <span className="header-email">{user.email}</span>
          <button className="hbtn" onClick={back}>← Setores</button>
          <button className="hbtn danger" onClick={logout}>Sair</button>
        </div>
      </header>
      <div className="main-layout">
        {/* Sidebar desktop */}
        <nav className="sidebar">
          <div className="sidebar-setor">
            <div className="sidebar-setor-label">Setor ativo</div>
            <div className="sidebar-setor-name" style={{ color: s.color }}>{s.icon} {s.label}</div>
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
        {/* Content */}
        <main className="content">
          {loadingP
            ? <div className="empty"><span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
            : <>
              {tab === "dashboard"  && <Dashboard setor={setor} products={products} />}
              {tab === "entrada"    && <Entrada setor={setor} onRefresh={() => loadProducts(setor)} addToast={addToast} user={user} />}
              {tab === "saida"      && <Saida setor={setor} onRefresh={() => loadProducts(setor)} addToast={addToast} user={user} />}
              {tab === "inventario" && <Inventario setor={setor} products={products} onDelete={() => loadProducts(setor)} addToast={addToast} />}
              {tab === "log"        && <LogCompleto setor={setor} addToast={addToast} />}
              {tab === "config"     && <Configuracoes setor={setor} user={user} addToast={addToast} />}
            </>}
        </main>
      </div>
      {/* Bottom nav mobile */}
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