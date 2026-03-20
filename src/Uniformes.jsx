/**
 * Uniformes.jsx — v3
 *
 * Tabs: Estoque | Produtos | Usuários | All | Atribuir | Config | Log
 *
 * Config inclui:
 *   - Gerenciar Tipos de produto (criar / excluir)
 *   - Gerenciar Setores (criar / excluir)
 *   - ZERAR BANCO (apaga tudo do módulo Uniformes)
 *
 * Firestore collections:
 *   uniformes_config_tipos   — tipos criados: { label, cor, tamanhos }
 *   uniformes_config_setores — setores criados: { nome }
 *   uniformes_produtos       — catálogo: { tipoId, tipoLabel, tamanho }
 *   uniformes_estoque        — { tipoId, tamanho, quantidade }
 *   uniformes_usuarios       — { nome, setor }
 *   uniformes_atribuicoes    — { userId, userName, userSetor, tipoId, tipoLabel, tamanho, quantidade, data }
 *   uniformes_log            — { acao, ... , ts }
 */

import { useState, useEffect, useCallback } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc,
  deleteDoc, updateDoc, serverTimestamp, getDoc, orderBy,
  query, writeBatch,
} from "firebase/firestore";

// ─── Firebase ─────────────────────────────────────────────────
const _app = getApps().length ? getApps()[0] : initializeApp({
  apiKey: "AIzaSyBH3hxzhFe1IWyIO58wE2kcnL1lpxBy8ZM",
  authDomain: "sytemstock.firebaseapp.com",
  projectId: "sytemstock",
  storageBucket: "sytemstock.firebasestorage.app",
  messagingSenderId: "643733507908",
  appId: "1:643733507908:web:1d3bce112d337534799111",
});
const db = getFirestore(_app);

// ─── Coleções ──────────────────────────────────────────────────
const C = {
  tipos:    "uniformes_config_tipos",
  setores:  "uniformes_config_setores",
  produtos: "uniformes_produtos",
  estoque:  "uniformes_estoque",
  usuarios: "uniformes_usuarios",
  atrib:    "uniformes_atribuicoes",
  log:      "uniformes_log",
};

// ─── Helpers ───────────────────────────────────────────────────
const TAMANHOS_ROUPA   = ["PP","P","M","G","GG","XG","XXG"];
const TAMANHOS_CALCADO = ["33","34","35","36","37","38","39","40","41","42","43","44","45","46"];
const TAMANHOS_NUMERO  = ["32","34","36","38","40","42","44","46","48","50","52","54"];
const TAMANHOS_GENERICO = ["PP","P","M","G","GG","XG","XXG"];

const GRUPOS_TAMANHO = [
  { label:"Roupas (PP~XXG)",   val:"roupa",   lista:TAMANHOS_ROUPA },
  { label:"Calças (32~54)",    val:"calca",   lista:TAMANHOS_NUMERO },
  { label:"Calçados (33~46)",  val:"calcado", lista:TAMANHOS_CALCADO },
  { label:"Tamanho único",     val:"unico",   lista:["Único"] },
];

const CORES_OPCOES = [
  "#3b82f6","#a855f7","#f5a623","#52c41a","#ec4899",
  "#f87171","#fb923c","#38bdf8","#facc15","#4ade80",
];

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR");
};

// ─── SVG Icons ────────────────────────────────────────────────
const Ico = ({ size=16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"inline-block", flexShrink:0 }}>
    {children}
  </svg>
);
const IcoShirt  = ({ size=18, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"inline-block", flexShrink:0 }}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
  </svg>
);
const IcoUser   = ({ size=16 }) => <Ico size={size}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>;
const IcoUsers  = ({ size=16 }) => <Ico size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>;
const IcoPlus   = () => <Ico><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>;
const IcoTrash  = () => <Ico size={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Ico>;
const IcoEdit   = () => <Ico size={14}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ico>;
const IcoCheck  = () => <Ico size={14}><polyline points="20 6 9 17 4 12"/></Ico>;
const IcoX      = () => <Ico size={13}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>;
const IcoSearch = () => <Ico size={14}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>;
const IcoBack   = () => <Ico size={15}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Ico>;
const IcoBox    = () => <Ico><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></Ico>;
const IcoPkg    = () => <Ico size={15}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></Ico>;
const IcoReturn = () => <Ico size={15}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.04"/></Ico>;
const IcoWarn   = () => <Ico size={14}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ico>;
const IcoCfg    = () => <Ico size={15}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>;
const IcoNuke   = () => <Ico size={15}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></Ico>;
const IcoTag    = () => <Ico size={15}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Ico>;

// ─── Toast ────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const Toast = () => (
    <div style={{ position:"fixed", bottom:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:6, maxWidth:"calc(100vw - 40px)" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding:"11px 16px", fontFamily:"var(--mono)", fontSize:12, borderLeft:"3px solid",
          minWidth:220, animation:"tin .3s ease", borderRadius:"0 var(--r) var(--r) 0",
          display:"flex", alignItems:"center", gap:8,
          background: t.type==="success"?"rgba(20,30,20,.97)":t.type==="error"?"rgba(30,15,15,.97)":"rgba(20,20,30,.97)",
          borderColor: t.type==="success"?"var(--success)":t.type==="error"?"var(--danger)":"var(--info)",
          color: t.type==="success"?"var(--success)":t.type==="error"?"var(--danger)":"var(--info)",
        }}>
          {t.type==="success"?<IcoCheck/>:t.type==="error"?<IcoX/>:<IcoWarn/>} {t.msg}
        </div>
      ))}
    </div>
  );
  return { add, Toast };
}

// ─── SearchBox ────────────────────────────────────────────────
function SearchBox({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div style={{ display:"flex", alignItems:"center", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:"var(--r)", overflow:"hidden", marginBottom:10 }}>
      <span style={{ padding:"0 10px", color:"var(--text-dim)", display:"flex" }}><IcoSearch/></span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"var(--text)", fontFamily:"var(--mono)", fontSize:13, padding:"10px 0" }}/>
      {value && <button onClick={() => onChange("")} style={{ padding:"0 10px", background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", display:"flex" }}><IcoX/></button>}
    </div>
  );
}

// ─── SetorBadge ───────────────────────────────────────────────
function SetorBadge({ setor, setoresCfg }) {
  const cfg = setoresCfg?.find(s => s.nome === setor);
  const cor = cfg?.cor || "#888";
  return (
    <span style={{ fontFamily:"var(--mono)", fontSize:10, padding:"2px 8px", border:`1px solid ${cor}`, color:cor, borderRadius:3, background:`${cor}18`, whiteSpace:"nowrap" }}>
      {setor || "—"}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({ title, onClose, children, borderColor = "var(--border2)", maxWidth = 480 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"var(--surface)", border:`1px solid ${borderColor}`, width:"100%", maxWidth, maxHeight:"90vh", overflowY:"auto", borderRadius:"var(--r)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid var(--border)", position:"sticky", top:0, background:"var(--surface)", zIndex:2 }}>
          <span style={{ fontFamily:"var(--display)", fontSize:20, letterSpacing:2, color:"var(--accent)" }}>{title}</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", display:"flex", padding:4 }}><IcoX/></button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Botão ícone ──────────────────────────────────────────────
function IBtn({ onClick, danger, info, children, title, disabled }) {
  const [h, setH] = useState(false);
  const c = danger ? "var(--danger)" : info ? "var(--info)" : "var(--text-dim)";
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background:"transparent", border:`1px solid ${h&&!disabled ? c : "var(--border)"}`, borderRadius:"var(--r)", color:h&&!disabled ? c : "var(--text-dim)", cursor:disabled?"not-allowed":"pointer", padding:"5px 8px", display:"flex", alignItems:"center", transition:"all .15s", opacity:disabled?0.4:1 }}>
      {children}
    </button>
  );
}

// ============================================================
// CONFIG — Tipos, Setores e Reset do banco
// ============================================================
function ConfigTab({ tiposCfg, setoresCfg, onRefresh, addToast }) {
  const [subTab, setSubTab] = useState("tipos");

  // ── Tipos ─────────────────────────────────────────────────
  const [novoLabel, setNovoLabel]   = useState("");
  const [novaCor, setNovaCor]       = useState(CORES_OPCOES[0]);
  const [novoGrupo, setNovoGrupo]   = useState("roupa");
  const [savingTipo, setSavingTipo] = useState(false);
  const [delTipoId, setDelTipoId]   = useState(null);

  const addTipo = async () => {
    const label = novoLabel.trim();
    if (!label) return;
    if (tiposCfg.some(t => t.label.toLowerCase() === label.toLowerCase())) {
      addToast("Tipo já existe.", "error"); return;
    }
    const grupo = GRUPOS_TAMANHO.find(g => g.val === novoGrupo);
    const id    = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setSavingTipo(true);
    try {
      await setDoc(doc(db, C.tipos, id), {
        id, label, cor: novaCor, grupo: novoGrupo, tamanhos: grupo.lista, criadoEm: serverTimestamp(),
      });
      addToast(`Tipo "${label}" criado!`, "success");
      setNovoLabel(""); onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setSavingTipo(false); }
  };

  const delTipo = async (t) => {
    if (!confirm(`Excluir tipo "${t.label}"?\n\nIsso também removerá todos os produtos deste tipo do catálogo.`)) return;
    setDelTipoId(t.id);
    try {
      // Remove o tipo
      await deleteDoc(doc(db, C.tipos, t.id));
      // Remove produtos do catálogo deste tipo
      const pSnap = await getDocs(collection(db, C.produtos));
      const batch = writeBatch(db);
      pSnap.docs.filter(d => d.data().tipoId === t.id).forEach(d => batch.delete(d.ref));
      // Remove entradas de estoque deste tipo
      const eSnap = await getDocs(collection(db, C.estoque));
      eSnap.docs.filter(d => d.data().tipoId === t.id).forEach(d => batch.delete(d.ref));
      await batch.commit();
      addToast(`Tipo "${t.label}" excluído.`, "success");
      onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setDelTipoId(null); }
  };

  // ── Setores ───────────────────────────────────────────────
  const [novoSetor, setNovoSetor]     = useState("");
  const [novoSetorCor, setSetorCor]   = useState(CORES_OPCOES[0]);
  const [savingSetor, setSavingSetor] = useState(false);
  const [delSetorId, setDelSetorId]   = useState(null);

  const addSetor = async () => {
    const nome = novoSetor.trim();
    if (!nome) return;
    if (setoresCfg.some(s => s.nome.toLowerCase() === nome.toLowerCase())) {
      addToast("Setor já existe.", "error"); return;
    }
    setSavingSetor(true);
    try {
      await addDoc(collection(db, C.setores), { nome, cor: novoSetorCor, criadoEm: serverTimestamp() });
      addToast(`Setor "${nome}" criado!`, "success");
      setNovoSetor(""); onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setSavingSetor(false); }
  };

  const delSetor = async (s) => {
    if (!confirm(`Excluir setor "${s.nome}"?`)) return;
    setDelSetorId(s.id);
    try {
      await deleteDoc(doc(db, C.setores, s.id));
      addToast(`Setor "${s.nome}" excluído.`, "success");
      onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setDelSetorId(null); }
  };

  // ── Reset Banco ────────────────────────────────────────────
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting]     = useState(false);
  const PALAVRA_CONFIRM = "ZERAR";

  const resetarBanco = async () => {
    if (confirmText !== PALAVRA_CONFIRM) {
      addToast(`Digite "${PALAVRA_CONFIRM}" para confirmar.`, "error"); return;
    }
    setResetting(true);
    try {
      const colecoes = [C.tipos, C.setores, C.produtos, C.estoque, C.usuarios, C.atrib, C.log];
      for (const col of colecoes) {
        const snap  = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        if (snap.docs.length > 0) await batch.commit();
      }
      addToast("Banco de uniformes zerado com sucesso.", "success");
      setConfirmText("");
      onRefresh();
    } catch(e) { addToast("Erro ao zerar: " + e.message, "error"); }
    finally { setResetting(false); }
  };

  const subBtns = [
    { id:"tipos",   label:"Tipos de Produto" },
    { id:"setores", label:"Setores"          },
    { id:"reset",   label:"Zerar Banco"      },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {subBtns.map(b => (
          <button key={b.id} onClick={() => setSubTab(b.id)}
            style={{
              padding:"8px 16px", fontFamily:"var(--mono)", fontSize:11, letterSpacing:1,
              textTransform:"uppercase", cursor:"pointer", border:"1px solid",
              borderRadius:"var(--r)", transition:"all .15s",
              background: subTab===b.id ? (b.id==="reset" ? "rgba(248,113,113,.15)" : "var(--accent)") : "transparent",
              borderColor: subTab===b.id ? (b.id==="reset" ? "var(--danger)" : "var(--accent)") : "var(--border2)",
              color: subTab===b.id ? (b.id==="reset" ? "var(--danger)" : "#0a0a0a") : "var(--text-dim)",
              fontWeight: subTab===b.id ? 600 : 400,
            }}>
            {b.id==="reset" ? <span style={{ display:"flex",alignItems:"center",gap:6 }}><IcoNuke/>{b.label}</span> : b.label}
          </button>
        ))}
      </div>

      {/* ── TIPOS ───────────────────────────────────────────── */}
      {subTab === "tipos" && (
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
              <IcoShirt size={18} color="var(--accent)"/> CRIAR TIPO DE PRODUTO
            </div>
            <p style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:14 }}>
              Ex: Camiseta, Calça, Boné, Colete. Cada tipo terá seus próprios tamanhos.
            </p>

            {/* Nome */}
            <div className="form-group">
              <label className="form-label">Nome do tipo *</label>
              <input className="form-input" placeholder="Ex: Colete, Macacão..." value={novoLabel}
                onChange={e => setNovoLabel(e.target.value)} onKeyDown={e => e.key==="Enter" && addTipo()}/>
            </div>

            {/* Grupo de tamanhos */}
            <div className="form-group">
              <label className="form-label">Grupo de tamanhos</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {GRUPOS_TAMANHO.map(g => (
                  <div key={g.val} onClick={() => setNovoGrupo(g.val)}
                    style={{ padding:"8px 14px", cursor:"pointer", border:`1px solid ${novoGrupo===g.val?"var(--accent)":"var(--border2)"}`, borderRadius:"var(--r)", background:novoGrupo===g.val?"rgba(245,166,35,.08)":"transparent", transition:"all .15s" }}>
                    <div style={{ fontFamily:"var(--mono)", fontSize:11, color:novoGrupo===g.val?"var(--accent)":"var(--text-dim)" }}>{g.label}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", marginTop:2 }}>
                      {g.lista.slice(0,5).join(", ")}{g.lista.length>5?"…":""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cor */}
            <div className="form-group">
              <label className="form-label">Cor</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {CORES_OPCOES.map(c => (
                  <div key={c} onClick={() => setNovaCor(c)}
                    style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${novaCor===c?"white":"transparent"}`, boxShadow:novaCor===c?"0 0 0 2px "+c:"none", transition:"all .15s" }}/>
                ))}
              </div>
            </div>

            <button className="btn btn-accent" onClick={addTipo} disabled={savingTipo || !novoLabel.trim()} style={{ display:"flex", alignItems:"center", gap:8 }}>
              {savingTipo ? <span className="spinner"/> : <><IcoPlus/> CRIAR TIPO</>}
            </button>
          </div>

          {/* Lista de tipos */}
          <div className="card">
            <div className="card-title">TIPOS CADASTRADOS ({tiposCfg.length})</div>
            {tiposCfg.length === 0
              ? <div className="empty">Nenhum tipo cadastrado ainda.</div>
              : tiposCfg.map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)", marginBottom:8 }}>
                  {/* Cor preview */}
                  <div style={{ width:14, height:14, borderRadius:"50%", background:t.cor, flexShrink:0 }}/>
                  <IcoShirt size={18} color={t.cor}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"var(--display)", fontSize:18, letterSpacing:2, color:t.cor }}>{t.label}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginTop:2 }}>
                      {GRUPOS_TAMANHO.find(g=>g.val===t.grupo)?.label || t.grupo} · tamanhos: {(t.tamanhos||[]).join(", ")}
                    </div>
                  </div>
                  <IBtn danger title="Excluir tipo" onClick={() => delTipo(t)} disabled={delTipoId===t.id}>
                    {delTipoId===t.id ? <span className="spinner"/> : <IcoTrash/>}
                  </IBtn>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── SETORES ─────────────────────────────────────────── */}
      {subTab === "setores" && (
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
              <IcoTag/> CRIAR SETOR
            </div>
            <p style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:14 }}>
              Setores aparecem na criação de usuários.
            </p>
            <div style={{ display:"flex", gap:8, alignItems:"end", flexWrap:"wrap" }}>
              <div className="form-group" style={{ marginBottom:0, flex:1, minWidth:160 }}>
                <label className="form-label">Nome do setor *</label>
                <input className="form-input" placeholder="Ex: Operacional, Cozinha..." value={novoSetor}
                  onChange={e => setNovoSetor(e.target.value)} onKeyDown={e => e.key==="Enter" && addSetor()}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Cor</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingTop:6 }}>
                  {CORES_OPCOES.map(c => (
                    <div key={c} onClick={() => setSetorCor(c)}
                      style={{ width:26, height:26, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${novoSetorCor===c?"white":"transparent"}`, boxShadow:novoSetorCor===c?"0 0 0 2px "+c:"none", transition:"all .15s" }}/>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn btn-accent" onClick={addSetor} disabled={savingSetor || !novoSetor.trim()} style={{ marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
              {savingSetor ? <span className="spinner"/> : <><IcoPlus/> CRIAR SETOR</>}
            </button>
          </div>

          {/* Lista setores */}
          <div className="card">
            <div className="card-title">SETORES CADASTRADOS ({setoresCfg.length})</div>
            {setoresCfg.length === 0
              ? <div className="empty">Nenhum setor cadastrado ainda.</div>
              : setoresCfg.map(s => (
                <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)", marginBottom:8 }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", background:s.cor||"#888", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:13, padding:"2px 10px", border:`1px solid ${s.cor||"#888"}`, color:s.cor||"#888", borderRadius:3, background:`${s.cor||"#888"}18` }}>
                      {s.nome}
                    </span>
                  </div>
                  <IBtn danger title="Excluir setor" onClick={() => delSetor(s)} disabled={delSetorId===s.id}>
                    {delSetorId===s.id ? <span className="spinner"/> : <IcoTrash/>}
                  </IBtn>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── RESET BANCO ─────────────────────────────────────── */}
      {subTab === "reset" && (
        <div>
          <div className="card" style={{ border:"1px solid var(--danger)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <IcoNuke/>
              <span style={{ fontFamily:"var(--display)", fontSize:22, letterSpacing:3, color:"var(--danger)" }}>ZERAR BANCO DE UNIFORMES</span>
            </div>

            <div style={{ background:"rgba(248,113,113,.06)", border:"1px solid var(--danger)", borderRadius:"var(--r)", padding:"14px 16px", marginBottom:20 }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--danger)", marginBottom:10, fontWeight:600 }}>
                ⚠ ATENÇÃO — Esta ação é IRREVERSÍVEL
              </div>
              <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", lineHeight:1.7 }}>
                Serão apagados permanentemente:<br/>
                • Todos os <strong style={{ color:"var(--text)" }}>tipos de produto</strong><br/>
                • Todos os <strong style={{ color:"var(--text)" }}>setores</strong><br/>
                • Todo o <strong style={{ color:"var(--text)" }}>catálogo de produtos</strong><br/>
                • Todo o <strong style={{ color:"var(--text)" }}>estoque</strong><br/>
                • Todos os <strong style={{ color:"var(--text)" }}>usuários</strong><br/>
                • Todas as <strong style={{ color:"var(--text)" }}>atribuições</strong><br/>
                • Todo o <strong style={{ color:"var(--text)" }}>log</strong>
              </div>
            </div>

            <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:8 }}>
              Para confirmar, digite <strong style={{ color:"var(--danger)", letterSpacing:2 }}>{PALAVRA_CONFIRM}</strong> abaixo:
            </div>
            <input
              className="form-input"
              placeholder={`Digite ${PALAVRA_CONFIRM}...`}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value.toUpperCase())}
              style={{ marginBottom:14, borderColor: confirmText===PALAVRA_CONFIRM ? "var(--danger)" : "var(--border2)", fontFamily:"var(--mono)", letterSpacing:4, fontSize:16, textAlign:"center" }}
            />
            <button
              onClick={resetarBanco}
              disabled={resetting || confirmText !== PALAVRA_CONFIRM}
              style={{
                width:"100%", padding:"14px", fontFamily:"var(--display)", fontSize:18, letterSpacing:3,
                background: confirmText===PALAVRA_CONFIRM ? "rgba(248,113,113,.15)" : "transparent",
                border:`1px solid ${confirmText===PALAVRA_CONFIRM ? "var(--danger)" : "var(--border2)"}`,
                color: confirmText===PALAVRA_CONFIRM ? "var(--danger)" : "var(--text-dim)",
                cursor: confirmText===PALAVRA_CONFIRM ? "pointer" : "not-allowed",
                borderRadius:"var(--r)", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                opacity: confirmText!==PALAVRA_CONFIRM ? 0.5 : 1, transition:"all .2s",
              }}>
              {resetting ? <><span className="spinner"/> ZERANDO...</> : <><IcoNuke/> ZERAR TUDO</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ESTOQUE — só quantidades
// ============================================================
function EstoqueTab({ tiposCfg, produtos, estoque }) {
  const porTipo = tiposCfg.map(t => ({
    ...t,
    itens: produtos
      .filter(p => p.tipoId === t.id)
      .sort((a, b) => (t.tamanhos||[]).indexOf(a.tamanho) - (t.tamanhos||[]).indexOf(b.tamanho))
      .map(p => {
        const docId = `${p.tipoId}_${p.tamanho}`;
        const est   = estoque.find(e => e.id === docId);
        return { ...p, quantidade: est?.quantidade || 0 };
      }),
    total: 0,
  })).map(t => ({ ...t, total: t.itens.reduce((s, i) => s + i.quantidade, 0) }))
    .filter(t => t.itens.length > 0);

  if (tiposCfg.length === 0 || porTipo.length === 0) {
    return (
      <div className="empty" style={{ paddingTop:60 }}>
        <IcoShirt size={36} color="var(--text-dim)"/>
        <p style={{ marginTop:12 }}>Nenhum produto no estoque ainda.</p>
        <p style={{ marginTop:4, color:"var(--text-dim)", fontSize:11 }}>
          Vá em <strong>Config → Tipos</strong> para criar os tipos, depois em <strong>Produtos</strong> para criar os itens.
        </p>
      </div>
    );
  }

  return (
    <div>
      {porTipo.map(t => (
        <div key={t.id} className="card" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <IcoShirt size={20} color={t.cor}/>
              <span style={{ fontFamily:"var(--display)", fontSize:20, letterSpacing:2, color:t.cor }}>{t.label}</span>
            </div>
            <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)" }}>
              Total: <strong style={{ color: t.total > 0 ? t.cor : "var(--danger)" }}>{t.total}</strong>
            </span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {t.itens.map(item => (
              <div key={`${item.tipoId}_${item.tamanho}`} style={{
                background:"var(--surface2)", borderRadius:"var(--r)", padding:"10px 16px", textAlign:"center", minWidth:72,
                border:`1px solid ${item.quantidade > 0 ? t.cor+"55" : "var(--danger)33"}`,
              }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginBottom:4 }}>{item.tamanho}</div>
                <div style={{ fontFamily:"var(--display)", fontSize:32, lineHeight:1, color: item.quantidade > 0 ? t.cor : "var(--danger)" }}>
                  {item.quantidade}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PRODUTOS — criar/remover do catálogo
// ============================================================
function ProdutosTab({ tiposCfg, produtos, onRefresh, addToast }) {
  const [tipoId, setTipoId] = useState("");
  const [tam, setTam]       = useState("");
  const [saving, setSaving] = useState(false);
  const [delId, setDelId]   = useState(null);

  const tipoSel  = tiposCfg.find(t => t.id === tipoId);
  const tamanhos = tipoSel?.tamanhos || [];

  useEffect(() => {
    if (tiposCfg.length > 0 && !tipoId) setTipoId(tiposCfg[0].id);
  }, [tiposCfg]);
  useEffect(() => {
    if (tamanhos.length > 0 && !tamanhos.includes(tam)) setTam(tamanhos[0]);
  }, [tipoId, tiposCfg]);

  const jaExiste = produtos.some(p => p.tipoId === tipoId && p.tamanho === tam);

  const handleAdd = async () => {
    if (!tipoId || !tam) return;
    if (jaExiste) { addToast("Produto já existe no catálogo.", "error"); return; }
    setSaving(true);
    try {
      const t = tiposCfg.find(t => t.id === tipoId);
      await addDoc(collection(db, C.produtos), {
        tipoId, tipoLabel: t?.label || tipoId, tamanho: tam, criadoEm: serverTimestamp(),
      });
      const docId  = `${tipoId}_${tam}`;
      const estRef = doc(db, C.estoque, docId);
      const estSnap = await getDoc(estRef);
      if (!estSnap.exists()) {
        await setDoc(estRef, { tipoId, tamanho: tam, quantidade: 0, criadoEm: serverTimestamp() });
      }
      addToast(`${t?.label} ${tam} criado!`, "success");
      onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDel = async (p) => {
    if (!confirm(`Remover ${p.tipoLabel} ${p.tamanho}?`)) return;
    setDelId(p.id);
    try {
      await deleteDoc(doc(db, C.produtos, p.id));
      try { await deleteDoc(doc(db, C.estoque, `${p.tipoId}_${p.tamanho}`)); } catch {}
      addToast("Produto removido.", "success");
      onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setDelId(null); }
  };

  const porTipo = tiposCfg.map(t => ({
    ...t,
    itens: produtos.filter(p => p.tipoId === t.id)
      .sort((a, b) => (t.tamanhos||[]).indexOf(a.tamanho) - (t.tamanhos||[]).indexOf(b.tamanho)),
  })).filter(t => t.itens.length > 0);

  if (tiposCfg.length === 0) return (
    <div className="empty" style={{ paddingTop:50 }}>
      <IcoWarn/>
      <p style={{ marginTop:12 }}>Crie tipos de produto primeiro em <strong>Config → Tipos de Produto</strong>.</p>
    </div>
  );

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
          <IcoPkg/> CRIAR PRODUTO NO CATÁLOGO
        </div>
        <p style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", marginBottom:14 }}>
          Escolha o tipo e o tamanho. O estoque iniciará zerado.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, alignItems:"end" }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Tipo</label>
            <select className="form-input" value={tipoId} onChange={e => setTipoId(e.target.value)} style={{ padding:"10px 12px" }}>
              {tiposCfg.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Tamanho</label>
            <select className="form-input" value={tam} onChange={e => setTam(e.target.value)} style={{ padding:"10px 12px" }}>
              {tamanhos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn btn-accent" onClick={handleAdd} disabled={saving || jaExiste || !tipoId} style={{ alignSelf:"end", padding:"12px 16px" }}>
            {saving ? <span className="spinner"/> : <><IcoPlus/> ADD</>}
          </button>
        </div>
        {jaExiste && <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--warn)", marginTop:8, display:"flex", alignItems:"center", gap:6 }}><IcoWarn/> Produto já existe no catálogo.</div>}
      </div>

      {porTipo.length === 0
        ? <div className="empty">Nenhum produto cadastrado ainda.</div>
        : porTipo.map(t => (
          <div key={t.id} className="card" style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <IcoShirt size={18} color={t.cor}/>
              <span style={{ fontFamily:"var(--display)", fontSize:18, letterSpacing:2, color:t.cor }}>{t.label}</span>
              <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>({t.itens.length} tamanhos)</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {t.itens.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)" }}>
                  <span style={{ fontFamily:"var(--display)", fontSize:18, color:t.cor, minWidth:44 }}>{p.tamanho}</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", flex:1 }}>{t.label} tamanho {p.tamanho}</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>{fmtDate(p.criadoEm)}</span>
                  <IBtn danger title="Remover" onClick={() => handleDel(p)} disabled={delId===p.id}>
                    {delId===p.id ? <span className="spinner"/> : <IcoTrash/>}
                  </IBtn>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

// ============================================================
// USUÁRIOS
// ============================================================
function UsuariosTab({ usuarios, atribuicoes, setoresCfg, onRefresh, addToast, onVerUser }) {
  const [nome, setNome]           = useState("");
  const [setor, setSetor]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState(null);
  const [editNome, setEditNome]   = useState("");
  const [editSetor, setEditSetor] = useState("");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (setoresCfg.length > 0 && !setor) setSetor(setoresCfg[0].nome);
  }, [setoresCfg]);

  const filtered = usuarios.filter(u =>
    !search.trim() || u.nome.toLowerCase().includes(search.toLowerCase()) || (u.setor||"").toLowerCase().includes(search.toLowerCase())
  );

  const addUser = async () => {
    const n = nome.trim();
    if (!n) return;
    if (!setor) { addToast("Selecione um setor.", "error"); return; }
    if (usuarios.some(u => u.nome.toLowerCase() === n.toLowerCase())) { addToast("Usuário já existe.", "error"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, C.usuarios), { nome: n, setor, criadoEm: serverTimestamp() });
      addToast(`"${n}" (${setor}) criado!`, "success");
      setNome(""); onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  const saveEdit = async (u) => {
    const n = editNome.trim();
    if (!n) { setEditId(null); return; }
    if (n !== u.nome && usuarios.some(x => x.id !== u.id && x.nome.toLowerCase() === n.toLowerCase())) { addToast("Nome já existe.", "error"); return; }
    try {
      await updateDoc(doc(db, C.usuarios, u.id), { nome: n, setor: editSetor });
      addToast(`Atualizado → "${n}"`, "success");
      setEditId(null); onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
  };

  const delUser = async (u) => {
    if (atribuicoes.some(a => a.userId === u.id)) { addToast("Usuário tem uniformes. Devolva primeiro.", "error"); return; }
    if (!confirm(`Excluir "${u.nome}"?`)) return;
    try {
      await deleteDoc(doc(db, C.usuarios, u.id));
      addToast(`"${u.nome}" excluído.`, "success"); onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
  };

  const qtdAtrib = (uid) => atribuicoes.filter(a => a.userId === uid).reduce((s, a) => s + (a.quantidade||1), 0);

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}><IcoUser/> CADASTRAR USUÁRIO</div>
        {setoresCfg.length === 0 ? (
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--warn)", display:"flex", alignItems:"center", gap:6 }}>
            <IcoWarn/> Crie setores primeiro em <strong>Config → Setores</strong>.
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, alignItems:"end" }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" placeholder="Nome completo..." value={nome}
                onChange={e => setNome(e.target.value)} onKeyDown={e => e.key==="Enter" && addUser()}/>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Setor *</label>
              <select className="form-input" value={setor} onChange={e => setSetor(e.target.value)} style={{ padding:"10px 12px" }}>
                {setoresCfg.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
            <button className="btn btn-accent" onClick={addUser} disabled={saving||!nome.trim()||!setor} style={{ alignSelf:"end", padding:"12px 16px" }}>
              {saving ? <span className="spinner"/> : <IcoPlus/>}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <span style={{ fontFamily:"var(--display)", fontSize:18, letterSpacing:2, color:"var(--accent)" }}>
            USUÁRIOS <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--text-dim)" }}>({usuarios.length})</span>
          </span>
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome ou setor..."/>
        {filtered.length === 0
          ? <div className="empty">Nenhum usuário.</div>
          : [...filtered].sort((a,b) => a.nome.localeCompare(b.nome)).map(u => {
              const qt = qtdAtrib(u.id);
              return (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)", marginBottom:6, cursor:"pointer", transition:"border-color .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="var(--accent)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
                  {editId === u.id ? (
                    <>
                      <input autoFocus value={editNome} onChange={e => setEditNome(e.target.value)}
                        onKeyDown={e => { if(e.key==="Enter")saveEdit(u); if(e.key==="Escape")setEditId(null); }}
                        style={{ flex:1, background:"var(--surface)", border:"1px solid var(--accent)", color:"var(--text)", padding:"6px 10px", fontFamily:"var(--mono)", fontSize:13, outline:"none", borderRadius:"var(--r)" }}
                        onClick={e => e.stopPropagation()}/>
                      <select value={editSetor} onChange={e => setEditSetor(e.target.value)}
                        style={{ background:"var(--surface)", border:"1px solid var(--accent)", color:"var(--text)", padding:"6px 10px", fontFamily:"var(--mono)", fontSize:12, outline:"none", borderRadius:"var(--r)", cursor:"pointer" }}
                        onClick={e => e.stopPropagation()}>
                        {setoresCfg.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                      </select>
                      <IBtn onClick={e => { e.stopPropagation(); saveEdit(u); }}><IcoCheck/></IBtn>
                      <IBtn onClick={e => { e.stopPropagation(); setEditId(null); }}><IcoX/></IBtn>
                    </>
                  ) : (
                    <>
                      <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }} onClick={() => onVerUser(u)}>
                        <IcoUser/>
                        <span style={{ fontFamily:"var(--mono)", fontSize:13 }}>{u.nome}</span>
                        <SetorBadge setor={u.setor} setoresCfg={setoresCfg}/>
                        {qt > 0 && (
                          <span style={{ fontFamily:"var(--mono)", fontSize:10, padding:"2px 8px", border:"1px solid var(--info)", color:"var(--info)", borderRadius:3, background:"rgba(96,165,250,.06)" }}>
                            {qt} peça{qt!==1?"s":""}
                          </span>
                        )}
                      </div>
                      <IBtn info title="Editar" onClick={e => { e.stopPropagation(); setEditId(u.id); setEditNome(u.nome); setEditSetor(u.setor||""); }}>
                        <IcoEdit/>
                      </IBtn>
                      <IBtn danger title="Excluir" onClick={e => { e.stopPropagation(); delUser(u); }}>
                        <IcoTrash/>
                      </IBtn>
                    </>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ─── Ver detalhes do usuário ──────────────────────────────────
function VerUsuario({ user: u, atribuicoes, setoresCfg, tiposCfg, onBack, addToast, onRefresh }) {
  const [modal, setModal] = useState(null);

  const getCorTipo  = (id) => tiposCfg.find(t => t.id === id)?.cor   || "#888";
  const getLabelTipo= (id) => tiposCfg.find(t => t.id === id)?.label || id;

  return (
    <div>
      <button className="btn btn-outline" onClick={onBack} style={{ marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>
        <IcoBack/> Voltar
      </button>
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <IcoUser size={20}/>
          <span style={{ fontFamily:"var(--display)", fontSize:26, letterSpacing:3 }}>{u.nome}</span>
          <SetorBadge setor={u.setor||"—"} setoresCfg={setoresCfg}/>
        </div>
        <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)" }}>
          {atribuicoes.length > 0
            ? `${atribuicoes.reduce((s, a) => s+(a.quantidade||1), 0)} peça(s) atribuída(s)`
            : "Nenhum uniforme atribuído"}
        </div>
      </div>
      {atribuicoes.length === 0
        ? <div className="empty"><IcoShirt size={32} color="var(--text-dim)"/><p style={{ marginTop:10 }}>Nenhum uniforme atribuído.</p></div>
        : atribuicoes.map(a => (
          <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r)", marginBottom:6 }}>
            <IcoShirt size={18} color={getCorTipo(a.tipoId)}/>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:13 }}>
                {getLabelTipo(a.tipoId)} — <strong>{a.tamanho}</strong>
                <span style={{ marginLeft:8, color:"var(--text-dim)" }}>× {a.quantidade||1}</span>
              </div>
              <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginTop:2 }}>
                Atribuído: {fmtDate(a.data)}
              </div>
            </div>
            <button className="btn btn-outline" style={{ fontSize:11, padding:"7px 12px", color:"var(--warn)", borderColor:"var(--warn)" }}
              onClick={() => setModal({ item: a })}>
              <IcoReturn/> Devolver
            </button>
          </div>
        ))}
      {modal && (
        <DevolucaoModal item={modal.item} userName={u.nome} tiposCfg={tiposCfg}
          onClose={() => setModal(null)} onDone={() => { setModal(null); onRefresh(); }} addToast={addToast}/>
      )}
    </div>
  );
}

// ─── Devolução ────────────────────────────────────────────────
function DevolucaoModal({ item, userName, tiposCfg, onClose, onDone, addToast }) {
  const [destino, setDestino] = useState("estoque");
  const [motivo, setMotivo]   = useState("");
  const [saving, setSaving]   = useState(false);
  const ti = tiposCfg.find(t => t.id === item.tipoId) || { label: item.tipoLabel||item.tipoId, cor:"#888" };

  const confirmar = async () => {
    if (destino==="descarte" && !motivo.trim()) { addToast("Informe o motivo.", "error"); return; }
    setSaving(true);
    try {
      await deleteDoc(doc(db, C.atrib, item.id));
      if (destino === "estoque") {
        const docId = `${item.tipoId}_${item.tamanho}`;
        const ref   = doc(db, C.estoque, docId);
        const snap  = await getDoc(ref);
        if (snap.exists()) await updateDoc(ref, { quantidade: (snap.data().quantidade||0) + (item.quantidade||1) });
        else await setDoc(ref, { tipoId: item.tipoId, tamanho: item.tamanho, quantidade: item.quantidade||1, criadoEm: serverTimestamp() });
        addToast("Devolvido ao estoque!", "success");
      } else {
        await addDoc(collection(db, C.log), { acao:"descarte", usuario:userName, tipoId:item.tipoId, tipoLabel:ti.label, tamanho:item.tamanho, quantidade:item.quantidade||1, motivo:motivo.trim(), ts:serverTimestamp() });
        addToast("Enviado para descarte.", "info");
      }
      onDone();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="DEVOLUÇÃO" onClose={onClose} borderColor="var(--warn)" maxWidth={440}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", letterSpacing:2, marginBottom:6 }}>PEÇA</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)", padding:"12px 16px" }}>
          <IcoShirt size={22} color={ti.cor}/>
          <div>
            <div style={{ fontFamily:"var(--display)", fontSize:20, letterSpacing:2 }}>{ti.label} — {item.tamanho}</div>
            <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)" }}>
              Usuário: {userName} · {item.quantidade||1} peça{(item.quantidade||1)!==1?"s":""}
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", letterSpacing:2, marginBottom:8 }}>DESTINO</div>
        <div style={{ display:"flex", gap:8 }}>
          {[{ val:"estoque",label:"↩ Devolver ao estoque",cor:"var(--success)" },{ val:"descarte",label:"🗑 Descartar",cor:"var(--danger)" }].map(op => (
            <div key={op.val} onClick={() => setDestino(op.val)} style={{ flex:1, padding:"12px 14px", cursor:"pointer", border:`2px solid ${destino===op.val?op.cor:"var(--border)"}`, borderRadius:"var(--r)", background:destino===op.val?`${op.cor}12`:"var(--surface2)", textAlign:"center", transition:"all .15s" }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:12, color:destino===op.val?op.cor:"var(--text-dim)" }}>{op.label}</div>
            </div>
          ))}
        </div>
      </div>
      {destino === "descarte" && (
        <div className="form-group" style={{ marginBottom:16 }}>
          <label className="form-label" style={{ display:"flex", alignItems:"center", gap:6 }}><IcoWarn/> MOTIVO *</label>
          <textarea rows={3} placeholder="Ex: rasgada, desgastada..." value={motivo} onChange={e => setMotivo(e.target.value)}
            style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border2)", color:"var(--text)", padding:"10px 12px", fontFamily:"var(--mono)", fontSize:13, outline:"none", borderRadius:"var(--r)", resize:"vertical" }}/>
        </div>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <button className="btn btn-outline" onClick={onClose} style={{ flex:1 }}>Cancelar</button>
        <button onClick={confirmar} disabled={saving} style={{ flex:1, background:destino==="descarte"?"rgba(248,113,113,.15)":"rgba(74,222,128,.15)", border:`1px solid ${destino==="descarte"?"var(--danger)":"var(--success)"}`, color:destino==="descarte"?"var(--danger)":"var(--success)", padding:"12px 16px", fontFamily:"var(--display)", fontSize:16, letterSpacing:2, cursor:"pointer", borderRadius:"var(--r)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {saving ? <span className="spinner"/> : destino==="descarte" ? "DESCARTAR" : "DEVOLVER"}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// ALL
// ============================================================
function AllTab({ usuarios, atribuicoes, setoresCfg, tiposCfg, onVerUser }) {
  const [search, setSearch]   = useState("");
  const [filtroS, setFiltroS] = useState("");

  const getCorTipo = (id) => tiposCfg.find(t => t.id === id)?.cor || "#888";

  const filtered = usuarios.filter(u => {
    const ms = !search.trim() || u.nome.toLowerCase().includes(search.toLowerCase()) || (u.setor||"").toLowerCase().includes(search.toLowerCase());
    const mf = !filtroS || u.setor === filtroS;
    return ms && mf;
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  const getAtrib  = (uid) => atribuicoes.filter(a => a.userId === uid);
  const totalPcas = (uid) => getAtrib(uid).reduce((s, a) => s+(a.quantidade||1), 0);

  return (
    <div>
      {/* Filtros setor */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
        {setoresCfg.map(s => {
          const count = usuarios.filter(u => u.setor === s.nome).length;
          const cor   = s.cor || "#888";
          const ativo = filtroS === s.nome;
          return (
            <div key={s.id} onClick={() => setFiltroS(ativo ? "" : s.nome)}
              style={{ padding:"8px 14px", background:ativo?`${cor}22`:"var(--surface)", border:`1px solid ${ativo?cor:"var(--border)"}`, borderRadius:"var(--r)", cursor:"pointer", transition:"all .15s", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:"var(--mono)", fontSize:11, color:ativo?cor:"var(--text-dim)" }}>{s.nome}</span>
              <span style={{ fontFamily:"var(--display)", fontSize:18, color:cor }}>{count}</span>
            </div>
          );
        })}
        {filtroS && (
          <button onClick={() => setFiltroS("")} style={{ padding:"8px 12px", background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--r)", color:"var(--text-dim)", cursor:"pointer", fontFamily:"var(--mono)", fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
            <IcoX/> Limpar
          </button>
        )}
      </div>

      <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome ou setor..."/>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">
            {filtered.length} usuário{filtered.length!==1?"s":""}{filtroS?` · ${filtroS}`:""}
          </div>
        </div>
        {filtered.length === 0
          ? <div className="empty">Nenhum usuário.</div>
          : filtered.map(u => {
              const atribs = getAtrib(u.id);
              const total  = totalPcas(u.id);
              const cfg    = setoresCfg.find(s => s.nome === u.setor);
              const cor    = cfg?.cor || "#888";
              return (
                <div key={u.id} onClick={() => onVerUser(u)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderBottom:"1px solid var(--border)", cursor:"pointer", transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`${cor}22`, border:`1px solid ${cor}55`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:"var(--display)", fontSize:18, color:cor }}>{u.nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"var(--sans)", fontSize:14, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.nome}</div>
                    <div style={{ marginTop:3 }}><SetorBadge setor={u.setor||"—"} setoresCfg={setoresCfg}/></div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                    {total > 0 ? (
                      <>
                        <span style={{ fontFamily:"var(--display)", fontSize:22, color:"var(--info)", lineHeight:1 }}>{total}</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)" }}>peça{total!==1?"s":""}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>sem uniforme</span>
                    )}
                  </div>
                  {atribs.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                      {[...new Set(atribs.map(a => a.tipoId))].map(tid => (
                        <IcoShirt key={tid} size={14} color={getCorTipo(tid)}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ============================================================
// ATRIBUIR
// ============================================================
function AtribuirTab({ usuarios, tiposCfg, produtos, estoque, setoresCfg, onRefresh, addToast }) {
  const [userId, setUserId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [tam, setTam]       = useState("");
  const [qtd, setQtd]       = useState(1);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const tiposDisp = tiposCfg.filter(t => produtos.some(p => p.tipoId === t.id));
  const tamsDisp  = produtos.filter(p => p.tipoId === tipoId).map(p => p.tamanho)
    .sort((a, b) => {
      const lista = tiposCfg.find(t => t.id === tipoId)?.tamanhos || [];
      return lista.indexOf(a) - lista.indexOf(b);
    });

  useEffect(() => { if(tiposDisp.length>0 && !tiposDisp.find(t=>t.id===tipoId)) setTipoId(tiposDisp[0].id); }, [produtos, tiposCfg]);
  useEffect(() => { if(tamsDisp.length>0 && !tamsDisp.includes(tam)) setTam(tamsDisp[0]); }, [tipoId, produtos]);

  const docId   = tipoId && tam ? `${tipoId}_${tam}` : "";
  const itemEst = estoque.find(e => e.id === docId);
  const dispQtd = itemEst?.quantidade || 0;

  const usersFiltered = usuarios.filter(u => !search.trim() || u.nome.toLowerCase().includes(search.toLowerCase()));

  const handleAtribuir = async () => {
    if (!userId)        { addToast("Selecione um usuário.", "error"); return; }
    if (!tipoId||!tam)  { addToast("Selecione tipo e tamanho.", "error"); return; }
    if (dispQtd < qtd)  { addToast(`Estoque insuficiente. Disponível: ${dispQtd}.`, "error"); return; }
    setSaving(true);
    try {
      const u    = usuarios.find(u => u.id === userId);
      const tipo = tiposCfg.find(t => t.id === tipoId);
      await addDoc(collection(db, C.atrib), {
        userId, userName:u.nome, userSetor:u.setor||"",
        tipoId, tipoLabel:tipo?.label||tipoId, tamanho:tam, quantidade:qtd, data:serverTimestamp(),
      });
      await updateDoc(doc(db, C.estoque, docId), { quantidade: dispQtd - qtd });
      await addDoc(collection(db, C.log), { acao:"atribuicao", usuario:u.nome, setor:u.setor||"", tipoId, tipoLabel:tipo?.label||tipoId, tamanho:tam, quantidade:qtd, ts:serverTimestamp() });
      addToast(`${qtd}x ${tipo?.label} ${tam} → ${u.nome}!`, "success");
      setQtd(1); onRefresh();
    } catch(e) { addToast("Erro: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  if (tiposDisp.length === 0) return (
    <div className="empty" style={{ paddingTop:50 }}>
      <IcoWarn/>
      <p style={{ marginTop:12 }}>Crie produtos na aba <strong>Produtos</strong> primeiro.</p>
    </div>
  );

  return (
    <div>
      <div className="card">
        <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
          <IcoShirt size={18} color="var(--accent)"/> ATRIBUIR UNIFORME
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px", gap:8, marginBottom:12 }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Tipo</label>
            <select className="form-input" value={tipoId} onChange={e => setTipoId(e.target.value)} style={{ padding:"10px 12px" }}>
              {tiposDisp.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Tamanho</label>
            <select className="form-input" value={tam} onChange={e => setTam(e.target.value)} style={{ padding:"10px 12px" }}>
              {tamsDisp.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Qtd</label>
            <input className="form-input" type="number" min={1} max={dispQtd||1} value={qtd}
              onChange={e => setQtd(Math.max(1,parseInt(e.target.value)||1))} style={{ padding:"10px 12px" }}/>
          </div>
        </div>
        <div style={{ marginBottom:14, padding:"8px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)", fontFamily:"var(--mono)", fontSize:12 }}>
          <span style={{ color:"var(--text-dim)" }}>Disponível: </span>
          <strong style={{ color:dispQtd>0?"var(--success)":"var(--danger)" }}>{dispQtd} peça{dispQtd!==1?"s":""}</strong>
        </div>
        <div className="form-group" style={{ marginBottom:10 }}>
          <label className="form-label">Usuário</label>
          <SearchBox value={search} onChange={setSearch} placeholder="Buscar usuário..."/>
          <div style={{ maxHeight:200, overflowY:"auto", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--r)" }}>
            {[...usersFiltered].sort((a,b)=>a.nome.localeCompare(b.nome)).map(u => (
              <div key={u.id} onClick={() => setUserId(u.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid var(--border)", background:userId===u.id?"rgba(245,166,35,.08)":"transparent", transition:"background .1s" }}>
                {userId===u.id && <IcoCheck/>}
                <span style={{ flex:1, fontFamily:"var(--mono)", fontSize:13, color:userId===u.id?"var(--accent)":"var(--text)" }}>{u.nome}</span>
                <SetorBadge setor={u.setor||"—"} setoresCfg={setoresCfg}/>
              </div>
            ))}
            {usersFiltered.length===0 && <div style={{ padding:"12px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text-dim)" }}>Nenhum usuário</div>}
          </div>
        </div>
        <button className="btn btn-accent btn-lg btn-full" onClick={handleAtribuir} disabled={saving||!userId||dispQtd<1}>
          {saving ? <span className="spinner"/> : <><IcoShirt size={16} color="#0a0a0a"/> ATRIBUIR</>}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// LOG
// ============================================================
function LogTab({ tiposCfg, setoresCfg }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    (async () => {
      setLoad(true);
      try {
        const s = await getDocs(query(collection(db, C.log), orderBy("ts", "desc")));
        setLogs(s.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch {}
      finally { setLoad(false); }
    })();
  }, []);

  const ai = (acao) => ({
    criar_produto:   { label:"Produto criado",  dot:"var(--accent)"  },
    remover_produto: { label:"Produto removido",dot:"var(--danger)"  },
    atribuicao:      { label:"Atribuição",       dot:"var(--info)"   },
    devolucao_estoque:{label:"Devolução",        dot:"var(--warn)"   },
    descarte:        { label:"Descarte",         dot:"var(--danger)" },
    criar_usuario:   { label:"Novo Usuário",     dot:"var(--accent)" },
    editar_usuario:  { label:"Editar Usuário",   dot:"var(--accent)" },
    excluir_usuario: { label:"Excluir Usuário",  dot:"var(--danger)" },
  }[acao] || { label: acao, dot:"var(--text-dim)" });

  if (loading) return <div className="empty"><span className="spinner" style={{ width:28, height:28, borderWidth:3 }}/></div>;

  return (
    <div className="card">
      <div className="card-title">HISTÓRICO</div>
      {logs.length === 0
        ? <div className="empty">Nenhum registro.</div>
        : logs.map(l => {
            const { label, dot } = ai(l.acao);
            const tipoCor = tiposCfg.find(t => t.id === l.tipoId)?.cor;
            return (
              <div key={l.id} style={{ display:"grid", gridTemplateColumns:"10px 1fr auto", gap:10, alignItems:"start", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:dot, marginTop:5, flexShrink:0 }}/>
                <div>
                  <div style={{ fontFamily:"var(--mono)", fontSize:12 }}>
                    {label}
                    {l.tipoLabel && <> · <strong style={{ color:tipoCor||"var(--accent)" }}>{l.tipoLabel} {l.tamanho}</strong> ×{l.quantidade||1}</>}
                    {l.usuario   && <span style={{ color:"var(--text-dim)" }}> → {l.usuario}</span>}
                    {l.setor     && <span style={{ marginLeft:6 }}><SetorBadge setor={l.setor} setoresCfg={setoresCfg}/></span>}
                    {l.nome      && <span style={{ color:"var(--text-dim)" }}> · {l.nome}</span>}
                    {l.de        && <span style={{ color:"var(--text-dim)" }}> {l.de} → {l.para}</span>}
                  </div>
                  {l.motivo && <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--danger)", marginTop:2 }}>Motivo: {l.motivo}</div>}
                </div>
                <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", whiteSpace:"nowrap" }}>{fmtDate(l.ts)}</div>
              </div>
            );
          })}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const TABS = [
  { id:"estoque",  label:"Estoque",  I: IcoBox                                    },
  { id:"produtos", label:"Produtos", I: IcoPkg                                    },
  { id:"usuarios", label:"Usuários", I: () => <IcoUser size={15}/>                },
  { id:"all",      label:"All",      I: () => <IcoUsers size={15}/>               },
  { id:"atribuir", label:"Atribuir", I: () => <IcoShirt size={15} color="currentColor"/> },
  { id:"config",   label:"Config",   I: IcoCfg                                    },
  { id:"log",      label:"Log",      I: IcoSearch                                 },
];

export function Uniformes({ user }) {
  const [tab, setTab]           = useState("estoque");
  const [tiposCfg, setTiposCfg] = useState([]);
  const [setoresCfg, setSetCfg] = useState([]);
  const [produtos, setProd]     = useState([]);
  const [estoque, setEst]       = useState([]);
  const [usuarios, setUsers]    = useState([]);
  const [atrib, setAtrib]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [verUser, setVerUser]   = useState(null);
  const { add: addToast, Toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tc, sc, p, e, u, a] = await Promise.all([
        getDocs(collection(db, C.tipos)),
        getDocs(collection(db, C.setores)),
        getDocs(collection(db, C.produtos)),
        getDocs(collection(db, C.estoque)),
        getDocs(collection(db, C.usuarios)),
        getDocs(collection(db, C.atrib)),
      ]);
      setTiposCfg(tc.docs.map(d => ({ id:d.id, ...d.data() })));
      setSetCfg(sc.docs.map(d => ({ id:d.id, ...d.data() })));
      setProd(p.docs.map(d => ({ id:d.id, ...d.data() })));
      setEst(e.docs.map(d => ({ id:d.id, ...d.data() })));
      setUsers(u.docs.map(d => ({ id:d.id, ...d.data() })));
      setAtrib(a.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(err) { addToast("Erro ao carregar: " + err.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const totalEst   = estoque.reduce((s, e) => s+(e.quantidade||0), 0);
  const totalAtrib = atrib.reduce((s, a) => s+(a.quantidade||1), 0);

  // Sub-tela: detalhe do usuário
  if (verUser) return (
    <>
      <VerUsuario
        user={verUser}
        atribuicoes={atrib.filter(a => a.userId === verUser.id)}
        setoresCfg={setoresCfg}
        tiposCfg={tiposCfg}
        onBack={() => { setVerUser(null); load(); }}
        addToast={addToast}
        onRefresh={load}
      />
      <Toast/>
    </>
  );

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <IcoShirt size={28} color="#f5a623"/>
          <h1 style={{ fontFamily:"var(--display)", fontSize:32, letterSpacing:4, color:"var(--accent)" }}>UNIFORMES</h1>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[
            { label:"Em estoque", val:totalEst,        cor:"var(--success)" },
            { label:"Atribuídos", val:totalAtrib,      cor:"var(--info)"    },
            { label:"Usuários",   val:usuarios.length, cor:"var(--accent)"  },
            { label:"Produtos",   val:produtos.length, cor:"#a855f7"        },
          ].map(s => (
            <div key={s.label} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r)", padding:"8px 16px", display:"flex", flexDirection:"column", gap:2 }}>
              <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", letterSpacing:2, textTransform:"uppercase" }}>{s.label}</span>
              <span style={{ fontFamily:"var(--display)", fontSize:22, color:s.cor }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, background:"var(--surface2)", border:"1px solid var(--border2)", padding:4, borderRadius:"var(--r)", marginBottom:18, width:"fit-content", flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
              fontFamily:"var(--mono)", fontSize:11, letterSpacing:1, textTransform:"uppercase",
              cursor:"pointer", border:"none", borderRadius:2, transition:"all .15s",
              background: tab===t.id ? (t.id==="config"?"var(--accent)":"var(--accent)") : "transparent",
              color: tab===t.id ? "#0a0a0a" : "var(--text-dim)",
              fontWeight: tab===t.id ? 600 : 400,
            }}>
            <t.I/> {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading
        ? <div className="empty"><span className="spinner" style={{ width:28, height:28, borderWidth:3 }}/></div>
        : <>
          {tab==="estoque"  && <EstoqueTab  tiposCfg={tiposCfg} produtos={produtos} estoque={estoque}/>}
          {tab==="produtos" && <ProdutosTab tiposCfg={tiposCfg} produtos={produtos} onRefresh={load} addToast={addToast}/>}
          {tab==="usuarios" && <UsuariosTab usuarios={usuarios} atribuicoes={atrib} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast} onVerUser={setVerUser}/>}
          {tab==="all"      && <AllTab      usuarios={usuarios} atribuicoes={atrib} setoresCfg={setoresCfg} tiposCfg={tiposCfg} onVerUser={setVerUser}/>}
          {tab==="atribuir" && <AtribuirTab usuarios={usuarios} tiposCfg={tiposCfg} produtos={produtos} estoque={estoque} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast}/>}
          {tab==="config"   && <ConfigTab   tiposCfg={tiposCfg} setoresCfg={setoresCfg} onRefresh={load} addToast={addToast}/>}
          {tab==="log"      && <LogTab      tiposCfg={tiposCfg} setoresCfg={setoresCfg}/>}
        </>}

      <Toast/>
    </>
  );
}

export default Uniformes;