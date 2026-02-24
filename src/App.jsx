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
  measurementId: "G-KLRJRN9EHD",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

const SETORES = {
  ti:      { label:"TI",      icon:"💻", color:"#3b82f6", col:"estoque_ti"      },
  exfood:  { label:"Exfood",  icon:"🍽️", color:"#f5a623", col:"estoque_exfood"  },
  limpeza: { label:"Limpeza", icon:"🧹", color:"#52c41a", col:"estoque_limpeza" },
};

// Coleções do Firestore por setor
const getCol   = (setor, type) => `${SETORES[setor].col}_${type}`;
// type = "produtos" | "categorias" | "log"

// ── helpers
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR");
};

// ============================================================
// ESTILOS
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
  :root {
    --bg:#0a0a0a; --surface:#141414; --surface2:#1c1c1c; --surface3:#242424;
    --border:#2a2a2a; --border2:#333;
    --accent:#f5a623; --accent2:#e85d04;
    --success:#4ade80; --danger:#f87171; --info:#60a5fa;
    --text:#f0f0f0; --text-dim:#777; --text-mid:#aaa;
    --mono:'IBM Plex Mono',monospace;
    --sans:'IBM Plex Sans',sans-serif;
    --display:'Bebas Neue',sans-serif;
    --radius:2px;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;}
  .app{min-height:100vh;display:flex;flex-direction:column;}

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar{width:6px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}

  /* ── HEADER ── */
  .header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .header-logo{font-family:var(--display);font-size:24px;letter-spacing:4px;color:var(--accent);display:flex;align-items:center;gap:10px;}
  .header-logo .setor-tag{font-family:var(--mono);font-size:11px;letter-spacing:2px;padding:3px 10px;border:1px solid;margin-left:4px;}
  .header-right{display:flex;align-items:center;gap:8px;}
  .hbtn{background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:5px 14px;font-family:var(--mono);font-size:11px;cursor:pointer;transition:all .2s;text-transform:uppercase;letter-spacing:1px;border-radius:var(--radius);}
  .hbtn:hover{border-color:var(--accent);color:var(--accent);}
  .hbtn.danger:hover{border-color:var(--danger);color:var(--danger);}

  /* ── LOGIN ── */
  .login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:radial-gradient(circle at 20% 50%,rgba(245,166,35,.04) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(59,130,246,.04) 0%,transparent 50%);}
  .login-card{background:var(--surface);border:1px solid var(--border2);padding:52px 44px;width:420px;}
  .login-card::after{content:'';display:block;height:3px;background:linear-gradient(90deg,var(--accent),var(--accent2));margin-top:48px;margin-left:-44px;width:calc(100% + 88px);}
  .login-title{font-family:var(--display);font-size:52px;letter-spacing:5px;color:var(--text);line-height:1;margin-bottom:2px;}
  .login-title span{color:var(--accent);}
  .login-sub{font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:3px;text-transform:uppercase;margin-bottom:40px;}

  /* ── SETOR SELECT ── */
  .setor-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;gap:48px;background:var(--bg);background-image:radial-gradient(circle at 50% 50%,rgba(245,166,35,.03) 0%,transparent 60%);}
  .setor-heading{text-align:center;}
  .setor-heading h2{font-family:var(--display);font-size:48px;letter-spacing:5px;color:var(--text);margin-bottom:8px;}
  .setor-heading p{font-family:var(--mono);font-size:12px;color:var(--text-dim);letter-spacing:2px;}
  .setor-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;width:100%;max-width:820px;}
  .setor-card{background:var(--surface);border:1px solid var(--border);padding:44px 20px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;align-items:center;gap:18px;position:relative;overflow:hidden;}
  .setor-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;opacity:0;transition:opacity .3s;}
  .setor-card:hover{transform:translateY(-6px);border-color:var(--c);}
  .setor-card:hover::after{opacity:1;}
  .setor-card-icon{font-size:56px;line-height:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4));}
  .setor-card-name{font-family:var(--display);font-size:36px;letter-spacing:3px;color:var(--c);}
  .setor-card-sub{font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;}

  /* ── LAYOUT MAIN ── */
  .main-layout{display:flex;flex:1;overflow:hidden;}
  .sidebar{width:210px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;}
  .sidebar-setor{padding:16px;border-bottom:1px solid var(--border);}
  .sidebar-setor-label{font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}
  .sidebar-setor-name{font-family:var(--display);font-size:22px;letter-spacing:2px;}
  .sidebar-nav{padding:8px 0;flex:1;}
  .sidebar-group{padding:16px 16px 4px;font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;}
  .sitem{display:flex;align-items:center;gap:10px;padding:10px 16px;font-family:var(--mono);font-size:12px;color:var(--text-dim);cursor:pointer;transition:all .15s;border-left:2px solid transparent;letter-spacing:.5px;}
  .sitem:hover{background:var(--surface2);color:var(--text);}
  .sitem.active{border-left-color:var(--accent);color:var(--accent);background:rgba(245,166,35,.06);}
  .sitem-icon{font-size:14px;width:18px;text-align:center;}
  .content{flex:1;overflow-y:auto;padding:32px;}

  /* ── FORMS ── */
  .form-group{margin-bottom:18px;}
  .form-label{display:block;font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:7px;}
  .form-input,.form-select{width:100%;background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:11px 13px;font-family:var(--mono);font-size:13px;outline:none;transition:border-color .2s;border-radius:var(--radius);}
  .form-input:focus,.form-select:focus{border-color:var(--accent);}
  .form-input:disabled,.form-select:disabled{opacity:.4;}
  .form-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .form-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}

  /* ── BUTTONS ── */
  .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;font-family:var(--mono);font-size:12px;cursor:pointer;transition:all .2s;border-radius:var(--radius);letter-spacing:.5px;border:1px solid transparent;}
  .btn-accent{background:var(--accent);color:#0a0a0a;border-color:var(--accent);}
  .btn-accent:hover:not(:disabled){background:var(--accent2);border-color:var(--accent2);}
  .btn-outline{background:transparent;color:var(--text-dim);border-color:var(--border2);}
  .btn-outline:hover:not(:disabled){border-color:var(--accent);color:var(--accent);}
  .btn-danger{background:transparent;color:var(--danger);border-color:var(--danger);}
  .btn-danger:hover:not(:disabled){background:var(--danger);color:white;}
  .btn-success{background:var(--success);color:#0a0a0a;border-color:var(--success);}
  .btn-success:hover:not(:disabled){filter:brightness(1.1);}
  .btn:disabled{opacity:.4;cursor:not-allowed;}
  .btn-lg{padding:13px 28px;font-size:13px;}
  .btn-full{width:100%;justify-content:center;}
  .btn-icon-sm{background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:5px 9px;cursor:pointer;font-size:12px;transition:all .15s;border-radius:var(--radius);}
  .btn-icon-sm:hover{border-color:var(--danger);color:var(--danger);}
  .btn-icon-sm:disabled{opacity:.4;cursor:not-allowed;}

  /* ── PAGE HEADER ── */
  .page-hd{margin-bottom:28px;}
  .page-title{font-family:var(--display);font-size:34px;letter-spacing:4px;color:var(--text);line-height:1;}
  .page-sub{font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-top:4px;letter-spacing:.5px;}

  /* ── CARDS STAT ── */
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px;}
  .stat-card{background:var(--surface);border:1px solid var(--border);padding:22px;position:relative;}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c,var(--accent));}
  .stat-label{font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
  .stat-value{font-family:var(--display);font-size:44px;line-height:1;}
  .stat-sub{font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:6px;}

  /* ── TABLE ── */
  .table-card{background:var(--surface);border:1px solid var(--border);overflow:hidden;margin-bottom:20px;}
  .table-card-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);}
  .table-card-title{font-family:var(--mono);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--text-mid);}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl thead tr{background:var(--surface2);}
  .tbl thead th{padding:10px 18px;text-align:left;font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--border);}
  .tbl tbody tr{border-bottom:1px solid var(--border);transition:background .1s;}
  .tbl tbody tr:hover{background:var(--surface2);}
  .tbl tbody tr:last-child{border-bottom:none;}
  .tbl tbody td{padding:12px 18px;font-family:var(--mono);font-size:12px;}

  /* ── BADGE ── */
  .badge{display:inline-block;padding:2px 9px;font-size:9px;letter-spacing:1px;text-transform:uppercase;border:1px solid;font-family:var(--mono);border-radius:var(--radius);}
  .badge-ok{color:var(--success);border-color:var(--success);background:rgba(74,222,128,.06);}
  .badge-low{color:var(--accent);border-color:var(--accent);background:rgba(245,166,35,.06);}
  .badge-zero{color:var(--danger);border-color:var(--danger);background:rgba(248,113,113,.06);}
  .badge-in{color:var(--success);border-color:var(--success);background:rgba(74,222,128,.06);}
  .badge-out{color:var(--danger);border-color:var(--danger);background:rgba(248,113,113,.06);}

  /* ── CARD FORM ── */
  .card{background:var(--surface);border:1px solid var(--border);padding:24px;margin-bottom:20px;border-radius:var(--radius);}
  .card-title{font-family:var(--display);font-size:20px;letter-spacing:2px;color:var(--accent);margin-bottom:20px;}

  /* ── ERROR ── */
  .err-msg{background:rgba(248,113,113,.08);border:1px solid var(--danger);color:var(--danger);padding:10px 14px;font-family:var(--mono);font-size:12px;margin-top:14px;border-radius:var(--radius);}

  /* ── SCAN BTN ── */
  .btn-scan{background:var(--surface2);border:1px dashed var(--border2);color:var(--text-dim);padding:13px;font-family:var(--mono);font-size:12px;cursor:pointer;transition:all .2s;width:100%;display:flex;align-items:center;gap:8px;justify-content:center;letter-spacing:1px;border-radius:var(--radius);}
  .btn-scan:hover{border-color:var(--accent);color:var(--accent);background:rgba(245,166,35,.05);}

  /* ── SCANNER FULLSCREEN ── */
  .scanner-fs{position:fixed;inset:0;z-index:2000;background:#000;display:flex;flex-direction:column;}
  .scanner-video-bg{flex:1;position:relative;overflow:hidden;}
  .scanner-video-bg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  .scan-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent) 30%,var(--accent) 70%,transparent);box-shadow:0 0 12px 3px rgba(245,166,35,.6);animation:sl 2.5s ease-in-out infinite;z-index:10;}
  @keyframes sl{0%{top:5%;}50%{top:93%;}100%{top:5%;}}
  .scan-vig{position:absolute;inset:0;background:radial-gradient(ellipse 75% 55% at 50% 50%,transparent 35%,rgba(0,0,0,.6) 100%);pointer-events:none;z-index:5;}
  .scan-corners{position:absolute;inset:0;pointer-events:none;z-index:6;}
  .scan-c{position:absolute;width:36px;height:36px;border-color:var(--accent);border-style:solid;opacity:.9;}
  .scan-c.tl{top:20px;left:20px;border-width:2px 0 0 2px;}
  .scan-c.tr{top:20px;right:20px;border-width:2px 2px 0 0;}
  .scan-c.bl{bottom:130px;left:20px;border-width:0 0 2px 2px;}
  .scan-c.br{bottom:130px;right:20px;border-width:0 2px 2px 0;}
  .scanner-bar{background:rgba(10,10,10,.97);border-top:1px solid var(--border2);padding:14px 20px 16px;display:flex;flex-direction:column;gap:10px;}
  .scanner-bar-row1{display:flex;align-items:center;justify-content:space-between;gap:12px;}
  .scanner-bar-title{font-family:var(--display);font-size:18px;letter-spacing:3px;color:var(--accent);}
  .scanner-status{font-family:var(--mono);font-size:12px;color:var(--text-dim);flex:1;}
  .scanner-status.ok{color:var(--success);}
  .scanner-status.err{color:var(--danger);}
  .scanner-manual{display:flex;gap:8px;}
  .scanner-manual input{flex:1;background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:10px 13px;font-family:var(--mono);font-size:13px;outline:none;border-radius:var(--radius);}
  .scanner-manual input:focus{border-color:var(--accent);}
  .scanner-manual button{background:var(--accent);color:#0a0a0a;border:none;padding:10px 20px;font-family:var(--display);font-size:16px;letter-spacing:2px;cursor:pointer;border-radius:var(--radius);}
  .cam-select{display:flex;align-items:center;gap:8px;}
  .cam-select label{font-family:var(--mono);font-size:10px;color:var(--text-dim);white-space:nowrap;letter-spacing:1px;}
  .cam-select select{flex:1;background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:6px 10px;font-family:var(--mono);font-size:11px;outline:none;cursor:pointer;max-width:300px;border-radius:var(--radius);}
  .cdots{display:flex;align-items:center;gap:5px;padding:5px 10px;background:var(--surface2);border:1px solid var(--border);}
  .cdot{width:8px;height:8px;border-radius:50%;background:var(--border2);transition:background .2s;}
  .cdot.on{background:var(--accent);}
  .cdot.done{background:var(--success);}

  /* ── RESULTADO SAÍDA ── */
  .found-card{background:var(--surface2);border:1px solid var(--border2);padding:20px;margin:16px 0;border-radius:var(--radius);}
  .found-card.match{border-color:var(--accent);}
  .found-name{font-family:var(--display);font-size:28px;letter-spacing:2px;margin-bottom:6px;}
  .found-info{font-family:var(--mono);font-size:11px;color:var(--text-dim);}

  /* ── LOG ── */
  .log-entry{display:grid;grid-template-columns:24px 1fr auto;gap:12px;align-items:start;padding:12px 0;border-bottom:1px solid var(--border);}
  .log-entry:last-child{border-bottom:none;}
  .log-dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;}
  .log-dot.in{background:var(--success);}
  .log-dot.out{background:var(--danger);}
  .log-dot.config{background:var(--info);}
  .log-body{flex:1;}
  .log-action{font-family:var(--mono);font-size:12px;color:var(--text);}
  .log-detail{font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px;}
  .log-time{font-family:var(--mono);font-size:10px;color:var(--text-dim);white-space:nowrap;}

  /* ── TAGS ── */
  .tag{display:inline-flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border2);padding:4px 10px;font-family:var(--mono);font-size:11px;border-radius:var(--radius);}
  .tag button{background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:12px;padding:0;line-height:1;}
  .tag button:hover{color:var(--danger);}

  /* ── MODALS ── */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(2px);}
  .modal{background:var(--surface);border:1px solid var(--border2);padding:28px;width:440px;max-width:95vw;}
  .modal-title{font-family:var(--display);font-size:22px;letter-spacing:2px;color:var(--accent);margin-bottom:20px;}
  .modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}

  /* ── TOAST ── */
  .toast-wrap{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;}
  .toast{padding:12px 18px;font-family:var(--mono);font-size:12px;border-left:3px solid;min-width:280px;animation:tin .3s ease;backdrop-filter:blur(4px);}
  .toast-success{background:rgba(20,30,20,.95);border-color:var(--success);color:var(--success);}
  .toast-error{background:rgba(30,15,15,.95);border-color:var(--danger);color:var(--danger);}
  .toast-info{background:rgba(20,20,30,.95);border-color:var(--info);color:var(--info);}
  @keyframes tin{from{transform:translateX(110%);opacity:0;}to{transform:translateX(0);opacity:1;}}

  .empty{text-align:center;padding:48px;font-family:var(--mono);font-size:12px;color:var(--text-dim);}
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .divider{height:1px;background:var(--border);margin:20px 0;}
`;

// ============================================================
// SCANNER — tela cheia, confirmação tripla
// ============================================================
const CONFIRMS = 3;
function ScannerModal({ onScan, onClose, title }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const animRef    = useRef(null);
  const detRef     = useRef(null);
  const scanRef    = useRef(false);
  const histRef    = useRef([]);
  const focTimer   = useRef(null);
  const [cams, setCams]       = useState([]);
  const [selCam, setSelCam]   = useState("");
  const [status, setStatus]   = useState({ msg:"Iniciando...", t:"" });
  const [cnt, setCnt]         = useState(0);
  const [pend, setPend]       = useState("");
  const [manual, setManual]   = useState("");
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video:true });
        tmp.getTracks().forEach(t=>t.stop());
        const devs = await navigator.mediaDevices.enumerateDevices();
        const vids = devs.filter(d=>d.kind==="videoinput");
        setCams(vids);
        const pref = vids.find(d=>!/(front|ir|infrared)/i.test(d.label))||vids[0];
        if (pref) setSelCam(pref.deviceId);
      } catch { setStatus({ msg:"Permissão negada. Use o campo manual.", t:"err" }); }
    })();
  }, []);

  useEffect(() => { if (selCam) { startCam(selCam); return ()=>stopAll(); } }, [selCam]);

  const stopAll = () => {
    scanRef.current = false;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current=null; }
    if (focTimer.current) { clearInterval(focTimer.current); focTimer.current=null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    if (window.Quagga) { try { window.Quagga.stop(); } catch {} }
  };

  const startCam = async (did) => {
    stopAll(); setReady(false); histRef.current=[]; setCnt(0); setPend("");
    setStatus({ msg:"Abrindo câmera...", t:"" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{ deviceId:{exact:did}, width:{ideal:1920,min:640}, height:{ideal:1080,min:480}, frameRate:{ideal:30} }
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced:[{focusMode:"continuous"}] });
      if (videoRef.current) { videoRef.current.srcObject=stream; await videoRef.current.play(); }
      setReady(true);
      setStatus({ msg:"Aponte o código para a câmera", t:"" });
      focTimer.current = setInterval(async()=>{
        try { if(caps.focusMode?.includes("continuous")) await track.applyConstraints({advanced:[{focusMode:"continuous"}]}); } catch {}
      }, 3000);
      startDet(did);
    } catch(err) { setStatus({ msg:"Erro: "+err.message, t:"err" }); }
  };

  const onRaw = useCallback((code) => {
    const h = histRef.current;
    h.push(code); if (h.length>CONFIRMS) h.shift();
    const ok = h.length===CONFIRMS && h.every(c=>c===h[0]);
    if (ok) {
      scanRef.current=false; setCnt(CONFIRMS); setPend(code);
      setStatus({ msg:`✓ Código: ${code}`, t:"ok" });
      stopAll(); setTimeout(()=>onScan(code), 350);
    } else {
      const s = h.filter(c=>c===code).length;
      setCnt(s); setPend(code);
      setStatus({ msg:`Confirmando... (${s}/${CONFIRMS})`, t:"" });
    }
  }, [onScan]);

  const startDet = useCallback(async (did) => {
    if ("BarcodeDetector" in window) {
      const sup = await window.BarcodeDetector.getSupportedFormats();
      detRef.current = new window.BarcodeDetector({ formats:sup });
      scanRef.current = true;
      const loop = async () => {
        if (!scanRef.current||!videoRef.current||!detRef.current) return;
        if (videoRef.current.readyState===videoRef.current.HAVE_ENOUGH_DATA) {
          try { const r=await detRef.current.detect(videoRef.current); if(r.length>0) onRaw(r[0].rawValue); } catch {}
        }
        animRef.current = requestAnimationFrame(loop);
      };
      loop(); return;
    }
    if (!window.Quagga) {
      await new Promise((res,rej)=>{
        if (document.querySelector('script[src*="quagga"]')) { res(); return; }
        const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js";
        s.onload=res; s.onerror=rej; document.head.appendChild(s);
      });
    }
    scanRef.current=true;
    window.Quagga.init({
      inputStream:{ name:"Live",type:"LiveStream",target:videoRef.current, constraints:{deviceId:{exact:did},width:1280,height:720} },
      decoder:{ readers:["ean_reader","ean_8_reader","code_128_reader","code_39_reader","upc_reader"] }, locate:true,
    }, err=>{ if(err){setStatus({msg:"Erro: "+err.message,t:"err"});return;} window.Quagga.start(); window.Quagga.onDetected(r=>{if(scanRef.current) onRaw(r.codeResult.code);}); });
  }, [onRaw]);

  const dots = Array.from({length:CONFIRMS},(_,i)=>({on:i<cnt,done:cnt>=CONFIRMS}));
  return (
    <div className="scanner-fs">
      <div className="scanner-video-bg">
        <video ref={videoRef} muted playsInline autoPlay />
        <div className="scan-vig"/>
        {ready&&<><div className="scan-line"/><div className="scan-corners"><div className="scan-c tl"/><div className="scan-c tr"/><div className="scan-c bl"/><div className="scan-c br"/></div></>}
        {!ready&&status.t!=="err"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}><div className="spinner" style={{width:36,height:36,borderWidth:3}}/><span style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--text-dim)"}}>Iniciando câmera...</span></div>}
      </div>
      <div className="scanner-bar">
        <div className="scanner-bar-row1">
          <div className="scanner-bar-title">{title||"ESCANEAR"}</div>
          {cams.length>1&&<div className="cam-select" style={{flex:1,marginLeft:16}}><label>CAM:</label><select value={selCam} onChange={e=>setSelCam(e.target.value)}>{cams.map((c,i)=><option key={c.deviceId} value={c.deviceId}>{c.label||`Câmera ${i+1}`}</option>)}</select></div>}
          {pend&&<div className="cdots">{dots.map((d,i)=><div key={i} className={`cdot ${d.done?"done":d.on?"on":""}`}/>)}</div>}
          <button className="btn btn-danger" style={{padding:"6px 14px",fontSize:11}} onClick={onClose}>✕ FECHAR</button>
        </div>
        <div className={`scanner-status ${status.t}`}>{!ready&&status.t!=="err"&&<span className="spinner" style={{marginRight:8}}/>}{status.msg}</div>
        <div className="scanner-manual">
          <input type="text" placeholder="Ou digite o código manualmente..." value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual.trim()&&onScan(manual.trim())}/>
          <button onClick={()=>manual.trim()&&onScan(manual.trim())}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TOAST
// ============================================================
function Toast({ toasts }) {
  return <div className="toast-wrap">{toasts.map(t=><div key={t.id} className={`toast toast-${t.type}`}>{t.type==="success"?"✓":t.type==="error"?"✗":"ℹ"} {t.message}</div>)}</div>;
}

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const go = async(e)=>{ e.preventDefault(); setErr(""); setLoading(true);
    try { const r=await signInWithEmailAndPassword(auth,email,pw); onLogin(r.user); }
    catch(ex){ const m={"auth/invalid-credential":"Email ou senha incorretos.","auth/too-many-requests":"Muitas tentativas."}; setErr(m[ex.code]||"Erro: "+ex.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-title">PARK<span>.</span></div>
        <div className="login-sub">Sistema de Controle de Estoque</div>
        <form onSubmit={go}>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@empresa.com" required autoFocus/></div>
          <div className="form-group"><label className="form-label">Senha</label><input className="form-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required/></div>
          <button className="btn btn-accent btn-lg btn-full" type="submit" disabled={loading} style={{marginTop:8}}>{loading?"AUTENTICANDO...":"ENTRAR"}</button>
          {err&&<div className="err-msg">{err}</div>}
        </form>
      </div>
    </div>
  );
}

// ============================================================
// SELEÇÃO DE SETOR
// ============================================================
function SetorScreen({ user, onSelect }) {
  return (
    <div className="setor-screen">
      <div className="setor-heading"><h2>SELECIONE O SETOR</h2><p>Logado como {user.email}</p></div>
      <div className="setor-cards">
        {Object.entries(SETORES).map(([key,s])=>(
          <div key={key} className="setor-card" style={{"--c":s.color}} onClick={()=>onSelect(key)}>
            <style>{`.setor-card:nth-child(${Object.keys(SETORES).indexOf(key)+1})::after{background:${s.color};}`}</style>
            <span className="setor-card-icon">{s.icon}</span>
            <div className="setor-card-name">{s.label}</div>
            <div className="setor-card-sub">Gestão de Estoque</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// LOG HELPER — grava movimentação no Firebase
// ============================================================
async function registrarLog(setor, tipo, dados) {
  // tipo: "entrada" | "saida" | "config"
  const colLog = getCol(setor, "log");
  await addDoc(collection(db, colLog), {
    tipo,
    ...dados,
    ts: serverTimestamp(),
  });
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ setor, products, addToast }) {
  const s = SETORES[setor];
  const [logs, setLogs] = useState([]);
  const [loadingLog, setLoadingLog] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const colLog = getCol(setor, "log");
        const snap = await getDocs(query(collection(db, colLog), orderBy("ts", "desc"), limit(30)));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { addToast("Erro ao carregar log.", "error"); }
      finally { setLoadingLog(false); }
    })();
  }, [setor]);

  const total      = products.length;
  const totalItens = products.reduce((a, p) => a + (p.quantidade || 0), 0);
  const zerados    = products.filter(p => (p.quantidade || 0) === 0).length;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">DASHBOARD</div>
        <div className="page-sub">Setor {s.label} · visão geral</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{"--c": s.color}}>
          <div className="stat-label">Produtos Cadastrados</div>
          <div className="stat-value" style={{color: s.color}}>{total}</div>
          <div className="stat-sub">SKUs únicos</div>
        </div>
        <div className="stat-card" style={{"--c":"var(--success)"}}>
          <div className="stat-label">Unidades em Estoque</div>
          <div className="stat-value" style={{color:"var(--success)"}}>{totalItens}</div>
          <div className="stat-sub">total acumulado</div>
        </div>
        <div className="stat-card" style={{"--c": zerados > 0 ? "var(--danger)" : "var(--success)"}}>
          <div className="stat-label">Sem Estoque</div>
          <div className="stat-value" style={{color: zerados > 0 ? "var(--danger)" : "var(--success)"}}>{zerados}</div>
          <div className="stat-sub">produtos zerados</div>
        </div>
      </div>

      {/* Alertas */}
      {products.filter(p=>(p.quantidade||0)<=5).length > 0 && (
        <div className="table-card" style={{marginBottom:20}}>
          <div className="table-card-header"><div className="table-card-title">⚠ Estoque Baixo / Zerado</div></div>
          <table className="tbl">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Status</th></tr></thead>
            <tbody>
              {products.filter(p=>(p.quantidade||0)<=5).map(p=>(
                <tr key={p.id}>
                  <td>{p.nome}</td><td>{p.categoria}</td>
                  <td><strong style={{color:p.quantidade===0?"var(--danger)":"var(--accent)"}}>{p.quantidade}</strong></td>
                  <td>{p.quantidade===0?<span className="badge badge-zero">ZERADO</span>:<span className="badge badge-low">BAIXO</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOG */}
      <div className="table-card">
        <div className="table-card-header"><div className="table-card-title">📋 Log de Movimentações — últimas 30</div></div>
        <div style={{padding:"0 18px"}}>
          {loadingLog
            ? <div className="empty"><span className="spinner"/></div>
            : logs.length === 0
              ? <div className="empty">Nenhuma movimentação registrada.</div>
              : logs.map(l => (
                <div key={l.id} className="log-entry">
                  <div><div className={`log-dot ${l.tipo==="entrada"?"in":l.tipo==="saida"?"out":"config"}`}/></div>
                  <div>
                    <div className="log-action">
                      {l.tipo==="entrada" && <><span className="badge badge-in" style={{marginRight:6}}>ENTRADA</span>{l.quantidade}x <strong>{l.produto}</strong></>}
                      {l.tipo==="saida"   && <><span className="badge badge-out" style={{marginRight:6}}>SAÍDA</span>1x <strong>{l.produto}</strong></>}
                      {l.tipo==="config"  && <><span className="badge" style={{marginRight:6,color:"var(--info)",borderColor:"var(--info)"}}>CONFIG</span>{l.descricao}</>}
                    </div>
                    <div className="log-detail">{l.categoria && `${l.categoria} · `}{l.usuario}</div>
                  </div>
                  <div className="log-time">{fmtDate(l.ts)}</div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONFIGURAÇÕES — Categorias e Produtos Padrão
// ============================================================
function Configuracoes({ setor, user, addToast }) {
  const colCat  = getCol(setor, "categorias");
  const colProd = getCol(setor, "produtos_padrao");
  const colLog  = getCol(setor, "log");

  const [cats, setCats]     = useState([]);
  const [prods, setProds]   = useState([]);
  const [loading, setLoading] = useState(true);

  // form nova categoria
  const [nomeCat, setNomeCat] = useState("");
  // form novo produto padrão
  const [nomeProd, setNomeProd] = useState("");
  const [catProd, setCatProd]   = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [sc, sp] = await Promise.all([getDocs(collection(db,colCat)), getDocs(collection(db,colProd))]);
      setCats(sc.docs.map(d=>({id:d.id,...d.data()})));
      setProds(sp.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ addToast("Erro ao carregar: "+e.message,"error"); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[setor]);

  const addCat = async () => {
    if (!nomeCat.trim()) return;
    try {
      await addDoc(collection(db,colCat),{ nome: nomeCat.trim(), criadoEm: new Date().toISOString() });
      await registrarLog(setor,"config",{ descricao:`Categoria criada: ${nomeCat.trim()}`, usuario: user.email });
      addToast(`Categoria "${nomeCat}" criada!`, "success");
      setNomeCat(""); load();
    } catch(e){ addToast("Erro: "+e.message,"error"); }
  };

  const delCat = async (c) => {
    if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
    try {
      await deleteDoc(doc(db,colCat,c.id));
      await registrarLog(setor,"config",{ descricao:`Categoria removida: ${c.nome}`, usuario: user.email });
      addToast(`Categoria removida.`,"success"); load();
    } catch(e){ addToast("Erro: "+e.message,"error"); }
  };

  const addProd = async () => {
    if (!nomeProd.trim()||!catProd) { addToast("Preencha nome e categoria.","error"); return; }
    try {
      await addDoc(collection(db,colProd),{ nome: nomeProd.trim(), categoria: catProd, criadoEm: new Date().toISOString() });
      await registrarLog(setor,"config",{ descricao:`Produto padrão criado: ${nomeProd.trim()} (${catProd})`, usuario: user.email });
      addToast(`Produto "${nomeProd}" criado!`,"success");
      setNomeProd(""); setCatProd(""); load();
    } catch(e){ addToast("Erro: "+e.message,"error"); }
  };

  const delProd = async (p) => {
    if (!confirm(`Excluir produto padrão "${p.nome}"?`)) return;
    try {
      await deleteDoc(doc(db,colProd,p.id));
      await registrarLog(setor,"config",{ descricao:`Produto padrão removido: ${p.nome}`, usuario: user.email });
      addToast("Produto removido.","success"); load();
    } catch(e){ addToast("Erro: "+e.message,"error"); }
  };

  if (loading) return <div className="empty"><span className="spinner"/></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">CONFIGURAÇÕES</div>
        <div className="page-sub">Categorias e produtos padrão do setor {SETORES[setor].label}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {/* CATEGORIAS */}
        <div className="card">
          <div className="card-title">CATEGORIAS</div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input className="form-input" placeholder="Nome da categoria..." value={nomeCat} onChange={e=>setNomeCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()} style={{flex:1}}/>
            <button className="btn btn-accent" onClick={addCat}>+ ADD</button>
          </div>
          {cats.length===0
            ? <div className="empty" style={{padding:20}}>Nenhuma categoria.</div>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {cats.map(c=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius)"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:13}}>{c.nome}</span>
                    <button className="btn-icon-sm" onClick={()=>delCat(c)}>🗑</button>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* PRODUTOS PADRÃO */}
        <div className="card">
          <div className="card-title">PRODUTOS PADRÃO</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            <select className="form-select" value={catProd} onChange={e=>setCatProd(e.target.value)}>
              <option value="">Selecionar categoria...</option>
              {cats.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <div style={{display:"flex",gap:8}}>
              <input className="form-input" placeholder="Nome do produto..." value={nomeProd} onChange={e=>setNomeProd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProd()} style={{flex:1}}/>
              <button className="btn btn-accent" onClick={addProd}>+ ADD</button>
            </div>
          </div>
          {prods.length===0
            ? <div className="empty" style={{padding:20}}>Nenhum produto padrão.</div>
            : <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto"}}>
                {cats.map(c=>{
                  const ps = prods.filter(p=>p.categoria===c.nome);
                  if (!ps.length) return null;
                  return (
                    <div key={c.id}>
                      <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,textTransform:"uppercase",padding:"8px 0 4px"}}>{c.nome}</div>
                      {ps.map(p=>(
                        <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 12px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius)",marginBottom:4}}>
                          <span style={{fontFamily:"var(--mono)",fontSize:12}}>{p.nome}</span>
                          <button className="btn-icon-sm" onClick={()=>delProd(p)}>🗑</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ENTRADA
// ============================================================
function Entrada({ setor, onRefresh, addToast, user }) {
  const colEst  = getCol(setor, "produtos");
  const colCat  = getCol(setor, "categorias");
  const colPadrao = getCol(setor, "produtos_padrao");

  const [cats, setCats]     = useState([]);
  const [padrao, setPadrao] = useState([]);
  const [catSel, setCatSel] = useState("");
  const [prodSel, setProdSel] = useState(""); // nome do produto selecionado
  const [barcodes, setBarcodes] = useState([]);
  const [qtd, setQtd]       = useState(1);
  const [scanner, setScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadData, setLoadData] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sc, sp] = await Promise.all([getDocs(collection(db,colCat)), getDocs(collection(db,colPadrao))]);
        setCats(sc.docs.map(d=>({id:d.id,...d.data()})));
        setPadrao(sp.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ addToast("Erro: "+e.message,"error"); }
      finally { setLoadData(false); }
    })();
  },[setor]);

  const prodsFiltrados = padrao.filter(p => !catSel || p.categoria === catSel);

  const onBarcode = (code) => {
    setScanner(false);
    if (barcodes.includes(code)) { addToast("Código já adicionado.","info"); return; }
    setBarcodes(p=>[...p,code]);
    addToast("Código: "+code,"info");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prodSel) { addToast("Selecione um produto.","error"); return; }
    if (barcodes.length===0) { addToast("Escaneie pelo menos um código de barras.","error"); return; }
    setLoading(true);
    try {
      const categoriaFinal = padrao.find(p=>p.nome===prodSel)?.categoria || catSel;

      // busca se já existe
      let foundDoc = null;
      for (const bc of barcodes) {
        const q = query(collection(db,colEst), where("barcodes","array-contains",bc));
        const snap = await getDocs(q);
        if (!snap.empty) { foundDoc=snap.docs[0]; break; }
      }
      // também busca por nome
      if (!foundDoc) {
        const qn = query(collection(db,colEst), where("nome","==",prodSel));
        const sn = await getDocs(qn);
        if (!sn.empty) foundDoc = sn.docs[0];
      }

      if (foundDoc) {
        await updateDoc(doc(db,colEst,foundDoc.id), { quantidade: increment(Number(qtd)), barcodes: [...new Set([...(foundDoc.data().barcodes||[]),...barcodes])] });
        await registrarLog(setor,"entrada",{ produto: prodSel, categoria: categoriaFinal, quantidade: Number(qtd), barcodes, usuario: user.email });
        addToast(`Entrada de ${qtd}x "${prodSel}" registrada!`,"success");
      } else {
        await addDoc(collection(db,colEst),{ nome: prodSel, categoria: categoriaFinal, barcodes, quantidade: Number(qtd), criadoEm: new Date().toISOString() });
        await registrarLog(setor,"entrada",{ produto: prodSel, categoria: categoriaFinal, quantidade: Number(qtd), barcodes, usuario: user.email });
        addToast(`"${prodSel}" cadastrado com sucesso!`,"success");
      }
      onRefresh(); setProdSel(""); setBarcodes([]); setQtd(1);
    } catch(e){ addToast("Erro: "+e.message,"error"); }
    finally { setLoading(false); }
  };

  if (loadData) return <div className="empty"><span className="spinner"/></div>;

  return (
    <div>
      <div className="page-hd">
        <div className="page-title">ENTRADA</div>
        <div className="page-sub">Registrar entrada de produto — {SETORES[setor].label}</div>
      </div>

      {cats.length===0&&<div className="err-msg">⚠ Nenhuma categoria cadastrada. Vá em Configurações e crie as categorias e produtos primeiro.</div>}

      <div className="card">
        <div className="card-title">REGISTRAR ENTRADA</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{marginBottom:16}}>
            {/* Categoria */}
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Categoria</label>
              <select className="form-select" value={catSel} onChange={e=>{setCatSel(e.target.value); setProdSel("");}}>
                <option value="">Todas as categorias</option>
                {cats.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            {/* Produto */}
            <div className="form-group" style={{margin:0}}>
              <label className="form-label">Produto *</label>
              <select className="form-select" value={prodSel} onChange={e=>setProdSel(e.target.value)} required>
                <option value="">Selecionar produto...</option>
                {prodsFiltrados.map(p=><option key={p.id} value={p.nome}>{p.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Quantidade */}
          <div className="form-group" style={{maxWidth:180}}>
            <label className="form-label">Quantidade</label>
            <input className="form-input" type="number" min={1} value={qtd} onChange={e=>setQtd(e.target.value)} required/>
          </div>

          {/* Códigos de barras */}
          <div className="form-group">
            <label className="form-label">Códigos de Barras ({barcodes.length})</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10,minHeight:32}}>
              {barcodes.length===0
                ? <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)"}}>Nenhum código adicionado.</span>
                : barcodes.map(bc=>(
                  <div key={bc} className="tag">{bc}<button type="button" onClick={()=>setBarcodes(p=>p.filter(b=>b!==bc))}>✕</button></div>
                ))
              }
            </div>
            <button type="button" className="btn-scan" onClick={()=>setScanner(true)}>
              📷 ESCANEAR CÓDIGO DE BARRAS
            </button>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-dim)",marginTop:6}}>
              💡 Produto com vários códigos? Escaneie todos — qualquer um funciona na saída.
            </div>
          </div>

          <div className="divider"/>
          <button className="btn btn-accent btn-lg" type="submit" disabled={loading}>
            {loading?<><span className="spinner"/>SALVANDO...</>:"↑ REGISTRAR ENTRADA"}
          </button>
        </form>
      </div>
      {scanner&&<ScannerModal title="ESCANEAR — ENTRADA" onScan={onBarcode} onClose={()=>setScanner(false)}/>}
    </div>
  );
}

// ============================================================
// SAÍDA
// ============================================================
function Saida({ setor, onRefresh, addToast, user }) {
  const colEst = getCol(setor, "produtos");
  const [pw, setPw]             = useState("");
  const [authOk, setAuthOk]     = useState(false);
  const [scanner, setScanner]   = useState(false);
  const [found, setFound]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [manual, setManual]     = useState("");

  const doAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signInWithEmailAndPassword(auth,user.email,pw); setAuthOk(true); addToast("Autorizado.","success"); }
    catch { addToast("Senha incorreta.","error"); }
    finally { setLoading(false); }
  };

  const onBarcode = async (code) => {
    setScanner(false); setManual(code); setLoading(true);
    try {
      let f=null;
      const q1=query(collection(db,colEst),where("barcodes","array-contains",code));
      const s1=await getDocs(q1); if(!s1.empty){const d=s1.docs[0];f={id:d.id,...d.data()};}
      if(!f){const q2=query(collection(db,colEst),where("barcode","==",code));const s2=await getDocs(q2);if(!s2.empty){const d=s2.docs[0];f={id:d.id,...d.data()};}}
      if(f){setFound(f);addToast(`Encontrado: ${f.nome}`,"info");}
      else{setFound(null);addToast(`Código "${code}" não encontrado.`,"error");}
    } catch(e){addToast("Erro: "+e.message,"error");}
    finally{setLoading(false);}
  };

  const doSaida = async () => {
    if(!found||(found.quantidade||0)<=0){addToast("Sem estoque!","error");return;}
    setLoading(true);
    try {
      await updateDoc(doc(db,colEst,found.id),{quantidade:increment(-1)});
      await registrarLog(setor,"saida",{ produto: found.nome, categoria: found.categoria, quantidade:1, usuario: user.email });
      addToast(`✓ Saída: 1x "${found.nome}" registrada.`,"success");
      setFound(null); setManual(""); setPw(""); setAuthOk(false); onRefresh();
    } catch(e){addToast("Erro: "+e.message,"error");}
    finally{setLoading(false);}
  };

  return (
    <div>
      <div className="page-hd"><div className="page-title">SAÍDA</div><div className="page-sub">Retirada de produto — {SETORES[setor].label}</div></div>

      {!authOk ? (
        <div className="card" style={{maxWidth:480}}>
          <div className="card-title">CONFIRMAR IDENTIDADE</div>
          <p style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",marginBottom:20}}>Informe a senha para liberar a retirada.</p>
          <form onSubmit={doAuth}>
            <div className="form-group"><label className="form-label">Administrador</label><input className="form-input" value={user.email} disabled/></div>
            <div className="form-group" style={{marginTop:10}}><label className="form-label">Senha</label><input className="form-input" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} required autoFocus/></div>
            <button className="btn btn-danger btn-lg" type="submit" disabled={loading}>{loading?"VERIFICANDO...":"CONFIRMAR"}</button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">REGISTRAR SAÍDA</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input className="form-input" placeholder="Código de barras..." value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onBarcode(manual)} style={{flex:1}}/>
            <button className="btn btn-outline" onClick={()=>onBarcode(manual)} disabled={loading}>{loading?<span className="spinner"/>:"OK"}</button>
          </div>
          <button className="btn-scan" onClick={()=>setScanner(true)}>📷 ABRIR CÂMERA — ESCANEAR SAÍDA</button>

          {found&&(
            <div className={`found-card ${found?"match":""}`} style={{marginTop:16}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--text-dim)",letterSpacing:2,marginBottom:8}}>PRODUTO ENCONTRADO</div>
              <div className="found-name">{found.nome}</div>
              <div className="found-info">{found.categoria} · {(found.barcodes||[found.barcode]).join(" / ")} · <strong style={{color:(found.quantidade||0)>0?"var(--success)":"var(--danger)"}}>{found.quantidade} unidades</strong></div>
              {(found.quantidade||0)>0
                ? <button className="btn btn-success btn-lg btn-full" style={{marginTop:16}} onClick={doSaida} disabled={loading}>{loading?"REGISTRANDO...":"✓ CONFIRMAR SAÍDA — 1 UNIDADE"}</button>
                : <div style={{marginTop:12,fontFamily:"var(--mono)",fontSize:12,color:"var(--danger)"}}>⚠ Estoque zerado — impossível dar saída.</div>
              }
            </div>
          )}
        </div>
      )}
      {scanner&&<ScannerModal title="ESCANEAR — SAÍDA" onScan={onBarcode} onClose={()=>setScanner(false)}/>}
    </div>
  );
}

// ============================================================
// INVENTÁRIO
// ============================================================
function Inventario({ setor, products, onDelete, addToast }) {
  const colEst = getCol(setor, "produtos");
  const [search, setSearch] = useState("");
  const [loadId, setLoadId] = useState(null);

  const filtered = products.filter(p=>{
    const codes=(p.barcodes||[p.barcode]).join(" ");
    return (p.nome||"").toLowerCase().includes(search.toLowerCase())||
           (p.categoria||"").toLowerCase().includes(search.toLowerCase())||
           codes.includes(search);
  });

  const del = async (p) => {
    if(!confirm(`Excluir "${p.nome}"?`))return;
    setLoadId(p.id);
    try { await deleteDoc(doc(db,colEst,p.id)); onDelete(); addToast(`"${p.nome}" removido.`,"success"); }
    catch(e){ addToast("Erro: "+e.message,"error"); }
    finally { setLoadId(null); }
  };

  return (
    <div>
      <div className="page-hd"><div className="page-title">INVENTÁRIO</div><div className="page-sub">{products.length} produtos · {SETORES[setor].label}</div></div>
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Todos os Produtos</div>
          <input className="form-input" style={{width:240,margin:0,padding:"7px 12px",fontSize:12}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <table className="tbl">
          <thead><tr><th>Produto</th><th>Categoria</th><th>Códigos de Barras</th><th>Qtd</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={6}><div className="empty">Nenhum produto encontrado.</div></td></tr>
              : filtered.map(p=>(
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.categoria}</td>
                  <td style={{color:"var(--text-dim)"}}>{(p.barcodes||[p.barcode]).map(bc=><div key={bc} style={{fontSize:10}}>{bc}</div>)}</td>
                  <td><strong style={{fontSize:16,color:p.quantidade===0?"var(--danger)":p.quantidade<=5?"var(--accent)":"var(--success)"}}>{p.quantidade}</strong></td>
                  <td>{p.quantidade===0?<span className="badge badge-zero">ZERADO</span>:p.quantidade<=5?<span className="badge badge-low">BAIXO</span>:<span className="badge badge-ok">OK</span>}</td>
                  <td><button className="btn-icon-sm" onClick={()=>del(p)} disabled={loadId===p.id}>{loadId===p.id?<span className="spinner"/>:"🗑"}</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// LOG COMPLETO
// ============================================================
function LogCompleto({ setor, addToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState("todos");

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, getCol(setor,"log")), orderBy("ts","desc"), limit(200)));
        setLogs(snap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ addToast("Erro ao carregar log.","error"); }
      finally { setLoading(false); }
    })();
  },[setor]);

  const filtered = filtro==="todos" ? logs : logs.filter(l=>l.tipo===filtro);

  return (
    <div>
      <div className="page-hd"><div className="page-title">LOG</div><div className="page-sub">Histórico completo de movimentações — {SETORES[setor].label}</div></div>

      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {["todos","entrada","saida","config"].map(f=>(
          <button key={f} className={`btn ${filtro===f?"btn-accent":"btn-outline"}`} onClick={()=>setFiltro(f)} style={{textTransform:"uppercase",fontSize:11}}>
            {f==="todos"?"Todos":f==="entrada"?"↑ Entradas":f==="saida"?"↓ Saídas":"⚙ Config"}
          </button>
        ))}
        <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",alignSelf:"center",marginLeft:8}}>{filtered.length} registros</span>
      </div>

      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Tipo</th><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Usuário</th><th>Data/Hora</th></tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6}><div className="empty"><span className="spinner"/></div></td></tr>
              : filtered.length===0
                ? <tr><td colSpan={6}><div className="empty">Nenhum registro.</div></td></tr>
                : filtered.map(l=>(
                  <tr key={l.id}>
                    <td>
                      {l.tipo==="entrada"&&<span className="badge badge-in">↑ ENTRADA</span>}
                      {l.tipo==="saida"&&<span className="badge badge-out">↓ SAÍDA</span>}
                      {l.tipo==="config"&&<span className="badge" style={{color:"var(--info)",borderColor:"var(--info)"}}>⚙ CONFIG</span>}
                    </td>
                    <td>{l.produto||l.descricao||"—"}</td>
                    <td>{l.categoria||"—"}</td>
                    <td>{l.quantidade||"—"}</td>
                    <td style={{color:"var(--text-dim)",fontSize:11}}>{l.usuario}</td>
                    <td style={{color:"var(--text-dim)",fontSize:11}}>{fmtDate(l.ts)}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [user, setUser]         = useState(null);
  const [setor, setSetor]       = useState(null);
  const [tab, setTab]           = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [toasts, setToasts]     = useState([]);
  const [loadingP, setLoadingP] = useState(false);

  const addToast = useCallback((message,type="info")=>{
    const id=Date.now(); setToasts(p=>[...p,{id,message,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);

  const loadProducts = useCallback(async (sk)=>{
    const key=sk||setor; if(!key) return;
    setLoadingP(true);
    try {
      const snap=await getDocs(collection(db,getCol(key,"produtos")));
      setProducts(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){addToast("Erro: "+e.message,"error");}
    finally{setLoadingP(false);}
  },[setor,addToast]);

  useEffect(()=>{ if(user&&setor) loadProducts(setor); },[user,setor]);

  const logout = async()=>{ await signOut(auth); setUser(null); setSetor(null); setTab("dashboard"); setProducts([]); };
  const selectSetor = (k)=>{ setSetor(k); setTab("dashboard"); setProducts([]); };
  const backToSetores = ()=>{ setSetor(null); setTab("dashboard"); setProducts([]); };

  if (!user) return <><style>{styles}</style><LoginScreen onLogin={setUser}/><Toast toasts={toasts}/></>;
  if (!setor) return (
    <><style>{styles}</style>
    <div className="app">
      <header className="header">
        <div className="header-logo">PARK<span style={{color:"var(--text-dim)",fontSize:12,fontFamily:"var(--mono)",marginLeft:8}}>ESTOQUE</span></div>
        <div className="header-right"><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)"}}>{user.email}</span><button className="hbtn danger" onClick={logout}>SAIR</button></div>
      </header>
      <SetorScreen user={user} onSelect={selectSetor}/>
    </div>
    <Toast toasts={toasts}/></>
  );

  const s = SETORES[setor];
  const nav = [
    { id:"dashboard",   icon:"▦", label:"Dashboard",    group:"VISÃO GERAL" },
    { id:"entrada",     icon:"↑", label:"Entrada",       group:"MOVIMENTAÇÃO" },
    { id:"saida",       icon:"↓", label:"Saída",         group:null },
    { id:"inventario",  icon:"≡", label:"Inventário",    group:null },
    { id:"log",         icon:"📋",label:"Log Completo",  group:"HISTÓRICO" },
    { id:"config",      icon:"⚙", label:"Configurações", group:"SISTEMA" },
  ];

  // agrupa nav
  const grouped = [];
  nav.forEach(n=>{ if(n.group) grouped.push({type:"group",label:n.group}); grouped.push({type:"item",...n}); });

  return (
    <><style>{styles}</style>
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span>{s.icon}</span> PARK
          <span className="setor-tag" style={{borderColor:s.color,color:s.color}}>{s.label}</span>
        </div>
        <div className="header-right">
          <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)"}}>{user.email}</span>
          <button className="hbtn" onClick={backToSetores}>← SETORES</button>
          <button className="hbtn danger" onClick={logout}>SAIR</button>
        </div>
      </header>

      <div className="main-layout">
        <nav className="sidebar">
          <div className="sidebar-setor">
            <div className="sidebar-setor-label">Setor ativo</div>
            <div className="sidebar-setor-name" style={{color:s.color}}>{s.icon} {s.label}</div>
          </div>
          <div className="sidebar-nav">
            {grouped.map((item,i)=>
              item.type==="group"
                ? <div key={i} className="sidebar-group">{item.label}</div>
                : <div key={item.id} className={`sitem ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
                    <span className="sitem-icon">{item.icon}</span>{item.label}
                  </div>
            )}
          </div>
        </nav>

        <main className="content">
          {loadingP
            ? <div className="empty"><span className="spinner" style={{width:28,height:28,borderWidth:3}}/></div>
            : <>
                {tab==="dashboard"  && <Dashboard setor={setor} products={products} addToast={addToast}/>}
                {tab==="entrada"    && <Entrada setor={setor} onRefresh={()=>loadProducts(setor)} addToast={addToast} user={user}/>}
                {tab==="saida"      && <Saida setor={setor} onRefresh={()=>loadProducts(setor)} addToast={addToast} user={user}/>}
                {tab==="inventario" && <Inventario setor={setor} products={products} onDelete={()=>loadProducts(setor)} addToast={addToast}/>}
                {tab==="log"        && <LogCompleto setor={setor} addToast={addToast}/>}
                {tab==="config"     && <Configuracoes setor={setor} user={user} addToast={addToast}/>}
              </>
          }
        </main>
      </div>
    </div>
    <Toast toasts={toasts}/></>
  );
}