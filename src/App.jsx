import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, deleteDoc, query, where, updateDoc, increment,
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
const db = getFirestore(firebaseApp);

// Cada setor tem sua própria coleção no Firestore — sem conflito
const SETORES = {
  ti:      { label: "TI",       icon: "💻", color: "#3b82f6", col: "estoque_ti" },
  exfood:  { label: "Exfood",   icon: "🍽️", color: "#f5a623", col: "estoque_exfood" },
  limpeza: { label: "Limpeza",  icon: "🧹", color: "#52c41a", col: "estoque_limpeza" },
};

// ============================================================
// ESTILOS
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
  :root {
    --bg:#0f0f0f;--surface:#1a1a1a;--surface2:#222;--border:#2e2e2e;
    --accent:#f5a623;--accent2:#e85d04;--success:#52c41a;--danger:#ff4d4f;
    --text:#f0f0f0;--text-dim:#888;
    --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;--display:'Bebas Neue',sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;}
  .app{min-height:100vh;display:flex;flex-direction:column;}

  /* HEADER */
  .header{background:var(--surface);border-bottom:2px solid var(--accent);padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .header-logo{font-family:var(--display);font-size:28px;letter-spacing:3px;color:var(--accent);display:flex;align-items:center;gap:10px;}
  .header-logo span{color:var(--text-dim);font-size:13px;font-family:var(--mono);}
  .header-right{display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:13px;color:var(--text-dim);}
  .btn-text{background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:6px 14px;font-family:var(--mono);font-size:12px;cursor:pointer;transition:all .2s;text-transform:uppercase;letter-spacing:1px;}
  .btn-text:hover{border-color:var(--danger);color:var(--danger);}
  .btn-text.back{border-color:var(--border);color:var(--text-dim);}
  .btn-text.back:hover{border-color:var(--accent);color:var(--accent);}

  /* LOGIN */
  .login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:repeating-linear-gradient(0deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px);}
  .login-card{background:var(--surface);border:2px solid var(--accent);padding:48px 40px;width:420px;position:relative;}
  .login-card::before{content:'';position:absolute;top:4px;left:4px;right:-4px;bottom:-4px;border:1px solid var(--accent2);z-index:-1;}
  .login-title{font-family:var(--display);font-size:48px;letter-spacing:4px;color:var(--accent);margin-bottom:4px;line-height:1;}
  .login-subtitle{font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:3px;text-transform:uppercase;margin-bottom:36px;}

  /* SETOR SELECT */
  .setor-screen{min-height:calc(100vh - 64px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:40px;}
  .setor-greeting{text-align:center;}
  .setor-greeting h2{font-family:var(--display);font-size:42px;letter-spacing:4px;color:var(--text);margin-bottom:6px;}
  .setor-greeting p{font-family:var(--mono);font-size:13px;color:var(--text-dim);letter-spacing:1px;}
  .setor-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;width:100%;max-width:800px;}
  .setor-card{background:var(--surface);border:2px solid var(--border);padding:40px 24px;cursor:pointer;transition:all .25s;display:flex;flex-direction:column;align-items:center;gap:16px;position:relative;overflow:hidden;}
  .setor-card::before{content:'';position:absolute;bottom:0;left:0;right:0;height:4px;transition:height .25s;}
  .setor-card:hover{transform:translateY(-4px);}
  .setor-card:hover::before{height:8px;}
  .setor-card-icon{font-size:52px;line-height:1;}
  .setor-card-name{font-family:var(--display);font-size:32px;letter-spacing:3px;}
  .setor-card-desc{font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:center;letter-spacing:1px;}

  /* FORMS */
  .form-group{margin-bottom:20px;}
  .form-label{display:block;font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
  .form-input{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:12px 14px;font-family:var(--mono);font-size:14px;outline:none;transition:border-color .2s;}
  .form-input:focus{border-color:var(--accent);}
  .form-input:disabled{opacity:.5;}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

  .btn-primary{width:100%;background:var(--accent);color:#0f0f0f;border:none;padding:14px;font-family:var(--display);font-size:22px;letter-spacing:3px;cursor:pointer;transition:all .2s;margin-top:8px;}
  .btn-primary:hover:not(:disabled){background:var(--accent2);color:white;}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;}

  .btn-submit{background:var(--accent);color:#0f0f0f;border:none;padding:14px 28px;font-family:var(--display);font-size:20px;letter-spacing:2px;cursor:pointer;transition:all .2s;margin-top:20px;}
  .btn-submit:hover:not(:disabled){background:var(--accent2);color:white;}
  .btn-submit:disabled{opacity:.5;cursor:not-allowed;}

  .btn-danger-big{background:var(--danger);color:white;border:none;padding:14px 28px;font-family:var(--display);font-size:20px;letter-spacing:2px;cursor:pointer;transition:all .2s;margin-top:20px;width:100%;display:block;}
  .btn-danger-big:hover:not(:disabled){background:#cc0000;}
  .btn-danger-big:disabled{opacity:.5;cursor:not-allowed;}

  .error-msg{background:rgba(255,77,79,.1);border:1px solid var(--danger);color:var(--danger);padding:10px 14px;font-family:var(--mono);font-size:12px;margin-top:16px;}

  /* LAYOUT PRINCIPAL */
  .main-layout{display:flex;flex:1;}
  .sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 0;flex-shrink:0;display:flex;flex-direction:column;}
  .sidebar-setor-badge{margin:0 16px 20px;padding:10px 14px;border:1px solid;font-family:var(--mono);font-size:12px;letter-spacing:1px;text-align:center;}
  .sidebar-item{display:flex;align-items:center;gap:10px;padding:14px 24px;font-family:var(--mono);font-size:13px;color:var(--text-dim);cursor:pointer;transition:all .15s;border-left:3px solid transparent;letter-spacing:1px;text-transform:uppercase;}
  .sidebar-item:hover{background:var(--surface2);color:var(--text);}
  .sidebar-item.active{border-left-color:var(--accent);color:var(--accent);background:rgba(245,166,35,.05);}
  .content{flex:1;padding:32px;overflow-y:auto;}

  /* CARDS / TABELAS */
  .section-title{font-family:var(--display);font-size:36px;letter-spacing:4px;color:var(--text);margin-bottom:4px;}
  .section-sub{font-family:var(--mono);font-size:12px;color:var(--text-dim);margin-bottom:28px;}
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
  .stat-card{background:var(--surface);border:1px solid var(--border);padding:24px;position:relative;overflow:hidden;}
  .stat-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--accent);}
  .stat-label{font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
  .stat-value{font-family:var(--display);font-size:48px;color:var(--accent);line-height:1;}

  .table-wrapper{background:var(--surface);border:1px solid var(--border);overflow:hidden;}
  .table-header-row{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);}
  .table-title{font-family:var(--mono);font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);}
  table{width:100%;border-collapse:collapse;}
  thead tr{background:var(--surface2);}
  thead th{padding:12px 20px;text-align:left;font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid var(--border);}
  tbody tr{border-bottom:1px solid var(--border);transition:background .15s;}
  tbody tr:hover{background:var(--surface2);}
  tbody td{padding:14px 20px;font-family:var(--mono);font-size:13px;}

  .badge{display:inline-block;padding:3px 10px;font-size:10px;letter-spacing:1px;text-transform:uppercase;border:1px solid;font-family:var(--mono);}
  .badge-ok{color:var(--success);border-color:var(--success);background:rgba(82,196,26,.05);}
  .badge-low{color:var(--accent);border-color:var(--accent);background:rgba(245,166,35,.05);}
  .badge-zero{color:var(--danger);border-color:var(--danger);background:rgba(255,77,79,.05);}

  .btn-icon{background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:6px 10px;cursor:pointer;font-size:14px;transition:all .15s;}
  .btn-icon:hover{border-color:var(--danger);color:var(--danger);}
  .btn-icon:disabled{opacity:.5;cursor:not-allowed;}

  .card{background:var(--surface);border:1px solid var(--border);padding:28px;margin-bottom:24px;}
  .card-title{font-family:var(--display);font-size:22px;letter-spacing:2px;color:var(--accent);margin-bottom:20px;}

  .btn-scan{background:var(--surface2);border:1px dashed var(--accent);color:var(--accent);padding:14px;font-family:var(--mono);font-size:13px;cursor:pointer;transition:all .2s;width:100%;display:flex;align-items:center;gap:8px;justify-content:center;margin-top:16px;letter-spacing:1px;}
  .btn-scan:hover{background:rgba(245,166,35,.1);}

  /* SCANNER TELA CHEIA */
  .scanner-fullscreen{position:fixed;inset:0;z-index:2000;background:#000;display:flex;flex-direction:column;}
  .scanner-video-bg{flex:1;position:relative;overflow:hidden;}
  .scanner-video-bg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  .scan-line-full{position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent 0%,var(--accent) 30%,var(--accent) 70%,transparent 100%);box-shadow:0 0 16px 4px rgba(245,166,35,.7);animation:scanFull 2.5s ease-in-out infinite;pointer-events:none;z-index:10;}
  @keyframes scanFull{0%{top:5%;}50%{top:92%;}100%{top:5%;}}
  .scan-vignette{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 50%,transparent 40%,rgba(0,0,0,.55) 100%);pointer-events:none;z-index:5;}
  .scan-corners{position:absolute;inset:0;pointer-events:none;z-index:6;}
  .scan-corners::before,.scan-corners::after,.scan-corner-br,.scan-corner-bl{content:'';position:absolute;width:40px;height:40px;border-color:var(--accent);border-style:solid;opacity:.8;}
  .scan-corners::before{top:24px;left:24px;border-width:3px 0 0 3px;}
  .scan-corners::after{top:24px;right:24px;border-width:3px 3px 0 0;}
  .scan-corner-br{bottom:140px;right:24px;border-width:0 3px 3px 0;}
  .scan-corner-bl{bottom:140px;left:24px;border-width:0 0 3px 3px;}
  .scanner-bottom-bar{background:rgba(15,15,15,.97);border-top:2px solid var(--accent);padding:14px 20px 18px;display:flex;flex-direction:column;gap:10px;flex-shrink:0;}
  .scanner-bottom-top-row{display:flex;align-items:center;justify-content:space-between;gap:12px;}
  .scanner-title-bar{font-family:var(--display);font-size:20px;letter-spacing:3px;color:var(--accent);}
  .scanner-close-btn{background:rgba(255,77,79,.15);border:1px solid var(--danger);color:var(--danger);padding:8px 18px;font-family:var(--mono);font-size:12px;cursor:pointer;letter-spacing:2px;text-transform:uppercase;transition:all .2s;flex-shrink:0;}
  .scanner-close-btn:hover{background:var(--danger);color:white;}
  .cam-row{display:flex;align-items:center;gap:10px;}
  .cam-row label{font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap;letter-spacing:1px;}
  .cam-row select{flex:1;background:#111;border:1px solid var(--border);color:var(--text);padding:7px 10px;font-family:var(--mono);font-size:12px;outline:none;cursor:pointer;max-width:340px;}
  .cam-row select:focus{border-color:var(--accent);}
  .scanner-status-row{display:flex;align-items:center;gap:12px;}
  .scanner-status-text{font-family:var(--mono);font-size:13px;color:var(--text-dim);flex:1;}
  .scanner-status-text.ok{color:var(--success);}
  .scanner-status-text.err{color:var(--danger);}
  .confirm-pill{display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);padding:5px 12px;flex-shrink:0;}
  .confirm-dot{width:10px;height:10px;border-radius:50%;background:var(--border);transition:background .2s;}
  .confirm-dot.filled{background:var(--accent);}
  .confirm-dot.done{background:var(--success);}
  .scanner-manual-row{display:flex;gap:10px;}
  .scanner-manual-row input{flex:1;background:#111;border:1px solid var(--border);color:var(--text);padding:10px 14px;font-family:var(--mono);font-size:13px;outline:none;}
  .scanner-manual-row input:focus{border-color:var(--accent);}
  .scanner-manual-row button{background:var(--accent);color:#0f0f0f;border:none;padding:10px 22px;font-family:var(--display);font-size:18px;letter-spacing:2px;cursor:pointer;transition:all .2s;}
  .scanner-manual-row button:hover{background:var(--accent2);color:white;}

  .saida-result-card{background:var(--surface2);border:1px solid var(--accent);padding:24px;margin:20px 0;}
  .saida-product-name{font-family:var(--display);font-size:32px;letter-spacing:2px;color:var(--text);margin-bottom:8px;}
  .saida-product-info{font-family:var(--mono);font-size:13px;color:var(--text-dim);}

  .toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;}
  .toast{padding:14px 20px;font-family:var(--mono);font-size:13px;border-left:4px solid;min-width:300px;animation:slideIn .3s ease;}
  .toast-success{background:#141f14;border-color:var(--success);color:var(--success);}
  .toast-error{background:#1f1414;border-color:var(--danger);color:var(--danger);}
  .toast-info{background:#1f1a10;border-color:var(--accent);color:var(--accent);}
  @keyframes slideIn{from{transform:translateX(110%);opacity:0;}to{transform:translateX(0);opacity:1;}}

  .empty-state{text-align:center;padding:60px;font-family:var(--mono);color:var(--text-dim);font-size:13px;}
  .loading-spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
`;

// ============================================================
// SCANNER MODAL — tela cheia com confirmação tripla
// ============================================================
const CONFIRM_NEEDED = 3;

function ScannerModal({ onScan, onClose, title = "ESCANEAR CÓDIGO" }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const animRef     = useRef(null);
  const detectorRef = useRef(null);
  const isScanRef   = useRef(false);
  const historyRef  = useRef([]);
  const focusTimer  = useRef(null);

  const [cameras, setCameras]       = useState([]);
  const [selectedCam, setSelected]  = useState("");
  const [status, setStatus]         = useState({ msg: "Iniciando câmera...", type: "" });
  const [confirmCount, setConfirm]  = useState(0);
  const [pendingCode, setPending]   = useState("");
  const [manualCode, setManual]     = useState("");
  const [ready, setReady]           = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
        tmp.getTracks().forEach(t => t.stop());
        const devs = await navigator.mediaDevices.enumerateDevices();
        const vids = devs.filter(d => d.kind === "videoinput");
        setCameras(vids);
        const pref = vids.find(d => !/(front|ir|infrared)/i.test(d.label)) || vids[0];
        if (pref) setSelected(pref.deviceId);
      } catch {
        setStatus({ msg: "Permissão negada. Use o campo manual.", type: "err" });
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCam) return;
    startCamera(selectedCam);
    return () => stopAll();
  }, [selectedCam]);

  const stopAll = () => {
    isScanRef.current = false;
    if (animRef.current)   { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (focusTimer.current) { clearInterval(focusTimer.current); focusTimer.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (window.Quagga) { try { window.Quagga.stop(); } catch {} }
  };

  const startCamera = async (deviceId) => {
    stopAll();
    setReady(false); historyRef.current = [];
    setConfirm(0); setPending("");
    setStatus({ msg: "Abrindo câmera...", type: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 }, frameRate: { ideal: 30 } },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      if (caps.focusMode?.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      }
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setReady(true);
      setStatus({ msg: "Aponte o código de barras para a câmera", type: "" });
      focusTimer.current = setInterval(async () => {
        try { if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }); } catch {}
      }, 3000);
      startDetection(deviceId);
    } catch (err) {
      setStatus({ msg: "Erro ao abrir câmera: " + err.message, type: "err" });
    }
  };

  const handleRawRead = useCallback((code) => {
    const h = historyRef.current;
    h.push(code);
    if (h.length > CONFIRM_NEEDED) h.shift();
    const allSame = h.length === CONFIRM_NEEDED && h.every(c => c === h[0]);
    if (allSame) {
      isScanRef.current = false;
      setConfirm(CONFIRM_NEEDED); setPending(code);
      setStatus({ msg: `✓ Código confirmado: ${code}`, type: "ok" });
      stopAll();
      setTimeout(() => onScan(code), 400);
    } else {
      const streak = h.filter(c => c === code).length;
      setConfirm(streak); setPending(code);
      setStatus({ msg: `Lendo... (${streak}/${CONFIRM_NEEDED})`, type: "" });
    }
  }, [onScan]);

  const startDetection = useCallback(async (deviceId) => {
    if ("BarcodeDetector" in window) {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      detectorRef.current = new window.BarcodeDetector({ formats: supported });
      isScanRef.current = true;
      const loop = async () => {
        if (!isScanRef.current || !videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try { const r = await detectorRef.current.detect(videoRef.current); if (r.length > 0) handleRawRead(r[0].rawValue); } catch {}
        }
        animRef.current = requestAnimationFrame(loop);
      };
      loop(); return;
    }
    if (!window.Quagga) {
      await new Promise((res, rej) => {
        if (document.querySelector('script[src*="quagga"]')) { res(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    isScanRef.current = true;
    window.Quagga.init({
      inputStream: { name:"Live", type:"LiveStream", target: videoRef.current, constraints: { deviceId: { exact: deviceId }, width: 1280, height: 720 } },
      decoder: { readers: ["ean_reader","ean_8_reader","code_128_reader","code_39_reader","upc_reader"] },
      locate: true,
    }, (err) => {
      if (err) { setStatus({ msg: "Erro: " + err.message, type: "err" }); return; }
      window.Quagga.start();
      window.Quagga.onDetected((r) => { if (isScanRef.current) handleRawRead(r.codeResult.code); });
    });
  }, [handleRawRead]);

  const handleManual = () => { if (manualCode.trim()) onScan(manualCode.trim()); };
  const dots = Array.from({ length: CONFIRM_NEEDED }, (_, i) => ({ filled: i < confirmCount, done: confirmCount >= CONFIRM_NEEDED }));

  return (
    <div className="scanner-fullscreen">
      <div className="scanner-video-bg">
        <video ref={videoRef} muted playsInline autoPlay />
        <div className="scan-vignette" />
        {ready && (<><div className="scan-line-full" /><div className="scan-corners"><div className="scan-corner-br" /><div className="scan-corner-bl" /></div></>)}
        {!ready && status.type !== "err" && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
            <div className="loading-spinner" style={{width:40,height:40,borderWidth:3}} />
            <div style={{fontFamily:"var(--mono)",fontSize:14,color:"var(--text-dim)"}}>Iniciando câmera...</div>
          </div>
        )}
      </div>
      <div className="scanner-bottom-bar">
        <div className="scanner-bottom-top-row">
          <div className="scanner-title-bar">{title}</div>
          {cameras.length > 1 && (
            <div className="cam-row" style={{flex:1,justifyContent:"center"}}>
              <label>CÂMERA:</label>
              <select value={selectedCam} onChange={e => setSelected(e.target.value)}>
                {cameras.map((c,i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i+1}`}</option>)}
              </select>
            </div>
          )}
          <button className="scanner-close-btn" onClick={onClose}>✕ FECHAR</button>
        </div>
        <div className="scanner-status-row">
          <div className={`scanner-status-text ${status.type}`}>
            {!ready && status.type !== "err" && <span className="loading-spinner" style={{marginRight:8}} />}
            {status.msg}
          </div>
          {pendingCode && (
            <div className="confirm-pill">
              <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-dim)",marginRight:4}}>CONF</span>
              {dots.map((d,i) => <div key={i} className={`confirm-dot ${d.done?"done":d.filled?"filled":""}`} />)}
            </div>
          )}
        </div>
        <div className="scanner-manual-row">
          <input type="text" placeholder="Ou digite o código manualmente..." value={manualCode} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleManual()} />
          <button onClick={handleManual}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type==="success"?"✓":t.type==="error"?"✗":"!"} {t.message}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const r = await signInWithEmailAndPassword(auth, email, password);
      onLogin(r.user);
    } catch (err) {
      const m = { "auth/invalid-credential":"Email ou senha incorretos.", "auth/user-not-found":"Usuário não encontrado.", "auth/wrong-password":"Senha incorreta.", "auth/too-many-requests":"Muitas tentativas." };
      setError(m[err.code] || "Erro: " + err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-title">ESTOQUE</div>
        <div className="login-subtitle">Sistema de Controle · Park</div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email do Administrador</label>
            <input className="form-input" type="email" placeholder="admin@empresa.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>{loading?"AUTENTICANDO...":"ACESSAR"}</button>
          {error && <div className="error-msg">⚠ {error}</div>}
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
      <div className="setor-greeting">
        <h2>SELECIONE O SETOR</h2>
        <p>Logado como {user.email}</p>
      </div>
      <div className="setor-cards">
        {Object.entries(SETORES).map(([key, setor]) => (
          <div
            key={key}
            className="setor-card"
            style={{ "--setor-color": setor.color }}
            onClick={() => onSelect(key)}
          >
            <style>{`.setor-card:hover { border-color: ${setor.color}; } .setor-card::before { background: ${setor.color}; }`}</style>
            <span className="setor-card-icon">{setor.icon}</span>
            <div className="setor-card-name" style={{ color: setor.color }}>{setor.label}</div>
            <div className="setor-card-desc">ESTOQUE · {setor.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD do setor
// ============================================================
function Dashboard({ products, setor }) {
  const s = SETORES[setor];
  const total      = products.length;
  const totalItens = products.reduce((sum, p) => sum + (p.quantidade || 0), 0);
  const zerados    = products.filter(p => (p.quantidade || 0) === 0).length;
  const alertas    = products.filter(p => (p.quantidade || 0) <= 5);

  return (
    <div>
      <div className="section-title">DASHBOARD</div>
      <div className="section-sub">Setor {s.label} · Firebase · coleção: {s.col}</div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total SKUs</div><div className="stat-value" style={{color:s.color}}>{total}</div></div>
        <div className="stat-card"><div className="stat-label">Itens em Estoque</div><div className="stat-value" style={{color:"var(--success)"}}>{totalItens}</div></div>
        <div className="stat-card"><div className="stat-label">Sem Estoque</div><div className="stat-value" style={{color:zerados>0?"var(--danger)":"var(--success)"}}>{zerados}</div></div>
      </div>
      <div className="table-wrapper">
        <div className="table-header-row"><div className="table-title">Estoque Baixo / Zerado</div></div>
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Códigos</th><th>Qtd</th><th>Status</th></tr></thead>
          <tbody>
            {alertas.length === 0
              ? <tr><td colSpan={5}><div className="empty-state">✓ Todos os produtos com estoque normal</div></td></tr>
              : alertas.map(p => (
                <tr key={p.id}>
                  <td>{p.nome}</td><td>{p.categoria}</td>
                  <td style={{fontFamily:"var(--mono)",fontSize:11}}>{(p.barcodes||[p.barcode]).join(" · ")}</td>
                  <td><strong style={{color:p.quantidade===0?"var(--danger)":"var(--accent)"}}>{p.quantidade}</strong></td>
                  <td>{p.quantidade===0?<span className="badge badge-zero">ZERADO</span>:<span className="badge badge-low">BAIXO</span>}</td>
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
// ENTRADA
// ============================================================
function CadastrarProduto({ setor, onAdd, addToast }) {
  const colName = SETORES[setor].col;
  const [nome, setNome]         = useState("");
  const [categoria, setCat]     = useState("");
  const [barcodes, setBarcodes] = useState([]);
  const [quantidade, setQtd]    = useState(1);
  const [showScanner, setScanner] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleBarcode = (code) => {
    setScanner(false);
    if (barcodes.includes(code)) { addToast("Código já adicionado.", "info"); return; }
    setBarcodes(prev => [...prev, code]);
    addToast(`Código adicionado: ${code}`, "info");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (barcodes.length === 0) { addToast("Adicione pelo menos um código de barras.", "error"); return; }
    setLoading(true);
    try {
      let foundDoc = null;
      for (const bc of barcodes) {
        const q = query(collection(db, colName), where("barcodes", "array-contains", bc));
        const snap = await getDocs(q);
        if (!snap.empty) { foundDoc = snap.docs[0]; break; }
      }
      if (foundDoc) {
        await updateDoc(doc(db, colName, foundDoc.id), { quantidade: increment(Number(quantidade)) });
        addToast(`Entrada de ${quantidade}x "${foundDoc.data().nome}" registrada!`, "success");
      } else {
        await addDoc(collection(db, colName), { nome, categoria, barcodes, quantidade: Number(quantidade), criadoEm: new Date().toISOString() });
        addToast(`"${nome}" cadastrado!`, "success");
      }
      onAdd(); setNome(""); setCat(""); setBarcodes([]); setQtd(1);
    } catch (err) { addToast("Erro: " + err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="section-title">ENTRADA</div>
      <div className="section-sub">Cadastrar produto ou adicionar estoque — {SETORES[setor].label}</div>
      <div className="card">
        <div className="card-title">NOVO PRODUTO / ENTRADA</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do Produto</label>
              <input className="form-input" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Cabo HDMI" required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="form-input" value={categoria} onChange={e=>setCat(e.target.value)} placeholder="Ex: Cabos" required />
            </div>
          </div>

          <div className="form-group" style={{marginTop:20}}>
            <label className="form-label">Códigos de Barras ({barcodes.length})</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10,minHeight:38}}>
              {barcodes.length === 0
                ? <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text-dim)"}}>Nenhum código adicionado ainda.</span>
                : barcodes.map(bc => (
                  <div key={bc} style={{display:"flex",alignItems:"center",gap:6,background:"var(--surface2)",border:"1px solid var(--border)",padding:"5px 12px",fontFamily:"var(--mono)",fontSize:12}}>
                    {bc}
                    <button type="button" onClick={()=>setBarcodes(p=>p.filter(b=>b!==bc))} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:15,padding:0}}>✕</button>
                  </div>
                ))
              }
            </div>
            <button className="btn-scan" type="button" onClick={()=>setScanner(true)}>
              📷 ABRIR CÂMERA E ESCANEAR CÓDIGO
            </button>
            <p style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",marginTop:8}}>
              💡 Se o produto tem mais de um código de barras, escaneie todos.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Quantidade</label>
            <input className="form-input" type="number" min={1} value={quantidade} onChange={e=>setQtd(e.target.value)} required style={{width:180}} />
          </div>

          <button className="btn-submit" type="submit" disabled={loading}>
            {loading ? "SALVANDO..." : "CADASTRAR PRODUTO"}
          </button>
        </form>
      </div>
      {showScanner && <ScannerModal title="ESCANEAR — ENTRADA" onScan={handleBarcode} onClose={()=>setScanner(false)} />}
    </div>
  );
}

// ============================================================
// SAÍDA
// ============================================================
function SaidaProduto({ setor, onUpdate, addToast, user }) {
  const colName = SETORES[setor].col;
  const [password, setPassword]   = useState("");
  const [authOk, setAuthOk]       = useState(false);
  const [showScanner, setScanner] = useState(false);
  const [foundProduct, setFound]  = useState(null);
  const [loading, setLoading]     = useState(false);
  const [manualCode, setManual]   = useState("");

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, user.email, password);
      setAuthOk(true); addToast("Identidade confirmada.", "success");
    } catch { addToast("Senha incorreta.", "error"); }
    finally { setLoading(false); }
  };

  const handleBarcodeScan = async (code) => {
    setScanner(false); setManual(code); setLoading(true);
    try {
      let found = null;
      const q1 = query(collection(db, colName), where("barcodes", "array-contains", code));
      const s1 = await getDocs(q1);
      if (!s1.empty) { const d = s1.docs[0]; found = { id: d.id, ...d.data() }; }
      if (!found) {
        const q2 = query(collection(db, colName), where("barcode", "==", code));
        const s2 = await getDocs(q2);
        if (!s2.empty) { const d = s2.docs[0]; found = { id: d.id, ...d.data() }; }
      }
      if (found) { setFound(found); addToast(`Encontrado: ${found.nome}`, "info"); }
      else { setFound(null); addToast(`Código "${code}" não encontrado no setor ${SETORES[setor].label}.`, "error"); }
    } catch (err) { addToast("Erro: " + err.message, "error"); }
    finally { setLoading(false); }
  };

  const handleSaida = async () => {
    if (!foundProduct || (foundProduct.quantidade || 0) <= 0) { addToast("Sem estoque!", "error"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, colName, foundProduct.id), { quantidade: increment(-1) });
      addToast(`✓ Saída: 1x "${foundProduct.nome}" registrada.`, "success");
      setFound(null); setManual(""); setPassword(""); setAuthOk(false);
      onUpdate();
    } catch (err) { addToast("Erro: " + err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="section-title">SAÍDA</div>
      <div className="section-sub">Retirada de produto — {SETORES[setor].label}</div>

      {!authOk ? (
        <div className="card">
          <div className="card-title">CONFIRMAR IDENTIDADE</div>
          <p style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text-dim)",marginBottom:20}}>Confirme a senha para liberar a retirada.</p>
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">Administrador</label>
              <input className="form-input" value={user.email} disabled />
            </div>
            <div className="form-group" style={{marginTop:12}}>
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus />
            </div>
            <button className="btn-submit" type="submit" disabled={loading} style={{background:"var(--danger)",color:"white"}}>
              {loading ? "VERIFICANDO..." : "CONFIRMAR IDENTIDADE"}
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">REGISTRAR SAÍDA</div>
          <div style={{display:"flex",gap:12,marginBottom:8}}>
            <input className="form-input" placeholder="Código de barras..." value={manualCode} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleBarcodeScan(manualCode)} style={{flex:1}} />
            <button className="btn-icon" style={{padding:"12px 14px"}} onClick={()=>handleBarcodeScan(manualCode)} disabled={loading}>
              {loading ? <span className="loading-spinner" /> : "OK"}
            </button>
          </div>
          <button className="btn-scan" onClick={()=>setScanner(true)}>
            📷 ABRIR CÂMERA — ESCANEAR SAÍDA
          </button>
          {foundProduct && (
            <div className="saida-result-card">
              <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",letterSpacing:2,marginBottom:6}}>PRODUTO LOCALIZADO</div>
              <div className="saida-product-name">{foundProduct.nome}</div>
              <div className="saida-product-info">
                {foundProduct.categoria} · {(foundProduct.barcodes||[foundProduct.barcode]).join(" / ")} ·{" "}
                <strong style={{color:(foundProduct.quantidade||0)>0?"var(--success)":"var(--danger)"}}>
                  {foundProduct.quantidade} unidades
                </strong>
              </div>
              {(foundProduct.quantidade || 0) > 0
                ? <button className="btn-danger-big" onClick={handleSaida} disabled={loading}>{loading?"REGISTRANDO...":"✓ CONFIRMAR SAÍDA — 1 UNIDADE"}</button>
                : <div style={{marginTop:12,fontFamily:"var(--mono)",fontSize:13,color:"var(--danger)"}}>⚠ Estoque zerado.</div>
              }
            </div>
          )}
        </div>
      )}
      {showScanner && <ScannerModal title="ESCANEAR — SAÍDA" onScan={handleBarcodeScan} onClose={()=>setScanner(false)} />}
    </div>
  );
}

// ============================================================
// INVENTÁRIO
// ============================================================
function ListarProdutos({ setor, products, onDelete, addToast }) {
  const colName = SETORES[setor].col;
  const [search, setSearch]    = useState("");
  const [loadingId, setLoadId] = useState(null);

  const filtered = products.filter(p => {
    const codes = (p.barcodes || [p.barcode]).join(" ");
    return (p.nome||"").toLowerCase().includes(search.toLowerCase()) ||
           (p.categoria||"").toLowerCase().includes(search.toLowerCase()) ||
           codes.includes(search);
  });

  const handleDelete = async (p) => {
    if (!confirm(`Excluir "${p.nome}" do setor ${SETORES[setor].label}?`)) return;
    setLoadId(p.id);
    try {
      await deleteDoc(doc(db, colName, p.id));
      onDelete(); addToast(`"${p.nome}" removido.`, "success");
    } catch (err) { addToast("Erro: " + err.message, "error"); }
    finally { setLoadId(null); }
  };

  return (
    <div>
      <div className="section-title">INVENTÁRIO</div>
      <div className="section-sub">{products.length} SKUs · {SETORES[setor].label}</div>
      <div className="table-wrapper">
        <div className="table-header-row">
          <div className="table-title">Todos os Produtos</div>
          <input className="form-input" style={{width:260,margin:0,padding:"8px 12px",fontSize:12}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Nome</th><th>Categoria</th><th>Códigos de Barras</th><th>Qtd</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6}><div className="empty-state">Nenhum produto encontrado.</div></td></tr>
              : filtered.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.categoria}</td>
                  <td style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)"}}>
                    {(p.barcodes||[p.barcode]).map(bc=><div key={bc}>{bc}</div>)}
                  </td>
                  <td><strong style={{fontFamily:"var(--mono)",fontSize:16,color:p.quantidade===0?"var(--danger)":p.quantidade<=5?"var(--accent)":"var(--success)"}}>{p.quantidade}</strong></td>
                  <td>{p.quantidade===0?<span className="badge badge-zero">ZERADO</span>:p.quantidade<=5?<span className="badge badge-low">BAIXO</span>:<span className="badge badge-ok">OK</span>}</td>
                  <td><button className="btn-icon" onClick={()=>handleDelete(p)} disabled={loadingId===p.id}>{loadingId===p.id?<span className="loading-spinner"/>:"🗑"}</button></td>
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
// APP PRINCIPAL
// ============================================================
export default function App() {
  const [user, setUser]         = useState(null);
  const [setor, setSetor]       = useState(null); // null = tela de seleção
  const [tab, setTab]           = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [toasts, setToasts]     = useState([]);
  const [loadingP, setLoadingP] = useState(false);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const loadProducts = useCallback(async (setorKey) => {
    const key = setorKey || setor;
    if (!key) return;
    setLoadingP(true);
    try {
      const snap = await getDocs(collection(db, SETORES[key].col));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { addToast("Erro: " + err.message, "error"); }
    finally { setLoadingP(false); }
  }, [setor, addToast]);

  useEffect(() => { if (user && setor) loadProducts(setor); }, [user, setor]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null); setSetor(null); setTab("dashboard"); setProducts([]);
  };

  const handleSelectSetor = (key) => {
    setSetor(key); setTab("dashboard"); setProducts([]);
  };

  const handleBackToSetores = () => {
    setSetor(null); setTab("dashboard"); setProducts([]);
  };

  // ── Tela de login
  if (!user) return (
    <>
      <style>{styles}</style>
      <LoginScreen onLogin={setUser} />
      <Toast toasts={toasts} />
    </>
  );

  // ── Tela de seleção de setor
  if (!setor) return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">ESTOQUE <span>PARK · SISTEMA DE CONTROLE</span></div>
          <div className="header-right">
            <span>● {user.email}</span>
            <button className="btn-text" onClick={handleLogout}>SAIR</button>
          </div>
        </header>
        <SetorScreen user={user} onSelect={handleSelectSetor} />
      </div>
      <Toast toasts={toasts} />
    </>
  );

  // ── Tela do setor selecionado
  const s = SETORES[setor];
  const nav = [
    { id: "dashboard",  icon: "▦", label: "Dashboard" },
    { id: "entrada",    icon: "↑", label: "Entrada" },
    { id: "saida",      icon: "↓", label: "Saída" },
    { id: "inventario", icon: "≡", label: "Inventário" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">
            <span style={{color: s.color}}>{s.icon}</span>
            ESTOQUE
            <span>{s.label.toUpperCase()} · PARK</span>
          </div>
          <div className="header-right">
            <span>● {user.email}</span>
            <button className="btn-text back" onClick={handleBackToSetores}>← SETORES</button>
            <button className="btn-text" onClick={handleLogout}>SAIR</button>
          </div>
        </header>

        <div className="main-layout">
          <nav className="sidebar">
            {/* Badge do setor ativo */}
            <div className="sidebar-setor-badge" style={{borderColor: s.color, color: s.color}}>
              {s.icon} {s.label}
            </div>
            {nav.map(item => (
              <div key={item.id} className={`sidebar-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
                <span style={{fontSize:16}}>{item.icon}</span>{item.label}
              </div>
            ))}
          </nav>

          <main className="content">
            {loadingP
              ? <div style={{display:"flex",gap:12,alignItems:"center",fontFamily:"var(--mono)",fontSize:13,color:"var(--text-dim)"}}><div className="loading-spinner"/> Carregando {s.label}...</div>
              : <>
                  {tab==="dashboard"  && <Dashboard products={products} setor={setor} />}
                  {tab==="entrada"    && <CadastrarProduto setor={setor} onAdd={()=>loadProducts(setor)} addToast={addToast} />}
                  {tab==="saida"      && <SaidaProduto setor={setor} onUpdate={()=>loadProducts(setor)} addToast={addToast} user={user} />}
                  {tab==="inventario" && <ListarProdutos setor={setor} products={products} onDelete={()=>loadProducts(setor)} addToast={addToast} />}
                </>
            }
          </main>
        </div>
      </div>
      <Toast toasts={toasts} />
    </>
  );
}