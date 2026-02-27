

import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc,
  query, where, orderBy, serverTimestamp, updateDoc,
} from "firebase/firestore";

// ─── Firebase (mesma config do App principal) ────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBH3hxzhFe1IWyIO58wE2kcnL1lpxBy8ZM",
  authDomain: "sytemstock.firebaseapp.com",
  projectId: "sytemstock",
  storageBucket: "sytemstock.firebasestorage.app",
  messagingSenderId: "643733507908",
  appId: "1:643733507908:web:1d3bce112d337534799111",
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Setores (mesma estrutura do App principal) ──────────────
const SETORES = {
  ti:          { label:"TI",          icon:"🖥️",  color:"#3b82f6", colBase:"estoque_ti"          },
  exfood:      { label:"X-food",      icon:"🍽️",  color:"#f5a623", colBase:"estoque_exfood"      },
  limpeza:     { label:"Limpeza",     icon:"✨",  color:"#52c41a", colBase:"estoque_limpeza"     },
  ferramentas: { label:"Ferramentas", icon:"🔧",  color:"#a855f7", colBase:"estoque_ferramentas" },
};
const FERRAMENTAS_SUB = {
  fti:         { label:"Ferramentas TI",         icon:"💻", color:"#38bdf8", colBase:"estoque_ferramentas_ti"          },
  fmanutencao: { label:"Ferramentas Manutenção", icon:"🔨", color:"#fb923c", colBase:"estoque_ferramentas_manutencao"  },
};
const ALL_SETORES = { ...SETORES, fti: FERRAMENTAS_SUB.fti, fmanutencao: FERRAMENTAS_SUB.fmanutencao };

const getCol = (setorKey, type) => `${ALL_SETORES[setorKey].colBase}_${type}`;

// ─── Styles ──────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

  :root {
    --bg:#0a0a0a; --surface:#141414; --surface2:#1c1c1c;
    --border:#2a2a2a; --border2:#333;
    --accent:#f5a623; --accent2:#e85d04;
    --success:#4ade80; --danger:#f87171; --info:#60a5fa; --warn:#facc15;
    --text:#f0f0f0; --text-dim:#777; --text-mid:#aaa;
    --mono:'IBM Plex Mono',monospace; --sans:'IBM Plex Sans',sans-serif; --display:'Bebas Neue',sans-serif;
    --r:4px;
  }
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html, body { background:var(--bg); color:var(--text); font-family:var(--sans); min-height:100vh; }
  ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:var(--bg); } ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

  /* ── Layout ── */
  .req-app { min-height:100vh; display:flex; flex-direction:column; }
  .req-header { background:var(--surface); border-bottom:1px solid var(--border); height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; position:sticky; top:0; z-index:200; }
  .req-logo { font-family:var(--display); font-size:22px; letter-spacing:3px; color:var(--accent); }
  .req-badge { font-family:var(--mono); font-size:10px; letter-spacing:2px; padding:3px 10px; border:1px solid var(--border2); color:var(--text-dim); border-radius:var(--r); }
  .req-content { flex:1; padding:32px 20px; max-width:700px; margin:0 auto; width:100%; }

  /* ── Setor cards ── */
  .setor-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:24px; }
  @media(max-width:600px){ .setor-grid { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:360px){ .setor-grid { grid-template-columns:1fr; } }
  .setor-card {
    background:var(--surface); border:1px solid var(--border);
    padding:28px 16px; cursor:pointer; transition:all .22s;
    display:flex; flex-direction:column; align-items:center; gap:10px;
    position:relative; overflow:hidden; border-radius:var(--r);
    -webkit-tap-highlight-color:transparent;
  }
  .setor-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; opacity:0; transition:opacity .22s; background:var(--c,var(--accent)); }
  .setor-card:hover { transform:translateY(-3px); border-color:var(--c,var(--accent)); }
  .setor-card:hover::after { opacity:1; }
  .setor-card-icon { font-size:32px; }
  .setor-card-name { font-family:var(--display); font-size:20px; letter-spacing:2px; color:var(--c,var(--accent)); text-align:center; }
  .setor-card-sub { font-family:var(--mono); font-size:9px; color:var(--text-dim); letter-spacing:1px; }

  /* ── Ferramentas sub ── */
  .ferr-sub-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:24px; }
  @media(max-width:400px){ .ferr-sub-grid { grid-template-columns:1fr; } }

  /* ── PIN ── */
  .pin-wrap { max-width:360px; margin:0 auto; padding-top:20px; }
  .pin-title { font-family:var(--display); font-size:30px; letter-spacing:3px; margin-bottom:4px; }
  .pin-sub { font-family:var(--mono); font-size:11px; color:var(--text-dim); margin-bottom:28px; }
  .pin-display { display:flex; gap:14px; justify-content:center; margin-bottom:28px; }
  .pin-dot { width:18px; height:18px; border-radius:50%; border:2px solid var(--border2); transition:all .15s; }
  .pin-dot.filled { background:var(--accent); border-color:var(--accent); box-shadow:0 0 10px rgba(245,166,35,.4); }
  .pin-dot.error { background:var(--danger); border-color:var(--danger); animation:shake .3s; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
  .pin-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .pin-btn {
    background:var(--surface2); border:1px solid var(--border2); color:var(--text);
    font-family:var(--display); font-size:28px; letter-spacing:2px;
    padding:20px 10px; cursor:pointer; border-radius:var(--r);
    transition:all .12s; -webkit-tap-highlight-color:transparent;
    touch-action:manipulation;
  }
  .pin-btn:hover,.pin-btn:active { background:var(--surface); border-color:var(--accent); color:var(--accent); }
  .pin-btn.del { font-family:var(--mono); font-size:16px; color:var(--text-dim); }
  .pin-err { font-family:var(--mono); font-size:12px; color:var(--danger); text-align:center; margin-top:14px; min-height:20px; }

  /* ── Formulário ── */
  .form-group { margin-bottom:14px; }
  .form-label { display:block; font-family:var(--mono); font-size:10px; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-bottom:7px; }
  .form-input,.form-select,.form-textarea {
    width:100%; background:var(--surface2); border:1px solid var(--border2);
    color:var(--text); padding:13px 14px; font-family:var(--mono); font-size:14px;
    outline:none; transition:border-color .2s; border-radius:var(--r);
    -webkit-appearance:none; appearance:none;
  }
  .form-input:focus,.form-select:focus,.form-textarea:focus { border-color:var(--accent); }
  .form-textarea { resize:vertical; min-height:80px; }
  .form-select { cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:36px; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media(max-width:500px){ .form-row { grid-template-columns:1fr; } }

  /* ── Items do pedido ── */
  .items-list { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .item-row { display:flex; align-items:center; gap:8px; background:var(--surface2); border:1px solid var(--border); border-radius:var(--r); padding:10px 12px; }
  .item-info { flex:1; min-width:0; }
  .item-name { font-family:var(--sans); font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .item-cat { font-family:var(--mono); font-size:10px; color:var(--text-dim); }
  .item-qty { font-family:var(--display); font-size:22px; color:var(--accent); flex-shrink:0; min-width:36px; text-align:center; }
  .item-del { background:transparent; border:1px solid var(--border2); color:var(--text-dim); width:34px; height:34px; border-radius:var(--r); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
  .item-del:hover,.item-del:active { border-color:var(--danger); color:var(--danger); }

  /* ── Botões ── */
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 20px; font-family:var(--mono); font-size:12px; cursor:pointer; transition:all .2s; border-radius:var(--r); letter-spacing:.5px; border:1px solid transparent; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
  .btn-accent { background:var(--accent); color:#0a0a0a; border-color:var(--accent); font-weight:600; }
  .btn-accent:hover:not(:disabled),.btn-accent:active:not(:disabled) { background:var(--accent2); border-color:var(--accent2); }
  .btn-outline { background:transparent; color:var(--text-dim); border-color:var(--border2); }
  .btn-outline:hover:not(:disabled),.btn-outline:active:not(:disabled) { border-color:var(--accent); color:var(--accent); }
  .btn-success { background:var(--success); color:#0a0a0a; border-color:var(--success); font-weight:600; }
  .btn:disabled { opacity:.4; cursor:not-allowed; }
  .btn-lg { padding:14px 28px; font-size:13px; }
  .btn-full { width:100%; }
  .btn-add { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px; background:transparent; border:1px dashed var(--border2); color:var(--text-dim); font-family:var(--mono); font-size:11px; cursor:pointer; border-radius:var(--r); transition:all .2s; letter-spacing:.5px; }
  .btn-add:hover,.btn-add:active { border-color:var(--accent); color:var(--accent); }

  /* ── Cards ── */
  .card { background:var(--surface); border:1px solid var(--border); padding:20px; margin-bottom:14px; border-radius:var(--r); }
  .card-title { font-family:var(--display); font-size:20px; letter-spacing:2px; color:var(--accent); margin-bottom:16px; }
  .err-msg { background:rgba(248,113,113,.08); border:1px solid var(--danger); color:var(--danger); padding:10px 14px; font-family:var(--mono); font-size:12px; margin-top:12px; border-radius:var(--r); }
  .success-box { text-align:center; padding:40px 20px; }
  .success-icon { font-size:56px; margin-bottom:16px; }
  .success-title { font-family:var(--display); font-size:38px; letter-spacing:4px; color:var(--success); margin-bottom:8px; }
  .success-sub { font-family:var(--mono); font-size:12px; color:var(--text-dim); margin-bottom:8px; }
  .success-code { font-family:var(--display); font-size:28px; color:var(--accent); letter-spacing:3px; margin-top:10px; }
  .divider { height:1px; background:var(--border); margin:16px 0; }
  .page-hd { margin-bottom:22px; }
  .page-title { font-family:var(--display); font-size:34px; letter-spacing:4px; }
  .page-sub { font-family:var(--mono); font-size:11px; color:var(--text-dim); margin-top:3px; }
  .spinner { display:inline-block; width:14px; height:14px; border:2px solid var(--border2); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .back-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2); color:var(--text-dim); padding:7px 14px; font-family:var(--mono); font-size:11px; cursor:pointer; border-radius:var(--r); transition:all .15s; margin-bottom:20px; }
  .back-btn:hover { border-color:var(--accent); color:var(--accent); }
  .selected-setor-bar { display:flex; align-items:center; gap:10px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:10px 16px; margin-bottom:20px; }
  .selected-setor-icon { font-size:20px; }
  .selected-setor-name { font-family:var(--display); font-size:20px; letter-spacing:2px; }
  .qty-controls { display:flex; align-items:center; gap:8px; }
  .qty-btn { background:var(--surface); border:1px solid var(--border2); color:var(--text); width:36px; height:36px; border-radius:var(--r); cursor:pointer; font-family:var(--display); font-size:18px; display:flex; align-items:center; justify-content:center; transition:all .15s; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
  .qty-btn:hover,.qty-btn:active { border-color:var(--accent); color:var(--accent); }
  .qty-val { font-family:var(--display); font-size:22px; min-width:32px; text-align:center; }

  /* ── Toast ── */
  .toast-wrap { position:fixed; bottom:20px; right:16px; z-index:9999; display:flex; flex-direction:column; gap:6px; max-width:calc(100vw - 32px); }
  .toast { padding:11px 16px; font-family:var(--mono); font-size:12px; border-left:3px solid; min-width:200px; animation:tin .3s ease; border-radius:0 var(--r) var(--r) 0; display:flex; align-items:center; gap:8px; }
  .toast-success { background:rgba(20,30,20,.97); border-color:var(--success); color:var(--success); }
  .toast-error   { background:rgba(30,15,15,.97);  border-color:var(--danger);  color:var(--danger); }
  .toast-info    { background:rgba(20,20,30,.97);  border-color:var(--info);    color:var(--info); }
  @keyframes tin { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }

  /* ── Add item modal ── */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:500; display:flex; align-items:flex-end; justify-content:center; padding:0; }
  @media(min-width:600px){ .modal-overlay { align-items:center; padding:20px; } }
  .modal-box { background:var(--surface); border:1px solid var(--border2); width:100%; max-width:500px; max-height:80vh; display:flex; flex-direction:column; border-radius:8px 8px 0 0; }
  @media(min-width:600px){ .modal-box { border-radius:var(--r); } }
  .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .modal-title { font-family:var(--display); font-size:20px; letter-spacing:2px; color:var(--accent); }
  .modal-close { background:transparent; border:1px solid var(--border); color:var(--text-dim); width:34px; height:34px; border-radius:var(--r); cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .modal-body { overflow-y:auto; padding:16px 20px; flex:1; }
  .modal-footer { padding:14px 20px; border-top:1px solid var(--border); flex-shrink:0; }
  .cat-filter { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
  .cat-chip { background:transparent; border:1px solid var(--border2); color:var(--text-dim); padding:5px 12px; font-family:var(--mono); font-size:10px; cursor:pointer; border-radius:20px; transition:all .15s; white-space:nowrap; }
  .cat-chip:hover,.cat-chip:active { border-color:var(--accent); color:var(--accent); }
  .cat-chip.active { background:var(--accent); color:#0a0a0a; border-color:var(--accent); }
  .prod-item { display:flex; align-items:center; justify-content:space-between; padding:11px 12px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .1s; -webkit-tap-highlight-color:transparent; }
  .prod-item:last-child { border-bottom:none; }
  .prod-item:hover,.prod-item:active { background:var(--surface2); }
  .prod-item.selected { background:rgba(245,166,35,.06); }
  .prod-name { font-family:var(--sans); font-size:13px; font-weight:600; }
  .prod-cat { font-family:var(--mono); font-size:10px; color:var(--text-dim); }
  .prod-check { width:22px; height:22px; border-radius:50%; border:2px solid var(--border2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .prod-check.on { background:var(--accent); border-color:var(--accent); }
  .empty { text-align:center; padding:30px 20px; font-family:var(--mono); font-size:12px; color:var(--text-dim); }

  /* ── Histórico ── */
  .hist-item { padding:12px 16px; border-bottom:1px solid var(--border); }
  .hist-item:last-child { border-bottom:none; }
  .hist-code { font-family:var(--display); font-size:18px; letter-spacing:2px; color:var(--accent); }
  .hist-date { font-family:var(--mono); font-size:10px; color:var(--text-dim); }
  .hist-items { font-family:var(--mono); font-size:11px; color:var(--text-mid); margin-top:4px; }
  .status-badge { display:inline-block; padding:2px 8px; font-size:9px; letter-spacing:1px; text-transform:uppercase; border:1px solid; font-family:var(--mono); border-radius:var(--r); }
  .s-pendente  { color:var(--warn);    border-color:var(--warn);    background:rgba(250,204,21,.06); }
  .s-aprovado  { color:var(--success); border-color:var(--success); background:rgba(74,222,128,.06); }
  .s-recusado  { color:var(--danger);  border-color:var(--danger);  background:rgba(248,113,113,.06); }
  .s-entregue  { color:var(--info);    border-color:var(--info);    background:rgba(96,165,250,.06); }
`;

// ─── Helpers ─────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR");
};
const genCodigo = () => "REQ-" + Date.now().toString(36).toUpperCase().slice(-5);

// ─── Toast ───────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  return { toasts, add };
}
const ToastEl = ({ toasts }) => (
  <div className="toast-wrap">
    {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
  </div>
);

// ─── PIN ─────────────────────────────────────────────────────
function PinScreen({ setor, setorKey, onSuccess, onBack }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const press = (d) => { if (pin.length < 4) setPin(p => p + d); };
  const del = () => setPin(p => p.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) verify();
  }, [pin]);

  const verify = async () => {
    setLoading(true);
    try {
      const configRef = doc(db, getCol(setorKey, "config"), "requisicao_config");
      const snap = await getDoc(configRef);
      if (!snap.exists()) {
        // Sem PIN configurado — aceitar qualquer
        onSuccess();
        return;
      }
      const data = snap.data();
      if (!data.pin || data.pin === pin) {
        onSuccess();
      } else {
        setShake(true);
        setErr("Senha incorreta. Tente novamente.");
        setTimeout(() => { setPin(""); setShake(false); setErr(""); }, 1000);
      }
    } catch {
      // Em caso de erro de permissão, liberar (sem PIN)
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"];

  return (
    <div className="pin-wrap">
      <div className="page-hd">
        <div className="page-title" style={{ color: setor.color }}>ACESSO</div>
        <div className="page-sub">{setor.icon} {setor.label} — Digite a senha</div>
      </div>
      <div className="pin-display">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`pin-dot ${pin.length > i ? (shake ? "error" : "filled") : ""}`} />
        ))}
      </div>
      <div className="pin-grid">
        {digits.map((d, i) => {
          if (d === null) return <div key={i} />;
          if (d === "del") return (
            <button key={i} className="pin-btn del" onClick={del} disabled={loading}>⌫</button>
          );
          return (
            <button key={i} className="pin-btn" onClick={() => press(String(d))} disabled={loading || pin.length === 4}>
              {d}
            </button>
          );
        })}
      </div>
      <div className="pin-err">{err}</div>
      {loading && <div style={{ textAlign: "center", marginTop: 8 }}><span className="spinner" /></div>}
    </div>
  );
}

// ─── Modal de seleção de produto ─────────────────────────────
function AddItemModal({ setorKey, onAdd, onClose, jaAdicionados }) {
  const [cats, setCats] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [catFiltro, setCatFiltro] = useState("");
  const [qtd, setQtd] = useState(1);
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [sc, sp] = await Promise.all([
          getDocs(collection(db, getCol(setorKey, "categorias"))),
          getDocs(collection(db, getCol(setorKey, "produtos_padrao"))),
        ]);
        setCats(sc.docs.map(d => ({ id: d.id, ...d.data() })));
        setProdutos(sp.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { }
      finally { setLoading(false); }
    })();
  }, [setorKey]);

  const filtrados = produtos
    .filter(p => !catFiltro || p.categoria === catFiltro)
    .filter(p => !search.trim() || p.nome.toLowerCase().includes(search.toLowerCase()))
    .filter(p => !jaAdicionados.some(j => j.nome === p.nome));

  const confirmar = () => {
    if (!sel) return;
    onAdd({ nome: sel.nome, categoria: sel.categoria, quantidade: qtd });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">ADICIONAR ITEM</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? <div className="empty"><span className="spinner" /></div> : (
            <>
              <div style={{ marginBottom: 10 }}>
                <input
                  className="form-input"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
              </div>
              {cats.length > 0 && (
                <div className="cat-filter">
                  <button className={`cat-chip ${catFiltro === "" ? "active" : ""}`} onClick={() => setCatFiltro("")}>Todos</button>
                  {cats.map(c => (
                    <button key={c.id} className={`cat-chip ${catFiltro === c.nome ? "active" : ""}`} onClick={() => setCatFiltro(c.nome)}>{c.nome}</button>
                  ))}
                </div>
              )}
              {filtrados.length === 0
                ? <div className="empty">Nenhum produto disponível.</div>
                : filtrados.map(p => (
                  <div key={p.id} className={`prod-item ${sel?.id === p.id ? "selected" : ""}`} onClick={() => { setSel(p); setQtd(1); }}>
                    <div>
                      <div className="prod-name">{p.nome}</div>
                      <div className="prod-cat">{p.categoria}</div>
                    </div>
                    <div className={`prod-check ${sel?.id === p.id ? "on" : ""}`}>
                      {sel?.id === p.id && <span style={{ color: "#0a0a0a", fontSize: 12 }}>✓</span>}
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
        <div className="modal-footer">
          {sel && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)", flex: 1 }}>Qtd: {sel.nome}</span>
              <div className="qty-controls">
                <button className="qty-btn" onClick={() => setQtd(q => Math.max(1, q - 1))}>−</button>
                <div className="qty-val">{qtd}</div>
                <button className="qty-btn" onClick={() => setQtd(q => q + 1)}>+</button>
              </div>
            </div>
          )}
          <button className="btn btn-accent btn-full btn-lg" onClick={confirmar} disabled={!sel}>
            ADICIONAR {sel ? `"${sel.nome}" (${qtd}x)` : "ITEM"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulário de Requisição ─────────────────────────────────
function FormRequisicao({ setorKey, setor, user, onBack, toast }) {
  const [itens, setItens] = useState([]);
  const [obs, setObs] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(null);

  const remover = (idx) => setItens(p => p.filter((_, i) => i !== idx));

  const enviar = async () => {
    if (itens.length === 0) { toast("Adicione pelo menos um item.","error"); return; }
    if (!solicitante.trim()) { toast("Informe o nome do solicitante.","error"); return; }
    setLoading(true);
    try {
      const codigo = genCodigo();
      const ref = await addDoc(collection(db, getCol(setorKey, "requisicoes")), {
        codigo,
        setor: setorKey,
        setorLabel: setor.label,
        solicitante: solicitante.trim(),
        itens,
        observacao: obs.trim(),
        status: "pendente",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      setEnviado({ codigo, id: ref.id });
      toast("Requisição enviada com sucesso!","success");
    } catch (e) {
      toast("Erro ao enviar: " + e.message,"error");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="card">
        <div className="success-box">
          <div className="success-icon">✅</div>
          <div className="success-title">ENVIADO!</div>
          <div className="success-sub">Sua requisição foi registrada com sucesso.</div>
          <div className="success-sub">Código de rastreio:</div>
          <div className="success-code">{enviado.codigo}</div>
          <div style={{ marginTop: 28 }}>
            <button className="btn btn-outline btn-lg" onClick={onBack}>NOVA REQUISIÇÃO</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="selected-setor-bar">
        <span className="selected-setor-icon">{setor.icon}</span>
        <span className="selected-setor-name" style={{ color: setor.color }}>{setor.label}</span>
      </div>

      <div className="card">
        <div className="card-title">NOVA REQUISIÇÃO</div>

        <div className="form-group">
          <label className="form-label">Solicitante *</label>
          <input className="form-input" placeholder="Seu nome..." value={solicitante} onChange={e => setSolicitante(e.target.value)} />
        </div>

        <div className="divider" />

        <label className="form-label" style={{ marginBottom: 10, display: "block" }}>Itens Solicitados *</label>
        {itens.length === 0
          ? <div className="empty" style={{ border: "1px dashed var(--border2)", borderRadius: "var(--r)", marginBottom: 10 }}>Nenhum item adicionado ainda.</div>
          : (
            <div className="items-list">
              {itens.map((item, i) => (
                <div key={i} className="item-row">
                  <div className="item-info">
                    <div className="item-name">{item.nome}</div>
                    <div className="item-cat">{item.categoria}</div>
                  </div>
                  <div className="item-qty">{item.quantidade}x</div>
                  <button className="item-del" onClick={() => remover(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
        <button className="btn-add" onClick={() => setShowModal(true)}>+ ADICIONAR ITEM</button>

        <div className="divider" />

        <div className="form-group">
          <label className="form-label">Observações <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(opcional)</span></label>
          <textarea className="form-textarea" placeholder="Urgência, local de entrega, etc..." value={obs} onChange={e => setObs(e.target.value)} />
        </div>

        <button className="btn btn-accent btn-lg btn-full" onClick={enviar} disabled={loading || itens.length === 0}>
          {loading ? <><span className="spinner" /> ENVIANDO...</> : `📤 ENVIAR REQUISIÇÃO (${itens.length} ${itens.length === 1 ? "item" : "itens"})`}
        </button>
      </div>

      {showModal && (
        <AddItemModal
          setorKey={setorKey}
          onAdd={item => setItens(p => [...p, item])}
          onClose={() => setShowModal(false)}
          jaAdicionados={itens}
        />
      )}
    </div>
  );
}

// ─── Histórico de requisições ─────────────────────────────────
function HistoricoRequisicoes({ setorKey, setor }) {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await getDocs(query(
          collection(db, getCol(setorKey, "requisicoes")),
          orderBy("criadoEm", "desc")
        ));
        setReqs(s.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setReqs([]); }
      finally { setLoading(false); }
    })();
  }, [setorKey]);

  const statusClass = { pendente: "s-pendente", aprovado: "s-aprovado", recusado: "s-recusado", entregue: "s-entregue" };
  const statusLabel = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado", entregue: "Entregue" };

  if (loading) return <div className="empty"><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title" style={{ color: setor.color }}>HISTÓRICO</div>
        <div className="page-sub">{setor.label}</div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {reqs.length === 0
          ? <div className="empty">Nenhuma requisição ainda.</div>
          : reqs.map(r => (
            <div key={r.id} className="hist-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div className="hist-code">{r.codigo}</div>
                <span className={`status-badge ${statusClass[r.status] || "s-pendente"}`}>{statusLabel[r.status] || r.status}</span>
              </div>
              <div className="hist-date">{fmtDate(r.criadoEm)} · {r.solicitante}</div>
              <div className="hist-items">{r.itens?.map(i => `${i.nome} (${i.quantidade}x)`).join(", ")}</div>
              {r.observacao && <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>Obs: {r.observacao}</div>}
              {r.respostaAdmin && <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--info)", marginTop: 4 }}>Admin: {r.respostaAdmin}</div>}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── TELA PRINCIPAL ───────────────────────────────────────────
export default function RequisicaoApp() {
  const [fase, setFase] = useState("setores"); // setores | ferramentas | pin | form | hist
  const [setorKey, setSetorKey] = useState(null);
  const [subTab, setSubTab] = useState("form"); // form | hist
  const { toasts, add: addToast } = useToast();

  const setor = setorKey ? ALL_SETORES[setorKey] : null;

  const selecionarSetor = (key) => {
    if (key === "ferramentas") { setFase("ferramentas"); return; }
    setSetorKey(key);
    setFase("pin");
  };

  const selecionarSubSetor = (key) => {
    setSetorKey(key);
    setFase("pin");
  };

  const pinOk = () => setFase("form");

  const voltar = () => {
    if (fase === "ferramentas") { setFase("setores"); setSetorKey(null); }
    else if (fase === "pin")    { setFase(setorKey in FERRAMENTAS_SUB ? "ferramentas" : "setores"); setSetorKey(null); }
    else if (fase === "form")   { setFase("setores"); setSetorKey(null); setSubTab("form"); }
  };

  return (
    <>
      <style>{css}</style>
      <div className="req-app">
        <header className="req-header">
          <div className="req-logo">PARK</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {setor && fase === "form" && (
              <>
                <button
                  className="req-badge"
                  style={{ cursor: "pointer", borderColor: subTab === "form" ? setor.color : undefined, color: subTab === "form" ? setor.color : undefined }}
                  onClick={() => setSubTab("form")}
                >Nova Req.</button>
                <button
                  className="req-badge"
                  style={{ cursor: "pointer", borderColor: subTab === "hist" ? setor.color : undefined, color: subTab === "hist" ? setor.color : undefined }}
                  onClick={() => setSubTab("hist")}
                >Histórico</button>
              </>
            )}
            <span className="req-badge">REQUISIÇÕES</span>
          </div>
        </header>

        <div className="req-content">
          {/* ── Seleção de setor ── */}
          {fase === "setores" && (
            <>
              <div className="page-hd">
                <div className="page-title">REQUISIÇÃO</div>
                <div className="page-sub">Selecione o setor para fazer seu pedido</div>
              </div>
              <div className="setor-grid">
                {Object.entries(SETORES).map(([key, s]) => (
                  <div key={key} className="setor-card" style={{ "--c": s.color }} onClick={() => selecionarSetor(key)}>
                    <div className="setor-card-icon">{s.icon}</div>
                    <div className="setor-card-name">{s.label}</div>
                    <div className="setor-card-sub">Fazer pedido</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Sub-setores Ferramentas ── */}
          {fase === "ferramentas" && (
            <>
              <button className="back-btn" onClick={() => setFase("setores")}>← Voltar</button>
              <div className="page-hd">
                <div className="page-title">FERRAMENTAS</div>
                <div className="page-sub">Selecione o sub-setor</div>
              </div>
              <div className="ferr-sub-grid">
                {Object.entries(FERRAMENTAS_SUB).map(([key, s]) => (
                  <div key={key} className="setor-card" style={{ "--c": s.color }} onClick={() => selecionarSubSetor(key)}>
                    <div className="setor-card-icon">{s.icon}</div>
                    <div className="setor-card-name">{s.label}</div>
                    <div className="setor-card-sub">Fazer pedido</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── PIN ── */}
          {fase === "pin" && setor && (
            <>
              <button className="back-btn" onClick={voltar}>← Voltar</button>
              <PinScreen setor={setor} setorKey={setorKey} onSuccess={pinOk} onBack={voltar} />
            </>
          )}

          {/* ── Form / Histórico ── */}
          {fase === "form" && setor && (
            <>
              <button className="back-btn" onClick={voltar}>← Trocar Setor</button>
              {subTab === "form" && (
                <FormRequisicao
                  setorKey={setorKey}
                  setor={setor}
                  onBack={voltar}
                  toast={addToast}
                />
              )}
              {subTab === "hist" && (
                <HistoricoRequisicoes
                  setorKey={setorKey}
                  setor={setor}
                />
              )}
            </>
          )}
        </div>
      </div>
      <ToastEl toasts={toasts} />
    </>
  );
}