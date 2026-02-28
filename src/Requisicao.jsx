/**
 * REQUISICAO.JSX — Página pública de requisições por setor
 * Fluxo inline: busca produto → seleciona → digita quantidade → ADD → repete
 */

import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";

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

const SETORES = {
  ti:          { label:"TI",          icon:"🖥️",  color:"#3b82f6", colBase:"estoque_ti"          },
  exfood:      { label:"X-food",      icon:"🍽️",  color:"#f5a623", colBase:"estoque_exfood"      },
  limpeza:     { label:"Limpeza",     icon:"✨",  color:"#52c41a", colBase:"estoque_limpeza"     },
  ferramentas: { label:"Ferramentas", icon:"🔧",  color:"#a855f7", colBase:"estoque_ferramentas" },
};
const FERRAMENTAS_SUB = {
  fti:         { label:"Ferramentas TI",         icon:"💻", color:"#38bdf8", colBase:"estoque_ferramentas_ti"         },
  fmanutencao: { label:"Ferramentas Manutenção", icon:"🔨", color:"#fb923c", colBase:"estoque_ferramentas_manutencao" },
};
const ALL_SETORES = { ...SETORES, ...FERRAMENTAS_SUB };
const getCol = (k, t) => `${ALL_SETORES[k].colBase}_${t}`;

// ─── CSS ─────────────────────────────────────────────────────
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
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

  .req-app { min-height:100vh; display:flex; flex-direction:column; }
  .req-header { background:var(--surface); border-bottom:1px solid var(--border); height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 18px; position:sticky; top:0; z-index:100; }
  .req-logo { font-family:var(--display); font-size:20px; letter-spacing:3px; color:var(--accent); }
  .req-badge { font-family:var(--mono); font-size:10px; letter-spacing:2px; padding:3px 10px; border:1px solid var(--border2); color:var(--text-dim); border-radius:var(--r); cursor:pointer; background:transparent; transition:all .15s; }
  .req-badge.active { border-color:var(--accent); color:var(--accent); }
  .req-content { flex:1; padding:24px 16px; max-width:600px; margin:0 auto; width:100%; }

  .setor-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:20px; }
  @media(min-width:480px){ .setor-grid { grid-template-columns:repeat(4,1fr); } }
  .setor-card { background:var(--surface); border:1px solid var(--border); padding:22px 12px; cursor:pointer; transition:all .2s; display:flex; flex-direction:column; align-items:center; gap:8px; position:relative; overflow:hidden; border-radius:var(--r); -webkit-tap-highlight-color:transparent; }
  .setor-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; opacity:0; transition:opacity .2s; background:var(--c,var(--accent)); }
  .setor-card:hover::after,.setor-card:active::after { opacity:1; }
  .setor-card:hover,.setor-card:active { border-color:var(--c,var(--accent)); }
  .setor-card-icon { font-size:28px; }
  .setor-card-name { font-family:var(--display); font-size:17px; letter-spacing:2px; color:var(--c,var(--accent)); text-align:center; }
  .ferr-sub-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:20px; }

  .pin-wrap { max-width:320px; margin:0 auto; padding-top:16px; }
  .pin-display { display:flex; gap:14px; justify-content:center; margin-bottom:24px; }
  .pin-dot { width:16px; height:16px; border-radius:50%; border:2px solid var(--border2); transition:all .15s; }
  .pin-dot.filled { background:var(--accent); border-color:var(--accent); box-shadow:0 0 8px rgba(245,166,35,.4); }
  .pin-dot.error  { background:var(--danger); border-color:var(--danger); animation:shake .3s; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
  .pin-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .pin-btn { background:var(--surface2); border:1px solid var(--border2); color:var(--text); font-family:var(--display); font-size:26px; letter-spacing:2px; padding:18px 10px; cursor:pointer; border-radius:var(--r); transition:all .12s; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
  .pin-btn:hover,.pin-btn:active { background:var(--surface); border-color:var(--accent); color:var(--accent); }
  .pin-btn.del { font-family:var(--mono); font-size:14px; color:var(--text-dim); }
  .pin-err { font-family:var(--mono); font-size:11px; color:var(--danger); text-align:center; margin-top:12px; min-height:18px; }

  .form-label { display:block; font-family:var(--mono); font-size:10px; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; }
  .form-input,.form-select,.form-textarea { width:100%; background:var(--surface2); border:1px solid var(--border2); color:var(--text); padding:12px 14px; font-family:var(--mono); font-size:13px; outline:none; transition:border-color .2s; border-radius:var(--r); -webkit-appearance:none; appearance:none; }
  .form-input:focus,.form-select:focus,.form-textarea:focus { border-color:var(--accent); }
  .form-textarea { resize:vertical; min-height:72px; }

  .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:11px 18px; font-family:var(--mono); font-size:12px; cursor:pointer; transition:all .18s; border-radius:var(--r); border:1px solid transparent; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
  .btn-accent { background:var(--accent); color:#0a0a0a; border-color:var(--accent); font-weight:600; }
  .btn-accent:hover:not(:disabled),.btn-accent:active:not(:disabled) { background:var(--accent2); border-color:var(--accent2); }
  .btn-outline { background:transparent; color:var(--text-dim); border-color:var(--border2); }
  .btn-outline:hover:not(:disabled),.btn-outline:active:not(:disabled) { border-color:var(--accent); color:var(--accent); }
  .btn-success { background:var(--success); color:#0a0a0a; border-color:var(--success); font-weight:600; }
  .btn-ghost { background:transparent; border:none; color:var(--text-dim); cursor:pointer; padding:6px; display:inline-flex; align-items:center; -webkit-tap-highlight-color:transparent; }
  .btn-ghost:hover { color:var(--danger); }
  .btn:disabled { opacity:.4; cursor:not-allowed; }
  .btn-full { width:100%; }
  .btn-lg { padding:13px 24px; font-size:13px; }

  .card { background:var(--surface); border:1px solid var(--border); padding:18px; margin-bottom:12px; border-radius:var(--r); }
  .card-title { font-family:var(--display); font-size:18px; letter-spacing:2px; color:var(--accent); margin-bottom:14px; }
  .divider { height:1px; background:var(--border); margin:14px 0; }
  .page-hd { margin-bottom:20px; }
  .page-title { font-family:var(--display); font-size:30px; letter-spacing:4px; }
  .page-sub { font-family:var(--mono); font-size:11px; color:var(--text-dim); margin-top:2px; }
  .spinner { display:inline-block; width:13px; height:13px; border:2px solid var(--border2); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .back-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2); color:var(--text-dim); padding:6px 12px; font-family:var(--mono); font-size:11px; cursor:pointer; border-radius:var(--r); transition:all .15s; margin-bottom:16px; }
  .back-btn:hover { border-color:var(--accent); color:var(--accent); }
  .selected-setor-bar { display:flex; align-items:center; gap:10px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:9px 14px; margin-bottom:16px; }

  /* Itens do pedido */
  .items-list { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
  .item-row { display:flex; align-items:center; gap:8px; background:var(--surface2); border:1px solid var(--border); border-radius:var(--r); padding:9px 12px; }
  .item-info { flex:1; min-width:0; }
  .item-name { font-family:var(--sans); font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .item-cat { font-family:var(--mono); font-size:10px; color:var(--text-dim); }
  .item-qty { font-family:var(--display); font-size:20px; color:var(--accent); flex-shrink:0; min-width:32px; text-align:center; }

  /* Painel inline de busca */
  .add-panel { background:var(--surface2); border:1px solid var(--border2); border-radius:var(--r); overflow:hidden; }
  .search-row { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--border); }
  .search-row input { flex:1; background:transparent; border:none; outline:none; color:var(--text); font-family:var(--mono); font-size:13px; }
  .search-row input::placeholder { color:var(--text-dim); }
  .cat-strip { display:flex; gap:5px; padding:7px 10px; border-bottom:1px solid var(--border); overflow-x:auto; scrollbar-width:none; }
  .cat-strip::-webkit-scrollbar { display:none; }
  .cat-chip { flex-shrink:0; background:transparent; border:1px solid var(--border2); color:var(--text-dim); padding:3px 10px; font-family:var(--mono); font-size:9px; letter-spacing:1px; cursor:pointer; border-radius:20px; white-space:nowrap; text-transform:uppercase; transition:all .12s; }
  .cat-chip.on { border-color:var(--accent); color:var(--accent); }
  .prod-list { max-height:200px; overflow-y:auto; }
  .prod-row { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .1s; -webkit-tap-highlight-color:transparent; }
  .prod-row:last-child { border-bottom:none; }
  .prod-row:hover,.prod-row:active { background:rgba(245,166,35,.05); }
  .prod-row.selected { background:rgba(245,166,35,.08); border-left:2px solid var(--accent); }
  .prod-row.unavail { opacity:.4; cursor:not-allowed; }
  .prod-row-name { font-family:var(--sans); font-size:13px; font-weight:500; }
  .prod-row-cat { font-family:var(--mono); font-size:9px; color:var(--text-dim); }
  .prod-stock { font-family:var(--mono); font-size:10px; flex-shrink:0; margin-left:8px; }
  .prod-stock.ok   { color:var(--success); }
  .prod-stock.warn { color:var(--warn); }
  .prod-stock.zero { color:var(--danger); }

  /* Painel de quantidade — desliza abaixo ao selecionar */
  .qty-panel { display:flex; align-items:center; gap:8px; padding:10px 12px; border-top:1px solid var(--accent); background:rgba(245,166,35,.04); flex-wrap:wrap; animation:fadeIn .15s; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  .qty-name { flex:1; min-width:110px; font-family:var(--sans); font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .qty-controls { display:flex; align-items:center; gap:5px; }
  .qty-btn { background:var(--surface2); border:1px solid var(--border2); color:var(--text); width:30px; height:30px; border-radius:var(--r); cursor:pointer; font-family:var(--display); font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .12s; touch-action:manipulation; -webkit-tap-highlight-color:transparent; flex-shrink:0; }
  .qty-btn:hover,.qty-btn:active { border-color:var(--accent); color:var(--accent); }
  .qty-input { width:50px; background:var(--surface2); border:1px solid var(--border2); color:var(--text); padding:5px 6px; font-family:var(--display); font-size:18px; text-align:center; outline:none; border-radius:var(--r); -webkit-appearance:none; appearance:none; }
  .qty-input:focus { border-color:var(--accent); }
  .qty-msg { width:100%; font-family:var(--mono); font-size:10px; margin-top:2px; }
  .qty-msg.ok   { color:var(--success); }
  .qty-msg.over { color:var(--danger); }

  /* Sucesso */
  .success-box { text-align:center; padding:40px 20px; }
  .success-icon { font-size:52px; margin-bottom:14px; }
  .success-title { font-family:var(--display); font-size:36px; letter-spacing:4px; color:var(--success); margin-bottom:6px; }
  .success-sub { font-family:var(--mono); font-size:11px; color:var(--text-dim); margin-bottom:6px; }
  .success-code { font-family:var(--display); font-size:26px; color:var(--accent); letter-spacing:3px; margin-top:8px; }

  /* Histórico */
  .hist-item { padding:12px 14px; border-bottom:1px solid var(--border); }
  .hist-item:last-child { border-bottom:none; }
  .hist-code { font-family:var(--display); font-size:17px; letter-spacing:2px; color:var(--accent); }
  .hist-date { font-family:var(--mono); font-size:10px; color:var(--text-dim); }
  .hist-items { font-family:var(--mono); font-size:11px; color:var(--text-mid); margin-top:3px; }
  .status-badge { display:inline-block; padding:2px 8px; font-size:9px; letter-spacing:1px; text-transform:uppercase; border:1px solid; font-family:var(--mono); border-radius:var(--r); }
  .s-pendente { color:var(--warn);    border-color:var(--warn);    background:rgba(250,204,21,.06); }
  .s-aprovado { color:var(--success); border-color:var(--success); background:rgba(74,222,128,.06); }
  .s-recusado { color:var(--danger);  border-color:var(--danger);  background:rgba(248,113,113,.06); }
  .s-entregue { color:var(--info);    border-color:var(--info);    background:rgba(96,165,250,.06); }
  .empty { text-align:center; padding:32px 16px; font-family:var(--mono); font-size:11px; color:var(--text-dim); }

  /* Toast */
  .toast-wrap { position:fixed; bottom:20px; right:14px; z-index:9999; display:flex; flex-direction:column; gap:5px; max-width:calc(100vw - 28px); }
  .toast { padding:10px 14px; font-family:var(--mono); font-size:11px; border-left:3px solid; min-width:190px; animation:tin .25s ease; border-radius:0 var(--r) var(--r) 0; }
  .toast-success { background:rgba(20,30,20,.97); border-color:var(--success); color:var(--success); }
  .toast-error   { background:rgba(30,15,15,.97);  border-color:var(--danger);  color:var(--danger); }
  .toast-info    { background:rgba(20,20,30,.97);  border-color:var(--info);    color:var(--info); }
  @keyframes tin { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }

  /* Usuários */
  .user-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
  .user-btn { padding:11px 10px; cursor:pointer; text-align:left; border-radius:var(--r); font-family:var(--mono); font-size:12px; display:flex; align-items:center; gap:8px; transition:all .15s; background:var(--surface2); border:1px solid var(--border); color:var(--text); -webkit-tap-highlight-color:transparent; }
  .user-btn:hover,.user-btn:active { border-color:var(--accent); }
  .user-btn.selected { background:rgba(245,166,35,.08); border-color:var(--accent); color:var(--accent); }
`;

// ─── Helpers ─────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR");
};
const genCodigo = () => "REQ-" + Date.now().toString(36).toUpperCase().slice(-5);

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
function PinScreen({ setor, setorKey, onSuccess }) {
  const [pin, setPin]     = useState("");
  const [err, setErr]     = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (pin.length === 4) verify(); }, [pin]);

  const verify = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, getCol(setorKey, "config"), "requisicao_config"));
      if (!snap.exists() || !snap.data().pin || snap.data().pin === pin) { onSuccess(); return; }
      setShake(true);
      setErr("Senha incorreta.");
      setTimeout(() => { setPin(""); setShake(false); setErr(""); }, 900);
    } catch { onSuccess(); }
    finally { setLoading(false); }
  };

  const press = (d) => { if (pin.length < 4 && !loading) setPin(p => p + d); };
  const del   = () => setPin(p => p.slice(0, -1));
  const digits = [1,2,3,4,5,6,7,8,9,null,0,"del"];

  return (
    <div className="pin-wrap">
      <div className="page-hd">
        <div className="page-title" style={{ color: setor.color }}>{setor.label}</div>
        <div className="page-sub">Digite a senha de acesso</div>
      </div>
      <div className="pin-display">
        {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length>i?(shake?"error":"filled"):""}`}/>)}
      </div>
      <div className="pin-grid">
        {digits.map((d, i) => {
          if (d === null) return <div key={i}/>;
          if (d === "del") return <button key={i} className="pin-btn del" onClick={del} disabled={loading}>⌫</button>;
          return <button key={i} className="pin-btn" onClick={() => press(String(d))} disabled={loading || pin.length === 4}>{d}</button>;
        })}
      </div>
      <div className="pin-err">{err}</div>
    </div>
  );
}

// ─── Painel inline de busca + quantidade ─────────────────────
function AddItemInline({ setorKey, onAdd, jaAdicionados }) {
  const [produtos, setProdutos]     = useState([]);
  const [estoqueMap, setEstoqueMap] = useState({});
  const [cats, setCats]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busca, setBusca]           = useState("");
  const [catFiltro, setCatFiltro]   = useState("");
  const [sel, setSel]               = useState(null);
  const [qtd, setQtd]               = useState(1);
  const inputRef = useRef(null);
  const qtdRef   = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [sc, sp, se] = await Promise.all([
          getDocs(collection(db, getCol(setorKey, "categorias"))),
          getDocs(collection(db, getCol(setorKey, "produtos_padrao"))),
          getDocs(collection(db, getCol(setorKey, "produtos"))),
        ]);
        setCats(sc.docs.map(d => ({ id: d.id, ...d.data() })));
        setProdutos(sp.docs.map(d => ({ id: d.id, ...d.data() })));
        const map = {};
        se.docs.forEach(d => { const x = d.data(); map[x.nome] = x.quantidade ?? 0; });
        setEstoqueMap(map);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [setorKey]);

  // Foca no input de quantidade ao selecionar produto
  useEffect(() => {
    if (sel) setTimeout(() => qtdRef.current?.select(), 60);
  }, [sel?.id]);

  const filtrados = produtos
    .filter(p => !catFiltro || p.categoria === catFiltro)
    .filter(p => !busca.trim() || p.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter(p => !jaAdicionados.some(j => j.nome === p.nome));

  const estoque = sel ? (estoqueMap[sel.nome] ?? null) : null;
  const qtdNum  = Math.max(1, parseInt(qtd) || 1);
  const excede  = estoque !== null && qtdNum > estoque;

  const handleSelect = (p) => {
    setSel(prev => prev?.id === p.id ? null : p);
    setQtd(1);
  };

  const handleAdd = () => {
    if (!sel || excede || qtdNum < 1) return;
    onAdd({ nome: sel.nome, categoria: sel.categoria, quantidade: qtdNum });
    setSel(null);
    setQtd(1);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const handleKeyQtd = (e) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") setSel(null);
  };

  if (loading) return (
    <div className="add-panel" style={{ padding:20, textAlign:"center" }}>
      <span className="spinner"/>
    </div>
  );

  return (
    <div className="add-panel">
      {/* Busca */}
      <div className="search-row">
        <span style={{ fontSize:14, color:"var(--text-dim)" }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setSel(null); }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {busca && (
          <button className="btn-ghost" style={{ padding:"2px 4px", fontSize:11 }}
            onClick={() => { setBusca(""); setSel(null); inputRef.current?.focus(); }}>
            ✕
          </button>
        )}
      </div>

      {/* Filtro de categorias */}
      {cats.length > 1 && (
        <div className="cat-strip">
          {[{ id:"__all", nome:"Todos" }, ...cats].map(c => {
            const val = c.id === "__all" ? "" : c.nome;
            return (
              <button key={c.id} className={`cat-chip ${catFiltro===val?"on":""}`}
                onClick={() => { setCatFiltro(val); setSel(null); }}>
                {c.nome}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista */}
      <div className="prod-list">
        {filtrados.length === 0
          ? <div className="empty" style={{ padding:"14px 12px" }}>
              {busca ? `Nenhum resultado para "${busca}"` : "Nenhum produto disponível"}
            </div>
          : filtrados.map(p => {
              const stk = estoqueMap[p.nome] ?? null;
              const zero = stk !== null && stk <= 0;
              const isSel = sel?.id === p.id;
              return (
                <div key={p.id}
                  className={`prod-row ${isSel?"selected":""} ${zero?"unavail":""}`}
                  onClick={() => !zero && handleSelect(p)}
                >
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="prod-row-name">{p.nome}</div>
                    <div className="prod-row-cat">{p.categoria}</div>
                  </div>
                  {stk !== null && (
                    <div className={`prod-stock ${zero?"zero":stk<=5?"warn":"ok"}`}>
                      {zero ? "sem estoque" : `${stk} un.`}
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* Painel de quantidade — aparece ao selecionar */}
      {sel && (
        <div className="qty-panel">
          <div className="qty-name">{sel.nome}</div>
          <div className="qty-controls">
            <button className="qty-btn"
              onClick={() => setQtd(q => Math.max(1, (parseInt(q)||1) - 1))}>−</button>
            <input
              ref={qtdRef}
              type="number"
              inputMode="numeric"
              className="qty-input"
              value={qtd}
              min={1}
              max={estoque ?? undefined}
              onChange={e => setQtd(e.target.value)}
              onKeyDown={handleKeyQtd}
            />
            <button className="qty-btn"
              onClick={() => setQtd(q => {
                const n = (parseInt(q)||1) + 1;
                return estoque !== null ? Math.min(estoque, n) : n;
              })}>+</button>
          </div>
          <button
            className="btn btn-accent"
            style={{ padding:"7px 14px", fontSize:12 }}
            onClick={handleAdd}
            disabled={excede || qtdNum < 1}
          >
            + ADD
          </button>
          {/* Aviso de estoque */}
          {estoque !== null && (
            <div className={`qty-msg ${excede?"over":"ok"}`}>
              {excede
                ? `⚠ Disponível: ${estoque} un.`
                : `✓ ${estoque} em estoque`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────
function FormRequisicao({ setorKey, setor, onBack, toast }) {
  const [itens, setItens]               = useState([]);
  const [obs, setObs]                   = useState("");
  const [solicitante, setSolicitante]   = useState("");
  const [usuarios, setUsuarios]         = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading]           = useState(false);
  const [enviado, setEnviado]           = useState(null);

  useEffect(() => {
    getDocs(collection(db, getCol(setorKey, "req_usuarios")))
      .then(s => setUsuarios(s.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>a.nome.localeCompare(b.nome))))
      .catch(() => setUsuarios([]))
      .finally(() => setLoadingUsers(false));
  }, [setorKey]);

  const addItem = (item) => {
    setItens(prev => {
      const idx = prev.findIndex(i => i.nome === item.nome);
      if (idx !== -1) {
        const upd = [...prev];
        upd[idx] = { ...upd[idx], quantidade: upd[idx].quantidade + item.quantidade };
        toast(`+${item.quantidade}x "${item.nome}"`, "info");
        return upd;
      }
      toast(`"${item.nome}" adicionado`, "info");
      return [...prev, item];
    });
  };

  const remover = (idx) => setItens(p => p.filter((_, i) => i !== idx));

  const enviar = async () => {
    if (itens.length === 0)      { toast("Adicione pelo menos um item.", "error"); return; }
    if (!solicitante.trim())     { toast("Informe quem está pedindo.", "error");   return; }
    setLoading(true);
    try {
      const codigo = genCodigo();
      await addDoc(collection(db, getCol(setorKey, "requisicoes")), {
        codigo, setor: setorKey, setorLabel: setor.label,
        solicitante: solicitante.trim(), itens,
        observacao: obs.trim(), status: "pendente",
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      });
      setEnviado(codigo);
      toast("Requisição enviada!", "success");
    } catch (e) { toast("Erro: " + e.message, "error"); }
    finally { setLoading(false); }
  };

  if (enviado) return (
    <div className="card">
      <div className="success-box">
        <div className="success-icon">✅</div>
        <div className="success-title">ENVIADO!</div>
        <div className="success-sub">Requisição registrada com sucesso.</div>
        <div className="success-sub">Código:</div>
        <div className="success-code">{enviado}</div>
        <div style={{ marginTop:24 }}>
          <button className="btn btn-outline btn-lg" onClick={onBack}>NOVA REQUISIÇÃO</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="selected-setor-bar">
        <span style={{ fontSize:18 }}>{setor.icon}</span>
        <span style={{ fontFamily:"var(--display)", fontSize:18, letterSpacing:2, color:setor.color }}>{setor.label}</span>
      </div>

      <div className="card">
        <div className="card-title">NOVA REQUISIÇÃO</div>

        {/* Solicitante */}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">Quem está pedindo? *</label>
          {loadingUsers
            ? <div style={{ padding:"8px 0" }}><span className="spinner"/></div>
            : usuarios.length === 0
              ? <input className="form-input" placeholder="Seu nome..."
                  value={solicitante} onChange={e => setSolicitante(e.target.value)}/>
              : (
                <div className="user-grid">
                  {usuarios.map(u => (
                    <button key={u.id}
                      className={`user-btn ${solicitante===u.nome?"selected":""}`}
                      onClick={() => setSolicitante(u.nome)}>
                      <span>👤</span>
                      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.nome}</span>
                      {solicitante===u.nome && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
        </div>

        <div className="divider"/>

        {/* Lista de itens adicionados */}
        {itens.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <label className="form-label" style={{ marginBottom:8 }}>
              Itens do pedido ({itens.length})
            </label>
            <div className="items-list">
              {itens.map((item, i) => (
                <div key={i} className="item-row">
                  <div className="item-info">
                    <div className="item-name">{item.nome}</div>
                    <div className="item-cat">{item.categoria}</div>
                  </div>
                  <div className="item-qty">{item.quantidade}×</div>
                  <button className="btn-ghost" onClick={() => remover(i)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Painel de busca inline */}
        <label className="form-label" style={{ marginBottom:8, display:"block" }}>
          {itens.length === 0 ? "Adicionar itens *" : "Adicionar mais itens"}
        </label>
        <AddItemInline setorKey={setorKey} onAdd={addItem} jaAdicionados={itens}/>

        <div className="divider"/>

        {/* Observações */}
        <div style={{ marginBottom:14 }}>
          <label className="form-label">Observações <span style={{ color:"var(--text-dim)", fontWeight:400 }}>(opcional)</span></label>
          <textarea className="form-textarea"
            placeholder="Urgência, local de entrega..."
            value={obs} onChange={e => setObs(e.target.value)}/>
        </div>

        <button
          className="btn btn-accent btn-lg btn-full"
          onClick={enviar}
          disabled={loading || itens.length === 0 || !solicitante.trim()}
        >
          {loading
            ? <><span className="spinner"/> ENVIANDO...</>
            : `📤 ENVIAR (${itens.length} ${itens.length === 1?"item":"itens"})`}
        </button>
      </div>
    </div>
  );
}

// ─── Histórico ───────────────────────────────────────────────
function HistoricoRequisicoes({ setorKey, setor }) {
  const [reqs, setReqs]         = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await getDocs(query(collection(db, getCol(setorKey, "requisicoes")), orderBy("criadoEm", "desc")));
        setReqs(s.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setReqs([]); }
      finally { setLoading(false); }
    })();
  }, [setorKey]);

  const cls = { pendente:"s-pendente", aprovado:"s-aprovado", recusado:"s-recusado", entregue:"s-entregue" };
  const lbl = { pendente:"Pendente", aprovado:"Aprovado", recusado:"Recusado", entregue:"Entregue" };

  if (loading) return <div className="empty"><span className="spinner"/></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title" style={{ color:setor.color }}>HISTÓRICO</div>
        <div className="page-sub">{setor.label}</div>
      </div>
      <div className="card" style={{ padding:0 }}>
        {reqs.length === 0
          ? <div className="empty">Nenhuma requisição ainda.</div>
          : reqs.map(r => (
            <div key={r.id} className="hist-item">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", marginBottom:2 }}>
                <div className="hist-code">{r.codigo}</div>
                <span className={`status-badge ${cls[r.status]||"s-pendente"}`}>{lbl[r.status]||r.status}</span>
              </div>
              <div className="hist-date">{fmtDate(r.criadoEm)} · {r.solicitante}</div>
              <div className="hist-items">{r.itens?.map(i=>`${i.nome} (${i.quantidade}×)`).join(", ")}</div>
              {r.observacao && <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginTop:3 }}>Obs: {r.observacao}</div>}
              {r.respostaAdmin && <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--info)", marginTop:3 }}>Admin: {r.respostaAdmin}</div>}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────
export default function RequisicaoApp() {
  const [fase, setFase]           = useState("setores");
  const [setorKey, setSetorKey]   = useState(null);
  const [subTab, setSubTab]       = useState("form");
  const { toasts, add: toast }    = useToast();

  const setor = setorKey ? ALL_SETORES[setorKey] : null;

  const selecionarSetor = (key) => {
    if (key === "ferramentas") { setFase("ferramentas"); return; }
    setSetorKey(key); setFase("pin");
  };

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
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {setor && fase === "form" && (
              <>
                <button className={`req-badge ${subTab==="form"?"active":""}`} onClick={() => setSubTab("form")}>Pedido</button>
                <button className={`req-badge ${subTab==="hist"?"active":""}`} onClick={() => setSubTab("hist")}>Histórico</button>
              </>
            )}
            <span className="req-badge" style={{ cursor:"default" }}>REQ</span>
          </div>
        </header>

        <div className="req-content">

          {/* Setores */}
          {fase === "setores" && (
            <>
              <div className="page-hd">
                <div className="page-title">REQUISIÇÃO</div>
                <div className="page-sub">Selecione o setor</div>
              </div>
              <div className="setor-grid">
                {Object.entries(SETORES).map(([key, s]) => (
                  <div key={key} className="setor-card" style={{ "--c":s.color }} onClick={() => selecionarSetor(key)}>
                    <div className="setor-card-icon">{s.icon}</div>
                    <div className="setor-card-name">{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sub-setores ferramentas */}
          {fase === "ferramentas" && (
            <>
              <button className="back-btn" onClick={() => setFase("setores")}>← Voltar</button>
              <div className="page-hd">
                <div className="page-title">FERRAMENTAS</div>
                <div className="page-sub">Sub-setor</div>
              </div>
              <div className="ferr-sub-grid">
                {Object.entries(FERRAMENTAS_SUB).map(([key, s]) => (
                  <div key={key} className="setor-card" style={{ "--c":s.color }}
                    onClick={() => { setSetorKey(key); setFase("pin"); }}>
                    <div className="setor-card-icon">{s.icon}</div>
                    <div className="setor-card-name">{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* PIN */}
          {fase === "pin" && setor && (
            <>
              <button className="back-btn" onClick={voltar}>← Voltar</button>
              <PinScreen setor={setor} setorKey={setorKey} onSuccess={() => setFase("form")}/>
            </>
          )}

          {/* Formulário / Histórico */}
          {fase === "form" && setor && (
            <>
              <button className="back-btn" onClick={voltar}>← Trocar Setor</button>
              {subTab === "form" && <FormRequisicao setorKey={setorKey} setor={setor} onBack={voltar} toast={toast}/>}
              {subTab === "hist" && <HistoricoRequisicoes setorKey={setorKey} setor={setor}/>}
            </>
          )}

        </div>
      </div>
      <ToastEl toasts={toasts}/>
    </>
  );
}