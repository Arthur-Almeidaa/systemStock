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

  .header{background:var(--surface);border-bottom:2px solid var(--accent);padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .header-logo{font-family:var(--display);font-size:28px;letter-spacing:3px;color:var(--accent);display:flex;align-items:center;gap:10px;}
  .header-logo span{color:var(--text-dim);font-size:14px;font-family:var(--mono);}
  .header-user{display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:13px;color:var(--text-dim);}
  .btn-logout{background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:6px 14px;font-family:var(--mono);font-size:12px;cursor:pointer;transition:all .2s;text-transform:uppercase;letter-spacing:1px;}
  .btn-logout:hover{border-color:var(--danger);color:var(--danger);}

  .login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:repeating-linear-gradient(0deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px);}
  .login-card{background:var(--surface);border:2px solid var(--accent);padding:48px 40px;width:420px;position:relative;}
  .login-card::before{content:'';position:absolute;top:4px;left:4px;right:-4px;bottom:-4px;border:1px solid var(--accent2);z-index:-1;}
  .login-title{font-family:var(--display);font-size:48px;letter-spacing:4px;color:var(--accent);margin-bottom:4px;line-height:1;}
  .login-subtitle{font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:3px;text-transform:uppercase;margin-bottom:36px;}

  .form-group{margin-bottom:20px;}
  .form-label{display:block;font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
  .form-input{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:12px 14px;font-family:var(--mono);font-size:14px;outline:none;transition:border-color .2s;}
  .form-input:focus{border-color:var(--accent);}
  .form-input:disabled{opacity:.5;}

  .btn-primary{width:100%;background:var(--accent);color:#0f0f0f;border:none;padding:14px;font-family:var(--display);font-size:22px;letter-spacing:3px;cursor:pointer;transition:all .2s;margin-top:8px;}
  .btn-primary:hover:not(:disabled){background:var(--accent2);color:white;}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .error-msg{background:rgba(255,77,79,.1);border:1px solid var(--danger);color:var(--danger);padding:10px 14px;font-family:var(--mono);font-size:12px;margin-top:16px;}

  .main-layout{display:flex;flex:1;}
  .sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 0;flex-shrink:0;}
  .sidebar-item{display:flex;align-items:center;gap:10px;padding:14px 24px;font-family:var(--mono);font-size:13px;color:var(--text-dim);cursor:pointer;transition:all .15s;border-left:3px solid transparent;letter-spacing:1px;text-transform:uppercase;}
  .sidebar-item:hover{background:var(--surface2);color:var(--text);}
  .sidebar-item.active{border-left-color:var(--accent);color:var(--accent);background:rgba(245,166,35,.05);}
  .content{flex:1;padding:32px;overflow-y:auto;}

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
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

  .btn-scan{background:var(--surface2);border:1px dashed var(--accent);color:var(--accent);padding:12px 14px;font-family:var(--mono);font-size:13px;cursor:pointer;transition:all .2s;width:100%;display:flex;align-items:center;gap:8px;justify-content:center;margin-top:24px;}
  .btn-scan:hover{background:rgba(245,166,35,.1);}

  .btn-submit{background:var(--accent);color:#0f0f0f;border:none;padding:14px 28px;font-family:var(--display);font-size:20px;letter-spacing:2px;cursor:pointer;transition:all .2s;margin-top:20px;}
  .btn-submit:hover:not(:disabled){background:var(--accent2);color:white;}
  .btn-submit:disabled{opacity:.5;cursor:not-allowed;}

  .btn-danger-big{background:var(--danger);color:white;border:none;padding:14px 28px;font-family:var(--display);font-size:20px;letter-spacing:2px;cursor:pointer;transition:all .2s;margin-top:20px;width:100%;display:block;}
  .btn-danger-big:hover:not(:disabled){background:#cc0000;}
  .btn-danger-big:disabled{opacity:.5;cursor:not-allowed;}

  /* SCANNER */
  .scanner-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:1000;}
  .scanner-box{width:500px;background:var(--surface);border:2px solid var(--accent);}
  .scanner-top{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
  .scanner-top-title{font-family:var(--display);font-size:20px;letter-spacing:2px;color:var(--accent);}
  .btn-close{background:transparent;border:1px solid var(--border);color:var(--text-dim);width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
  .btn-close:hover{border-color:var(--danger);color:var(--danger);}

  .scanner-video-wrap{position:relative;width:100%;height:280px;background:#000;overflow:hidden;}
  .scanner-video-wrap video{width:100%;height:100%;object-fit:cover;display:block;}
  .scanner-crosshair{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}
  .scanner-crosshair::before{content:'';display:block;width:220px;height:100px;border:2px solid var(--accent);box-shadow:0 0 0 9999px rgba(0,0,0,.45);}
  .scanner-line{position:absolute;left:calc(50% - 110px);width:220px;height:2px;background:var(--accent);box-shadow:0 0 8px var(--accent);animation:scanline 2s ease-in-out infinite;}
  @keyframes scanline{0%,100%{top:calc(50% - 50px);}50%{top:calc(50% + 48px);}}

  /* Barra de progresso de confirmação */
  .confirm-bar-wrap{padding:10px 20px;background:var(--surface2);border-top:1px solid var(--border);}
  .confirm-bar-label{font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:6px;letter-spacing:1px;}
  .confirm-bar-track{height:6px;background:var(--border);border-radius:3px;overflow:hidden;}
  .confirm-bar-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .15s ease;}
  .confirm-bar-fill.done{background:var(--success);}

  .scanner-status{padding:10px 20px;background:rgba(245,166,35,.08);border-top:1px solid var(--border);font-family:var(--mono);font-size:12px;color:var(--text-dim);min-height:40px;display:flex;align-items:center;gap:8px;}
  .scanner-status.ok{color:var(--success);background:rgba(82,196,26,.08);border-top-color:var(--success);}
  .scanner-status.err{color:var(--danger);background:rgba(255,77,79,.08);border-top-color:var(--danger);}

  .cam-select-wrap{padding:10px 20px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;}
  .cam-select-wrap label{font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap;}
  .cam-select-wrap select{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:6px 10px;font-family:var(--mono);font-size:12px;outline:none;cursor:pointer;}
  .cam-select-wrap select:focus{border-color:var(--accent);}

  .scanner-manual{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:10px;}
  .scanner-manual input{flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 12px;font-family:var(--mono);font-size:13px;outline:none;}
  .scanner-manual input:focus{border-color:var(--accent);}
  .scanner-manual button{background:var(--accent);color:#0f0f0f;border:none;padding:10px 18px;font-family:var(--mono);font-size:13px;cursor:pointer;font-weight:600;}
  .scanner-manual button:hover{background:var(--accent2);color:white;}

  .saida-result-card{background:var(--surface2);border:1px solid var(--accent);padding:20px;margin:20px 0;}
  .saida-product-name{font-family:var(--display);font-size:28px;letter-spacing:2px;color:var(--text);margin-bottom:8px;}
  .saida-product-info{font-family:var(--mono);font-size:12px;color:var(--text-dim);}

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
// SCANNER — confirmação tripla para evitar leitura errada
// ============================================================
const CONFIRM_NEEDED = 3; // quantas leituras iguais para confirmar

function ScannerModal({ onScan, onClose, title = "ESCANEAR CÓDIGO" }) {
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const animRef      = useRef(null);
  const detectorRef  = useRef(null);
  const isScanRef    = useRef(false);
  const historyRef   = useRef([]); // últimas N leituras

  const [cameras, setCameras]           = useState([]);
  const [selectedCamera, setSelected]   = useState("");
  const [status, setStatus]             = useState({ msg: "Iniciando câmera...", type: "" });
  const [confirmCount, setConfirmCount] = useState(0);
  const [pendingCode, setPendingCode]   = useState("");
  const [manualCode, setManualCode]     = useState("");
  const [ready, setReady]               = useState(false);

  // listar câmeras
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
        setStatus({ msg: "Permissão de câmera negada. Use o campo manual abaixo.", type: "err" });
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCamera) return;
    startCamera(selectedCamera);
    return () => stopCamera();
  }, [selectedCamera]);

  const stopCamera = () => {
    isScanRef.current = false;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (window.Quagga) { try { window.Quagga.stop(); } catch {} }
  };

  const startCamera = async (deviceId) => {
    stopCamera();
    setReady(false);
    historyRef.current = [];
    setConfirmCount(0);
    setPendingCode("");
    setStatus({ msg: "Iniciando câmera...", type: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
      setStatus({ msg: "Aponte o código de barras para a câmera", type: "" });
      startDetection(deviceId);
    } catch (err) {
      setStatus({ msg: "Erro ao abrir câmera: " + err.message, type: "err" });
    }
  };

  // Recebe cada leitura bruta e aplica lógica de confirmação tripla
  const handleRawRead = useCallback((code) => {
    const h = historyRef.current;
    h.push(code);
    if (h.length > CONFIRM_NEEDED) h.shift();

    // Verifica se as últimas N leituras são todas iguais
    const allSame = h.length === CONFIRM_NEEDED && h.every(c => c === h[0]);

    if (allSame) {
      isScanRef.current = false;
      stopCamera();
      setConfirmCount(CONFIRM_NEEDED);
      setPendingCode(code);
      setStatus({ msg: `✓ Código confirmado: ${code}`, type: "ok" });
      setTimeout(() => onScan(code), 500);
    } else {
      // mostra progresso
      const streak = h.filter(c => c === code).length;
      setConfirmCount(streak);
      setPendingCode(code);
      setStatus({ msg: `Lendo... (${streak}/${CONFIRM_NEEDED} confirmações)`, type: "" });
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
          try {
            const results = await detectorRef.current.detect(videoRef.current);
            if (results.length > 0) handleRawRead(results[0].rawValue);
          } catch {}
        }
        animRef.current = requestAnimationFrame(loop);
      };
      loop();
      return;
    }

    // Fallback Quagga
    if (!window.Quagga) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    isScanRef.current = true;
    window.Quagga.init({
      inputStream: {
        name: "Live", type: "LiveStream",
        target: videoRef.current?.parentElement,
        constraints: { deviceId: { exact: deviceId }, width: 500, height: 280 },
      },
      decoder: {
        readers: ["ean_reader","ean_8_reader","code_128_reader","code_39_reader","upc_reader"],
      },
      locate: true,
    }, (err) => {
      if (err) { setStatus({ msg: "Erro no scanner: " + err.message, type: "err" }); return; }
      window.Quagga.start();
      window.Quagga.onDetected((result) => {
        if (!isScanRef.current) return;
        handleRawRead(result.codeResult.code);
      });
    });
  }, [handleRawRead]);

  const handleManual = () => { if (manualCode.trim()) onScan(manualCode.trim()); };

  const pct = Math.round((confirmCount / CONFIRM_NEEDED) * 100);

  return (
    <div className="scanner-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="scanner-box">
        <div className="scanner-top">
          <div className="scanner-top-title">{title}</div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {cameras.length > 1 && (
          <div className="cam-select-wrap">
            <label>CÂMERA:</label>
            <select value={selectedCamera} onChange={e => setSelected(e.target.value)}>
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>
              ))}
            </select>
          </div>
        )}

        <div className="scanner-video-wrap">
          <video ref={videoRef} muted playsInline style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
          {ready && <><div className="scanner-crosshair" /><div className="scanner-line" /></>}
        </div>

        {/* Barra de confirmação */}
        <div className="confirm-bar-wrap">
          <div className="confirm-bar-label">
            {pendingCode
              ? `CONFIRMANDO: ${pendingCode} — ${confirmCount}/${CONFIRM_NEEDED}`
              : "Aguardando leitura..."}
          </div>
          <div className="confirm-bar-track">
            <div className={`confirm-bar-fill${pct >= 100 ? " done" : ""}`} style={{ width: pct + "%" }} />
          </div>
        </div>

        <div className={`scanner-status ${status.type}`}>
          {!ready && status.type !== "err" && <span className="loading-spinner" style={{marginRight:8}}></span>}
          {status.msg}
        </div>

        <div className="scanner-manual">
          <input
            type="text"
            placeholder="Ou digite o código manualmente..."
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleManual()}
          />
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
      const m = {
        "auth/invalid-credential":"Email ou senha incorretos.",
        "auth/user-not-found":"Usuário não encontrado.",
        "auth/wrong-password":"Senha incorreta.",
        "auth/too-many-requests":"Muitas tentativas. Tente mais tarde.",
      };
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
// DASHBOARD
// ============================================================
function Dashboard({ products }) {
  const total      = products.length;
  const totalItens = products.reduce((s,p)=>s+(p.quantidade||0),0);
  const zerados    = products.filter(p=>(p.quantidade||0)===0).length;
  const alertas    = products.filter(p=>(p.quantidade||0)<=5);

  return (
    <div>
      <div className="section-title">DASHBOARD</div>
      <div className="section-sub">Visão geral · Firebase Firestore</div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total SKUs</div><div className="stat-value">{total}</div></div>
        <div className="stat-card"><div className="stat-label">Itens em Estoque</div><div className="stat-value" style={{color:"var(--success)"}}>{totalItens}</div></div>
        <div className="stat-card"><div className="stat-label">Sem Estoque</div><div className="stat-value" style={{color:zerados>0?"var(--danger)":"var(--success)"}}>{zerados}</div></div>
      </div>
      <div className="table-wrapper">
        <div className="table-header-row"><div className="table-title">Estoque Baixo / Zerado</div></div>
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Cód. Barras</th><th>Qtd</th><th>Status</th></tr></thead>
          <tbody>
            {alertas.length===0
              ? <tr><td colSpan={5}><div className="empty-state">✓ Todos os produtos com estoque normal</div></td></tr>
              : alertas.map(p=>(
                <tr key={p.id}>
                  <td>{p.nome}</td><td>{p.categoria}</td>
                  <td style={{fontFamily:"var(--mono)",fontSize:12}}>{(p.barcodes||[p.barcode]).join(" · ")}</td>
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
function CadastrarProduto({ onAdd, addToast }) {
  const [nome, setNome]           = useState("");
  const [categoria, setCategoria] = useState("");
  const [barcodes, setBarcodes]   = useState([]); // array de códigos
  const [quantidade, setQuantidade] = useState(1);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleBarcode = (code) => {
    setShowScanner(false);
    if (barcodes.includes(code)) {
      addToast("Esse código já foi adicionado.", "info");
      return;
    }
    setBarcodes(prev => [...prev, code]);
    addToast(`Código adicionado: ${code}`, "info");
  };

  const removeBarcode = (code) => setBarcodes(prev => prev.filter(b => b !== code));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (barcodes.length === 0) { addToast("Adicione pelo menos um código de barras.", "error"); return; }
    setLoading(true);
    try {
      // Busca se algum dos códigos já existe
      let foundDoc = null;
      for (const bc of barcodes) {
        const q = query(collection(db,"produtos"), where("barcodes","array-contains",bc));
        const snap = await getDocs(q);
        if (!snap.empty) { foundDoc = snap.docs[0]; break; }
      }

      if (foundDoc) {
        await updateDoc(doc(db,"produtos",foundDoc.id), { quantidade: increment(Number(quantidade)) });
        addToast(`Entrada de ${quantidade}x "${foundDoc.data().nome}" registrada!`, "success");
      } else {
        await addDoc(collection(db,"produtos"), {
          nome, categoria,
          barcodes,           // array com todos os códigos
          quantidade: Number(quantidade),
          criadoEm: new Date().toISOString(),
        });
        addToast(`"${nome}" cadastrado no Firebase!`, "success");
      }
      onAdd();
      setNome(""); setCategoria(""); setBarcodes([]); setQuantidade(1);
    } catch (err) { addToast("Erro: "+err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="section-title">ENTRADA</div>
      <div className="section-sub">Cadastrar produto ou adicionar estoque</div>
      <div className="card">
        <div className="card-title">NOVO PRODUTO / ENTRADA</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do Produto</label>
              <input className="form-input" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Parafuso M6" required />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input className="form-input" value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Ex: Fixadores" required />
            </div>
          </div>

          {/* Códigos de barras adicionados */}
          <div className="form-group" style={{marginTop:16}}>
            <label className="form-label">Códigos de Barras ({barcodes.length})</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10,minHeight:36}}>
              {barcodes.length === 0 && (
                <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text-dim)"}}>Nenhum código adicionado ainda.</span>
              )}
              {barcodes.map(bc => (
                <div key={bc} style={{display:"flex",alignItems:"center",gap:6,background:"var(--surface2)",border:"1px solid var(--border)",padding:"4px 10px",fontFamily:"var(--mono)",fontSize:12}}>
                  {bc}
                  <button type="button" onClick={()=>removeBarcode(bc)} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:14,lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
            <button className="btn-scan" type="button" onClick={()=>setShowScanner(true)} style={{marginTop:0}}>
              📷 ESCANEAR E ADICIONAR CÓDIGO DE BARRAS
            </button>
            <p style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)",marginTop:8}}>
              💡 Se o produto tem mais de um código de barras, escaneie todos — qualquer um vai funcionar na saída.
            </p>
          </div>

          <div className="form-group" style={{marginTop:8}}>
            <label className="form-label">Quantidade</label>
            <input className="form-input" type="number" min={1} value={quantidade} onChange={e=>setQuantidade(e.target.value)} required style={{width:160}} />
          </div>

          <button className="btn-submit" type="submit" disabled={loading}>
            {loading?"SALVANDO NO FIREBASE...":"CADASTRAR PRODUTO"}
          </button>
        </form>
      </div>
      {showScanner && <ScannerModal title="ESCANEAR — ENTRADA" onScan={handleBarcode} onClose={()=>setShowScanner(false)} />}
    </div>
  );
}

// ============================================================
// SAÍDA
// ============================================================
function SaidaProduto({ onUpdate, addToast, user }) {
  const [password, setPassword]       = useState("");
  const [authOk, setAuthOk]           = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [foundProduct, setFoundProduct] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [manualBarcode, setManual]    = useState("");

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, user.email, password);
      setAuthOk(true); addToast("Identidade confirmada.", "success");
    } catch { addToast("Senha incorreta.", "error"); }
    finally { setLoading(false); }
  };

  const handleBarcodeScan = async (code) => {
    setShowScanner(false); setManual(code); setLoading(true);
    try {
      // Busca pelo array barcodes (novo) OU campo barcode antigo (compatibilidade)
      let found = null;

      const q1 = query(collection(db,"produtos"), where("barcodes","array-contains",code));
      const s1 = await getDocs(q1);
      if (!s1.empty) { const d = s1.docs[0]; found = { id:d.id, ...d.data() }; }

      if (!found) {
        const q2 = query(collection(db,"produtos"), where("barcode","==",code));
        const s2 = await getDocs(q2);
        if (!s2.empty) { const d = s2.docs[0]; found = { id:d.id, ...d.data() }; }
      }

      if (found) {
        setFoundProduct(found);
        addToast(`Encontrado: ${found.nome}`, "info");
      } else {
        setFoundProduct(null);
        addToast(`Código "${code}" não encontrado.`, "error");
      }
    } catch (err) { addToast("Erro: "+err.message, "error"); }
    finally { setLoading(false); }
  };

  const handleSaida = async () => {
    if (!foundProduct || (foundProduct.quantidade||0)<=0) { addToast("Sem estoque!", "error"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db,"produtos",foundProduct.id), { quantidade: increment(-1) });
      addToast(`✓ Saída: 1x "${foundProduct.nome}" registrada.`, "success");
      setFoundProduct(null); setManual(""); setPassword(""); setAuthOk(false);
      onUpdate();
    } catch (err) { addToast("Erro: "+err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="section-title">SAÍDA</div>
      <div className="section-sub">Retirada de produto do estoque</div>

      {!authOk ? (
        <div className="card">
          <div className="card-title">CONFIRMAR IDENTIDADE</div>
          <p style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text-dim)",marginBottom:20}}>
            Confirme a senha de administrador para liberar a retirada.
          </p>
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
              {loading?"VERIFICANDO...":"CONFIRMAR IDENTIDADE"}
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">REGISTRAR SAÍDA</div>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            <input className="form-input" placeholder="Código de barras..." value={manualBarcode} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleBarcodeScan(manualBarcode)} style={{flex:1}} />
            <button className="btn-icon" style={{padding:"12px 14px"}} onClick={()=>handleBarcodeScan(manualBarcode)} disabled={loading}>
              {loading?<span className="loading-spinner"></span>:"OK"}
            </button>
          </div>
          <button className="btn-scan" onClick={()=>setShowScanner(true)}>
            📷 ESCANEAR CÓDIGO DE BARRAS — SAÍDA
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
              {(foundProduct.quantidade||0)>0 ? (
                <button className="btn-danger-big" onClick={handleSaida} disabled={loading}>
                  {loading?"REGISTRANDO...":"✓ CONFIRMAR SAÍDA — 1 UNIDADE"}
                </button>
              ) : (
                <div style={{marginTop:12,fontFamily:"var(--mono)",fontSize:13,color:"var(--danger)"}}>⚠ Estoque zerado.</div>
              )}
            </div>
          )}
        </div>
      )}
      {showScanner && <ScannerModal title="CÓDIGO — SAÍDA" onScan={handleBarcodeScan} onClose={()=>setShowScanner(false)} />}
    </div>
  );
}

// ============================================================
// INVENTÁRIO
// ============================================================
function ListarProdutos({ products, onDelete, addToast }) {
  const [search, setSearch]   = useState("");
  const [loadingId, setLoadId] = useState(null);

  const filtered = products.filter(p => {
    const codes = (p.barcodes || [p.barcode]).join(" ");
    return (p.nome||"").toLowerCase().includes(search.toLowerCase()) ||
           (p.categoria||"").toLowerCase().includes(search.toLowerCase()) ||
           codes.includes(search);
  });

  const handleDelete = async (p) => {
    if (!confirm(`Excluir "${p.nome}" do Firebase?`)) return;
    setLoadId(p.id);
    try {
      await deleteDoc(doc(db,"produtos",p.id));
      onDelete(); addToast(`"${p.nome}" removido.`, "success");
    } catch (err) { addToast("Erro: "+err.message, "error"); }
    finally { setLoadId(null); }
  };

  return (
    <div>
      <div className="section-title">INVENTÁRIO</div>
      <div className="section-sub">{products.length} SKUs no Firebase</div>
      <div className="table-wrapper">
        <div className="table-header-row">
          <div className="table-title">Todos os Produtos</div>
          <input className="form-input" style={{width:260,margin:0,padding:"8px 12px",fontSize:12}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Nome</th><th>Categoria</th><th>Códigos de Barras</th><th>Qtd</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={6}><div className="empty-state">Nenhum produto encontrado.</div></td></tr>
              : filtered.map(p=>(
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.categoria}</td>
                  <td style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-dim)"}}>
                    {(p.barcodes||[p.barcode]).map(bc=>(
                      <div key={bc}>{bc}</div>
                    ))}
                  </td>
                  <td><strong style={{fontFamily:"var(--mono)",fontSize:16,color:p.quantidade===0?"var(--danger)":p.quantidade<=5?"var(--accent)":"var(--success)"}}>{p.quantidade}</strong></td>
                  <td>{p.quantidade===0?<span className="badge badge-zero">ZERADO</span>:p.quantidade<=5?<span className="badge badge-low">BAIXO</span>:<span className="badge badge-ok">OK</span>}</td>
                  <td><button className="btn-icon" onClick={()=>handleDelete(p)} disabled={loadingId===p.id}>{loadingId===p.id?<span className="loading-spinner"></span>:"🗑"}</button></td>
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
  const [tab, setTab]           = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [toasts, setToasts]     = useState([]);
  const [loadingP, setLoadingP] = useState(false);

  const addToast = useCallback((message, type="info") => {
    const id = Date.now();
    setToasts(prev=>[...prev,{id,message,type}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),3500);
  },[]);

  const loadProducts = useCallback(async () => {
    setLoadingP(true);
    try {
      const snap = await getDocs(collection(db,"produtos"));
      setProducts(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch (err) { addToast("Erro ao carregar: "+err.message,"error"); }
    finally { setLoadingP(false); }
  },[addToast]);

  useEffect(()=>{ if(user) loadProducts(); },[user,loadProducts]);

  const handleLogout = async () => {
    await signOut(auth); setUser(null); setTab("dashboard"); setProducts([]);
  };

  if (!user) return (<><style>{styles}</style><LoginScreen onLogin={setUser}/><Toast toasts={toasts}/></>);

  const nav = [
    {id:"dashboard",icon:"▦",label:"Dashboard"},
    {id:"entrada",icon:"↑",label:"Entrada"},
    {id:"saida",icon:"↓",label:"Saída"},
    {id:"inventario",icon:"≡",label:"Inventário"},
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">ESTOQUE <span>PARK · SISTEMA DE CONTROLE</span></div>
          <div className="header-user">
            <span>● {user.email}</span>
            <button className="btn-logout" onClick={handleLogout}>SAIR</button>
          </div>
        </header>
        <div className="main-layout">
          <nav className="sidebar">
            {nav.map(item=>(
              <div key={item.id} className={`sidebar-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
                <span style={{fontSize:16}}>{item.icon}</span>{item.label}
              </div>
            ))}
          </nav>
          <main className="content">
            {loadingP
              ? <div style={{display:"flex",gap:12,alignItems:"center",fontFamily:"var(--mono)",fontSize:13,color:"var(--text-dim)"}}><div className="loading-spinner"></div> Carregando do Firebase...</div>
              : <>
                  {tab==="dashboard"  && <Dashboard products={products}/>}
                  {tab==="entrada"    && <CadastrarProduto onAdd={loadProducts} addToast={addToast}/>}
                  {tab==="saida"      && <SaidaProduto onUpdate={loadProducts} addToast={addToast} user={user}/>}
                  {tab==="inventario" && <ListarProdutos products={products} onDelete={loadProducts} addToast={addToast}/>}
                </>
            }
          </main>
        </div>
      </div>
      <Toast toasts={toasts}/>
    </>
  );
}