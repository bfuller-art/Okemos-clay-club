import { useState, useMemo, useEffect, useCallback } from "react";
import { db } from "./firebase.js";
import {
  doc, setDoc, onSnapshot,
  collection, addDoc, query, orderBy, getDocs
} from "firebase/firestore";

// ── ACCESS PINS ──────────────────────────────
const VIEWER_PIN = "7396";
const ADMIN_PIN  = "3142";
const OWNER_PIN  = "1921";

const SEED_SQUADS = [
  { id: 1, name: "Squad Alpha" },
  { id: 2, name: "Squad Bravo" },
];

const CLASSIFICATIONS = ["AA", "A", "B", "C", "D", "E", "Unclassified"];

const FONT = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lora:wght@400;600&family=Source+Code+Pro:wght@400;600&display=swap";

// ── CSS ──────────────────────────────────────
const css = `
  @import url('${FONT}');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #1a1a14; }

  .app { min-height: 100vh; background: #1a1a14; color: #e8e0d0; font-family: 'Lora', Georgia, serif; }

  /* LOGIN SCREEN */
  .login-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at 50% 30%, #2a1a08 0%, #1a1a14 60%);
    padding: 20px;
  }
  .login-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.6rem;
    letter-spacing: 4px;
    color: #e8e0d0;
    text-align: center;
    line-height: 1.1;
    margin-bottom: 6px;
  }
  .login-sub {
    font-family: 'Source Code Pro', monospace;
    font-size: 0.7rem;
    color: #c4581a;
    letter-spacing: 3px;
    text-transform: uppercase;
    text-align: center;
    margin-bottom: 40px;
  }
  .login-card {
    background: #111108;
    border: 1px solid #2a2a1e;
    border-top: 3px solid #c4581a;
    padding: 32px 28px;
    width: 100%;
    max-width: 340px;
  }
  .login-card-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.2rem;
    letter-spacing: 3px;
    color: #c4581a;
    margin-bottom: 20px;
    text-align: center;
  }
  .login-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .login-label { font-family: 'Source Code Pro', monospace; font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase; color: #7a7060; }
  .login-name-input { background: #1a1a10; border: 1px solid #2a2a1e; color: #e8e0d0; font-family: 'Lora', serif; font-size: 0.92rem; padding: 9px 12px; border-radius: 2px; outline: none; width: 100%; transition: border-color 0.15s; }
  .login-name-input:focus { border-color: #c4581a; }
  .login-pin { background: #1a1a10; border: 1px solid #2a2a1e; color: #e8631a; font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; letter-spacing: 8px; padding: 10px 14px; text-align: center; width: 100%; outline: none; border-radius: 2px; margin-bottom: 4px; transition: border-color 0.15s; }
  .login-pin:focus { border-color: #c4581a; }
  .login-pin.err { border-color: #c44a2a; animation: shake 0.3s; }
  .login-err { font-family: 'Source Code Pro', monospace; font-size: 0.68rem; color: #c44a2a; letter-spacing: 1px; min-height: 18px; margin-bottom: 10px; }
  .login-btn { width: 100%; padding: 13px; background: #c4581a; border: none; color: #0d0d08; font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 3px; cursor: pointer; transition: background 0.15s; border-radius: 2px; }
  .login-btn:hover { background: #e8631a; }
  .login-tabs { display: flex; gap: 0; margin-bottom: 20px; border: 1px solid #2a2a1e; }
  .login-tab { flex: 1; padding: 8px; background: none; border: none; color: #7a7060; font-family: 'Source Code Pro', monospace; font-size: 0.65rem; letter-spacing: 1px; cursor: pointer; transition: all 0.15s; text-transform: uppercase; }
  .login-tab.active { background: #c4581a18; color: #e8631a; border-bottom: 2px solid #c4581a; }
  .login-tab.owner-tab.active { background: #1a2a3a; color: #6ab4e8; border-bottom-color: #2a6a9a; }

  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }

  /* HEADER */
  .header { background: linear-gradient(180deg, #0d0d08 0%, #1a1a14 100%); border-bottom: 2px solid #c4581a; padding: 14px 20px 11px; display: flex; align-items: flex-end; gap: 12px; }
  .header-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.7rem; letter-spacing: 3px; color: #e8e0d0; line-height: 1; }
  .header-sub { font-family: 'Source Code Pro', monospace; font-size: 0.65rem; color: #c4581a; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 2px; }
  .header-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
  .save-ind { font-family: 'Source Code Pro', monospace; font-size: 0.6rem; letter-spacing: 1px; padding: 3px 8px; border-radius: 2px; transition: all 0.3s; }
  .save-ind.saving { color: #e8b84a; background: #2a2210; border: 1px solid #4a3a10; }
  .save-ind.saved   { color: #4a8a3a; background: #1a2a14; border: 1px solid #2a4a1a; }
  .save-ind.error   { color: #c44a2a; background: #2a1410; border: 1px solid #4a2010; }
  .role-badge { font-family: 'Source Code Pro', monospace; font-size: 0.6rem; letter-spacing: 2px; padding: 2px 8px; border-radius: 2px; }
  .role-badge.viewer { background: #1e1e14; border: 1px solid #3a3a2a; color: #7a7060; }
  .role-badge.admin  { background: #c4581a22; border: 1px solid #c4581a66; color: #e8631a; }
  .role-badge.owner  { background: #1a2a3a; border: 1px solid #2a6a9a; color: #6ab4e8; }
  .lock-btn { padding: 4px 12px; background: none; border: 1px solid #3a3a2a; color: #7a7060; font-family: 'Source Code Pro', monospace; font-size: 0.65rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; transition: all 0.15s; }
  .lock-btn:hover { border-color: #c44a2a; color: #c44a2a; }

  /* NAV */
  .nav { display: flex; background: #111108; border-bottom: 1px solid #2a2a1e; padding: 0 16px; gap: 2px; overflow-x: auto; }
  .nav-btn { background: none; border: none; color: #7a7060; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; padding: 11px 16px; cursor: pointer; border-bottom: 3px solid transparent; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
  .nav-btn:hover { color: #e8e0d0; }
  .nav-btn.active { color: #e8631a; border-bottom-color: #e8631a; }
  .nav-btn.reg { color: #4a8aba; }
  .nav-btn.reg.active { color: #6ab4e8; border-bottom-color: #6ab4e8; }

  /* CONTENT */
  .content { max-width: 960px; margin: 0 auto; padding: 24px 16px; }

  /* LOADING */
  .loading-screen { display: flex; align-items: center; justify-content: center; height: 60vh; flex-direction: column; gap: 16px; }
  .loading-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 4px; color: #c4581a; }
  .dots { display: flex; gap: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #c4581a; animation: blink 1.2s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; } .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }

  /* SECTIONS */
  .sec-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.7rem; letter-spacing: 3px; color: #e8e0d0; margin-bottom: 5px; }
  .sec-sub { font-family: 'Source Code Pro', monospace; font-size: 0.68rem; color: #c4581a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 22px; }
  .viewer-notice { display: flex; align-items: center; gap: 10px; background: #111108; border: 1px solid #2a2a1e; border-left: 3px solid #4a4a3a; padding: 10px 14px; margin-bottom: 22px; font-family: 'Source Code Pro', monospace; font-size: 0.68rem; color: #7a7060; letter-spacing: 1px; }

  /* STATS */
  .stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 24px; }
  .stat-box { background: #111108; border: 1px solid #2a2a1e; padding: 12px 14px; }
  .stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 1.9rem; color: #e8631a; letter-spacing: 2px; line-height: 1; }
  .stat-lbl { font-family: 'Source Code Pro', monospace; font-size: 0.58rem; color: #5a5040; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }

  /* LEADERBOARD */
  .lb-table { width: 100%; border-collapse: collapse; }
  .lb-table th { font-family: 'Source Code Pro', monospace; font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase; color: #7a7060; text-align: left; padding: 7px 12px; border-bottom: 1px solid #2a2a1e; }
  .lb-table td { padding: 10px 12px; border-bottom: 1px solid #1f1f14; font-size: 0.9rem; }
  .lb-table tr:hover td { background: #1f1f14; }
  .r1 td:first-child { color: #e8c64a; } .r2 td:first-child { color: #bdbdbd; } .r3 td:first-child { color: #c4884a; }
  .rn { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 1px; }
  .sname { font-weight: 600; color: #e8e0d0; }
  .cbadge { display: inline-block; padding: 1px 6px; border: 1px solid #c4581a44; background: #c4581a18; color: #e8631a; font-family: 'Source Code Pro', monospace; font-size: 0.65rem; letter-spacing: 1px; border-radius: 2px; margin-left: 7px; }
  .avg { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: #e8631a; }
  .avgx { font-family: 'Source Code Pro', monospace; font-size: 0.7rem; color: #7a7060; margin-left: 3px; }
  .tbar { display: flex; gap: 3px; align-items: center; }
  .tdot { width: 6px; height: 6px; border-radius: 50%; background: #2a2a1e; }
  .tdot.h { background: #c4581a; }

  /* FILTERS */
  .filters { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
  .fsel { background: #111108; border: 1px solid #2a2a1e; color: #e8e0d0; font-family: 'Source Code Pro', monospace; font-size: 0.72rem; padding: 7px 11px; border-radius: 2px; cursor: pointer; outline: none; }
  .fsel:focus { border-color: #c4581a; }

  /* HISTORY TABLE */
  .ht { width: 100%; border-collapse: collapse; }
  .ht th { font-family: 'Source Code Pro', monospace; font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase; color: #7a7060; text-align: left; padding: 7px 11px; border-bottom: 1px solid #2a2a1e; }
  .ht td { padding: 9px 11px; border-bottom: 1px solid #1a1a10; font-size: 0.86rem; }
  .ht tr:hover td { background: #1f1f14; }
  .sc { font-family: 'Bebas Neue', sans-serif; font-size: 1.15rem; letter-spacing: 1px; }
  .sh { color: #e8631a; } .sm { color: #e8b84a; } .sl { color: #8a9a7a; }
  .del-btn { background: none; border: none; color: #3a3a2a; cursor: pointer; font-size: 0.95rem; padding: 2px 6px; border-radius: 2px; transition: color 0.15s, background 0.15s; }
  .del-btn:hover { color: #c44a2a; background: #2a1a14; }

  /* FORM */
  .form-card { background: #111108; border: 1px solid #2a2a1e; border-top: 3px solid #c4581a; padding: 26px; max-width: 520px; }
  .fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .ff { display: flex; flex-direction: column; gap: 5px; }
  .ff.full { grid-column: 1/-1; }
  .flbl { font-family: 'Source Code Pro', monospace; font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase; color: #7a7060; }
  .finp { background: #1a1a10; border: 1px solid #2a2a1e; color: #e8e0d0; font-family: 'Lora', serif; font-size: 0.9rem; padding: 9px 11px; border-radius: 2px; outline: none; transition: border-color 0.15s; }
  .finp:focus { border-color: #c4581a; }
  .score-disp { text-align: center; margin: 18px 0; padding: 14px; background: #0d0d08; border: 1px solid #2a2a1e; }
  .sbig { font-family: 'Bebas Neue', sans-serif; font-size: 3.8rem; letter-spacing: 4px; color: #e8631a; line-height: 1; }
  .sbiglbl { font-family: 'Source Code Pro', monospace; font-size: 0.62rem; color: #7a7060; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
  .pbar { width: 100%; height: 4px; background: #2a2a1e; margin-top: 8px; border-radius: 2px; overflow: hidden; }
  .pfill { height: 100%; background: linear-gradient(90deg,#7a3a0a,#e8631a); transition: width 0.3s; border-radius: 2px; }
  .sub-btn { width: 100%; padding: 12px; background: #c4581a; border: none; color: #0d0d08; font-family: 'Bebas Neue', sans-serif; font-size: 1.25rem; letter-spacing: 3px; cursor: pointer; transition: background 0.15s; margin-top: 8px; }
  .sub-btn:hover { background: #e8631a; }
  .sub-btn:disabled { background: #3a2a1a; color: #7a6a5a; cursor: not-allowed; }
  .toast { background: #1a2a14; border: 1px solid #4a8a3a; color: #9acc8a; font-family: 'Source Code Pro', monospace; font-size: 0.72rem; padding: 9px 13px; margin-top: 11px; letter-spacing: 1px; }

  /* SHOOTERS */
  .sgrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(190px,1fr)); gap: 11px; margin-bottom: 26px; }
  .scard { background: #111108; border: 1px solid #2a2a1e; padding: 14px; position: relative; }
  .scard-name { font-weight: 600; font-size: 0.93rem; color: #e8e0d0; margin-bottom: 3px; }
  .scard-meta { font-family: 'Source Code Pro', monospace; font-size: 0.65rem; color: #7a7060; letter-spacing: 1px; }
  .scard-avg { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: #c4581a; margin-top: 7px; letter-spacing: 1px; }
  .scard-rnds { font-family: 'Source Code Pro', monospace; font-size: 0.63rem; color: #5a5040; letter-spacing: 1px; }
  .sdel { position: absolute; top: 7px; right: 7px; background: none; border: none; color: #3a3a2a; cursor: pointer; font-size: 0.78rem; transition: color 0.15s; }
  .sdel:hover { color: #c44a2a; }
  .asf { background: #111108; border: 1px solid #2a2a1e; border-top: 2px solid #c4581a; padding: 18px; max-width: 480px; }
  .asf-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem; letter-spacing: 3px; color: #c4581a; margin-bottom: 13px; }
  .asgrid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 11px; margin-bottom: 11px; }
  .add-btn { padding: 8px 18px; background: none; border: 1px solid #c4581a; color: #c4581a; font-family: 'Bebas Neue', sans-serif; font-size: 0.95rem; letter-spacing: 2px; cursor: pointer; transition: background 0.15s,color 0.15s; }
  .add-btn:hover { background: #c4581a; color: #0d0d08; }
  .squad-row { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .sqchip { padding: 5px 13px; border: 1px solid #2a2a1e; background: none; color: #7a7060; font-family: 'Source Code Pro', monospace; font-size: 0.68rem; letter-spacing: 1px; cursor: pointer; border-radius: 2px; transition: all 0.15s; }
  .sqchip.on { border-color: #c4581a; color: #e8631a; background: #c4581a18; }
  .empty { text-align: center; padding: 44px 20px; color: #5a5040; font-family: 'Source Code Pro', monospace; font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; }
  .danger-zone { margin-top: 38px; border: 1px solid #3a1a10; padding: 15px 18px; max-width: 480px; }
  .dz-title { font-family: 'Source Code Pro', monospace; font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase; color: #7a3a2a; margin-bottom: 9px; }
  .dz-btn { padding: 6px 14px; background: none; border: 1px solid #6a2a1a; color: #c44a2a; font-family: 'Source Code Pro', monospace; font-size: 0.7rem; letter-spacing: 1px; cursor: pointer; transition: all 0.15s; }
  .dz-btn:hover { background: #2a1010; border-color: #c44a2a; }

  /* REGISTRY */
  .reg-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
  .reg-sub { font-family: 'Source Code Pro', monospace; font-size: 0.65rem; color: #4a8aba; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .print-btn { padding: 8px 18px; background: none; border: 1px solid #2a6a9a; color: #6ab4e8; font-family: 'Source Code Pro', monospace; font-size: 0.7rem; letter-spacing: 2px; cursor: pointer; transition: all 0.15s; text-transform: uppercase; }
  .print-btn:hover { background: #1a3a5a; }
  .yfolder { margin-bottom: 13px; border: 1px solid #1e2a38; }
  .yhdr { display: flex; align-items: center; gap: 12px; padding: 10px 15px; background: #0d1520; cursor: pointer; user-select: none; transition: background 0.15s; }
  .yhdr:hover { background: #111d2a; }
  .ylbl { font-family: 'Bebas Neue', sans-serif; font-size: 1.15rem; letter-spacing: 3px; color: #6ab4e8; }
  .ycnt { font-family: 'Source Code Pro', monospace; font-size: 0.63rem; color: #4a6a8a; letter-spacing: 1px; }
  .ychev { margin-left: auto; font-size: 0.68rem; color: #4a6a8a; transition: transform 0.2s; }
  .ychev.open { transform: rotate(90deg); }
  .at { width: 100%; border-collapse: collapse; }
  .at th { font-family: 'Source Code Pro', monospace; font-size: 0.58rem; letter-spacing: 2px; text-transform: uppercase; color: #4a6a8a; text-align: left; padding: 7px 13px; border-bottom: 1px solid #1a2a38; background: #0a1018; }
  .at td { padding: 9px 13px; border-bottom: 1px solid #0f1820; font-size: 0.83rem; vertical-align: top; }
  .at tr:hover td { background: #0d1822; }
  .ats { font-family: 'Source Code Pro', monospace; font-size: 0.7rem; color: #4a6a8a; white-space: nowrap; }
  .atu { font-family: 'Source Code Pro', monospace; font-size: 0.76rem; color: #6ab4e8; letter-spacing: 1px; font-weight: 600; }
  .ata { font-size: 0.83rem; color: #a8c0d0; }
  .atype { display: inline-block; padding: 1px 6px; border-radius: 2px; font-family: 'Source Code Pro', monospace; font-size: 0.58rem; letter-spacing: 1px; margin-right: 7px; }
  .atype.add    { background: #1a2a14; border: 1px solid #2a5a1a; color: #6ac06a; }
  .atype.delete { background: #2a1414; border: 1px solid #5a2a1a; color: #c07070; }
  .atype.log    { background: #1a1a2a; border: 1px solid #2a3a5a; color: #7a9adc; }
  .audit-empty { text-align: center; padding: 44px 20px; color: #2a4a6a; font-family: 'Source Code Pro', monospace; font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; }

  @media print {
    .header, .nav, .print-btn, .lock-btn { display: none !important; }
    .app { background: white !important; color: black !important; }
    .yfolder { border-color: #ccc !important; page-break-inside: avoid; }
    .at td, .at th, .ats, .atu, .ata, .ylbl { color: black !important; }
    .content { max-width: 100%; padding: 10px; }
    .ychev { display: none; }
  }

  @media (max-width: 600px) {
    .stats-row { grid-template-columns: repeat(2,1fr); }
    .header-logo { font-size: 1.4rem; }
    .fgrid { grid-template-columns: 1fr; }
    .ff.full { grid-column: 1; }
    .asgrid { grid-template-columns: 1fr 1fr; }
  }
`;

// ── HELPERS ─────────────────────────────────
function scoreCls(s, t) {
  const p = s / t;
  return p >= 0.85 ? "sh" : p >= 0.65 ? "sm" : "sl";
}

function sStats(id, rounds) {
  const r = rounds.filter(r => r.shooterId === id);
  if (!r.length) return { avg: null, count: 0, best: null };
  const avg = r.reduce((a, b) => a + (b.score / b.total) * 100, 0) / r.length;
  const best = Math.max(...r.map(x => (x.score / x.total) * 100));
  return { avg: Math.round(avg * 10) / 10, count: r.length, best: Math.round(best * 10) / 10 };
}

function fmtTs(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + "  " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── APP ──────────────────────────────────────
export default function App() {
  // auth
  const [role, setRole]         = useState(null); // null=loading, "viewer","admin","owner"
  const [adminUser, setAdminUser] = useState("");
  const [loginType, setLoginType] = useState("viewer"); // viewer|admin|owner
  const [pinVal, setPinVal]     = useState("");
  const [nameVal, setNameVal]   = useState("");
  const [pinErr, setPinErr]     = useState(false);

  // data
  const [dbLoaded, setDbLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [shooters, setShooters] = useState([]);
  const [squads, setSquads]     = useState([]);
  const [rounds, setRounds]     = useState([]);
  const [nextId, setNextId]     = useState({ shooter: 1, round: 1 });
  const [auditLog, setAuditLog] = useState([]);

  // ui
  const [tab, setTab]           = useState("leaderboard");
  const [form, setForm]         = useState({ shooterId: "", date: new Date().toISOString().slice(0,10), score: "", total: "100", notes: "" });
  const [toastMsg, setToastMsg] = useState("");
  const [newShooter, setNewShooter] = useState({ name: "", classification: "C", squadId: "" });
  const [sqFilter, setSqFilter] = useState("all");
  const [hShooter, setHShooter] = useState("all");
  const [hSquad, setHSquad]     = useState("all");
  const [openYears, setOpenYears] = useState({});

  // ── Firestore real-time listener (once role is set) ──
  useEffect(() => {
    if (!role) return;
    const unsub = onSnapshot(doc(db, "club", "data"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setShooters(d.shooters || []);
        setSquads(d.squads || SEED_SQUADS);
        setRounds(d.rounds || []);
        setNextId(d.nextId || { shooter: 1, round: 1 });
      } else {
        setSquads(SEED_SQUADS);
      }
      setDbLoaded(true);
    });
    return () => unsub();
  }, [role]);

  // ── Load audit log (owner only) ──
  useEffect(() => {
    if (role !== "owner") return;
    async function loadAudit() {
      try {
        const q = query(collection(db, "audit"), orderBy("ts", "desc"));
        const snap = await getDocs(q);
        setAuditLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
    }
    loadAudit();
  }, [role]);

  // ── Save main data ──
  const saveData = useCallback(async (s, sq, r, nid) => {
    setSaveStatus("saving");
    try {
      await setDoc(doc(db, "club", "data"), { shooters: s, squads: sq, rounds: r, nextId: nid });
      setSaveStatus("saved");
    } catch { setSaveStatus("error"); }
  }, []);

  // debounced save
  const pendingSave = useCallback((s, sq, r, nid) => {
    setSaveStatus("saving");
    const t = setTimeout(() => saveData(s, sq, r, nid), 600);
    return t;
  }, [saveData]);

  // ── Append audit entry ──
  async function logAudit(type, description) {
    if (role !== "admin") return;
    const entry = { ts: new Date().toISOString(), username: adminUser, type, description };
    try {
      const ref = await addDoc(collection(db, "audit"), entry);
      setAuditLog(prev => [{ id: ref.id, ...entry }, ...prev]);
    } catch (e) { console.error("Audit write failed", e); }
  }

  // ── Login ──
  function tryLogin() {
    if (loginType === "owner") {
      if (pinVal === OWNER_PIN) { setRole("owner"); setAdminUser("Owner"); setPinVal(""); }
      else shake();
    } else if (loginType === "admin") {
      if (!nameVal.trim()) { setPinErr(true); setTimeout(() => setPinErr(false), 800); return; }
      if (pinVal === ADMIN_PIN) { setRole("admin"); setAdminUser(nameVal.trim()); setPinVal(""); setNameVal(""); }
      else shake();
    } else {
      if (pinVal === VIEWER_PIN) { setRole("viewer"); setPinVal(""); }
      else shake();
    }
  }

  function shake() { setPinErr(true); setPinVal(""); setTimeout(() => setPinErr(false), 800); }
  function handleKey(e) { if (e.key === "Enter") tryLogin(); }
  function lockOut() { setRole(null); setAdminUser(""); setTab("leaderboard"); setDbLoaded(false); }

  // ── Data mutations ──
  function logRound() {
    if (!form.shooterId || !form.score || !form.date) return;
    const shooter = shooters.find(s => s.id === +form.shooterId);
    const nr = { id: nextId.round, shooterId: +form.shooterId, date: form.date, score: +form.score, total: +form.total, notes: form.notes };
    const newRounds = [nr, ...rounds];
    const newNid = { ...nextId, round: nextId.round + 1 };
    setRounds(newRounds);
    setNextId(newNid);
    pendingSave(shooters, squads, newRounds, newNid);
    logAudit("log", `Logged ${form.score}/${form.total} for ${shooter?.name || "Unknown"} on ${form.date}${form.notes ? ` — note: "${form.notes}"` : ""}`);
    setToastMsg(`Logged: ${form.score}/${form.total} for ${shooter?.name}`);
    setForm(f => ({ ...f, shooterId: "", score: "", notes: "" }));
    setTimeout(() => setToastMsg(""), 3500);
  }

  function addShooter() {
    if (!newShooter.name.trim()) return;
    const squad = squads.find(sq => sq.id === +newShooter.squadId);
    const ns = { id: nextId.shooter, name: newShooter.name.trim(), classification: newShooter.classification, squadId: newShooter.squadId ? +newShooter.squadId : null };
    const newShooters = [...shooters, ns];
    const newNid = { ...nextId, shooter: nextId.shooter + 1 };
    setShooters(newShooters);
    setNextId(newNid);
    pendingSave(newShooters, squads, rounds, newNid);
    logAudit("add", `Added shooter "${ns.name}" — Class ${ns.classification}, ${squad?.name || "no squad"}`);
    setNewShooter({ name: "", classification: "C", squadId: "" });
  }

  function deleteShooter(id) {
    const s = shooters.find(x => x.id === id);
    const newShooters = shooters.filter(x => x.id !== id);
    const newRounds = rounds.filter(r => r.shooterId !== id);
    setShooters(newShooters);
    setRounds(newRounds);
    pendingSave(newShooters, squads, newRounds, nextId);
    logAudit("delete", `Deleted shooter "${s?.name}" and all their rounds`);
  }

  function deleteRound(id) {
    const r = rounds.find(x => x.id === id);
    const s = shooters.find(x => x.id === r?.shooterId);
    const newRounds = rounds.filter(x => x.id !== id);
    setRounds(newRounds);
    pendingSave(shooters, squads, newRounds, nextId);
    logAudit("delete", `Deleted round: ${r?.score}/${r?.total} for ${s?.name || "Unknown"} on ${r?.date}`);
  }

  function resetAll() {
    if (!window.confirm("Reset ALL club data? This cannot be undone.")) return;
    logAudit("delete", "⚠ FULL DATA RESET performed");
    setShooters([]); setSquads(SEED_SQUADS); setRounds([]);
    const nid = { shooter: 1, round: 1 };
    setNextId(nid);
    saveData([], SEED_SQUADS, [], nid);
  }

  // ── Derived ──
  const leaderboard = useMemo(() => {
    return shooters.map(s => {
      const stats = sStats(s.id, rounds);
      const squad = squads.find(sq => sq.id === s.squadId);
      return { ...s, ...stats, squadName: squad?.name || "—" };
    }).filter(s => s.count > 0).sort((a, b) => (b.avg || 0) - (a.avg || 0));
  }, [shooters, rounds, squads]);

  const avgAll = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.score / r.total) * 100, 0) / rounds.length * 10) / 10 : 0;
  const topScore = rounds.length ? Math.max(...rounds.map(r => r.score)) : 0;

  const filtHist = useMemo(() => {
    return rounds.filter(r => {
      if (hShooter !== "all" && r.shooterId !== +hShooter) return false;
      if (hSquad !== "all") {
        const sh = shooters.find(s => s.id === r.shooterId);
        if (!sh || sh.squadId !== +hSquad) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rounds, hShooter, hSquad, shooters]);

  const filtShooters = sqFilter === "all" ? shooters : shooters.filter(s => s.squadId === +sqFilter);
  const pct = form.score && form.total ? Math.min(100, Math.round((+form.score / +form.total) * 100)) : 0;

  const auditByYear = useMemo(() => {
    const map = {};
    auditLog.forEach(e => {
      const y = new Date(e.ts).getFullYear().toString();
      if (!map[y]) map[y] = [];
      map[y].push(e);
    });
    return Object.keys(map).sort((a, b) => b - a).map(year => ({ year, entries: map[year] }));
  }, [auditLog]);

  const toggleYear = y => setOpenYears(p => ({ ...p, [y]: !p[y] }));

  const TABS = useMemo(() => {
    const t = [["leaderboard", "🏆 Leaderboard"], ["history", "📋 History"]];
    if (role === "admin" || role === "owner") t.splice(1, 0, ["log", "🎯 Log Round"], ["shooters", "👥 Shooters"]);
    if (role === "owner") t.push(["registry", "📁 Registry"]);
    return t;
  }, [role]);

  // ── LOGIN SCREEN ──
  if (!role) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="login-screen">
          <div className="login-logo">🎯 OKEMOS CLAY CLUB</div>
          <div className="login-sub">OHS Clay Target League · Score Tracker</div>
          <div className="login-card">
            <div className="login-tabs">
              {[["viewer","👁 Member"],["admin","⚡ Admin"],["owner","👑 Owner"]].map(([t,l]) => (
                <button key={t} className={`login-tab${loginType===t?" active":""}${t==="owner"?" owner-tab":""}`} onClick={() => { setLoginType(t); setPinVal(""); setNameVal(""); setPinErr(false); }}>{l}</button>
              ))}
            </div>
            <div className="login-card-title">
              {loginType === "viewer" ? "ENTER MEMBER PIN" : loginType === "admin" ? "ADMIN LOGIN" : "OWNER ACCESS"}
            </div>

            {loginType === "admin" && (
              <div className="login-field">
                <label className="login-label">Your Name</label>
                <input className="login-name-input" type="text" placeholder="Full name" value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={handleKey} autoFocus />
              </div>
            )}

            <div className="login-field">
              <label className="login-label">PIN</label>
              <input className={`login-pin${pinErr?" err":""}`} type="password" maxLength={10} placeholder="••••" value={pinVal} onChange={e => setPinVal(e.target.value)} onKeyDown={handleKey} autoFocus={loginType !== "admin"} />
            </div>
            <div className="login-err">{pinErr ? "Incorrect PIN — try again" : ""}</div>
            <button className="login-btn" onClick={tryLogin}>ENTER</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING DATA ──
  if (!dbLoaded) return (
    <div className="app"><style>{css}</style>
      <div className="loading-screen">
        <div className="loading-title">LOADING SCORES</div>
        <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  return (
    <div className="app">
      <style>{css}</style>

      <div className="header">
        <div>
          <div className="header-logo">🎯 OKEMOS CLAY CLUB</div>
          <div className="header-sub">OHS Clay Target League</div>
        </div>
        <div className="header-right">
          {(role==="admin"||role==="owner") && <span className={`save-ind ${saveStatus}`}>{saveStatus==="saving"?"● SAVING…":saveStatus==="error"?"⚠ FAILED":"✓ SAVED"}</span>}
          <span className={`role-badge ${role}`}>{role==="owner"?"👑 OWNER":role==="admin"?`⚡ ${adminUser}`:"👁 MEMBER"}</span>
          <button className="lock-btn" onClick={lockOut}>🔒 Lock</button>
        </div>
      </div>

      <nav className="nav">
        {TABS.map(([id,label]) => (
          <button key={id} className={`nav-btn${tab===id?" active":""}${id==="registry"?" reg":""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <div className="content">

        {/* LEADERBOARD */}
        {tab === "leaderboard" && (
          <>
            <div className="sec-title">Season Leaderboard</div>
            <div className="sec-sub">Ranked by season average · All classes</div>
            {role === "viewer" && <div className="viewer-notice">👁 View-only — scores update live</div>}
            <div className="stats-row">
              <div className="stat-box"><div className="stat-val">{shooters.length}</div><div className="stat-lbl">Shooters</div></div>
              <div className="stat-box"><div className="stat-val">{rounds.length}</div><div className="stat-lbl">Rounds</div></div>
              <div className="stat-box"><div className="stat-val">{avgAll}%</div><div className="stat-lbl">Club Avg</div></div>
              <div className="stat-box"><div className="stat-val">{topScore||"—"}</div><div className="stat-lbl">Top Score</div></div>
            </div>
            {leaderboard.length === 0 ? <div className="empty">No rounds logged yet</div> : (
              <table className="lb-table">
                <thead><tr><th>#</th><th>Shooter</th><th>Squad</th><th>Avg</th><th>Best</th><th>Rounds</th><th>Last 5</th></tr></thead>
                <tbody>
                  {leaderboard.map((s,i) => {
                    const last5 = rounds.filter(r=>r.shooterId===s.id).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
                    return (
                      <tr key={s.id} className={`r${i+1}`}>
                        <td><span className="rn">{i+1}</span></td>
                        <td><span className="sname">{s.name}</span><span className="cbadge">{s.classification}</span></td>
                        <td style={{color:"#7a7060",fontSize:"0.8rem"}}>{s.squadName}</td>
                        <td><span className="avg">{s.avg}</span><span className="avgx">/100</span></td>
                        <td style={{fontFamily:"'Source Code Pro',monospace",fontSize:"0.78rem",color:"#9a8a7a"}}>{s.best}</td>
                        <td style={{fontFamily:"'Source Code Pro',monospace",fontSize:"0.78rem",color:"#7a7060"}}>{s.count}</td>
                        <td><div className="tbar">{[...Array(5)].map((_,j)=>{const r=last5[j];return <div key={j} className={`tdot${r?" h":""}`} style={r?{opacity:0.4+(r.score/r.total)*0.6}:{}} title={r?`${r.score}/${r.total}`:""}/>;})}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* LOG ROUND */}
        {tab === "log" && (
          <>
            <div className="sec-title">Log a Round</div>
            <div className="sec-sub">Sporting Clays · {adminUser} logging</div>
            <div className="form-card">
              <div className="fgrid">
                <div className="ff">
                  <label className="flbl">Shooter</label>
                  <select className="finp" value={form.shooterId} onChange={e=>setForm(f=>({...f,shooterId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {shooters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="ff">
                  <label className="flbl">Date</label>
                  <input className="finp" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="flbl">Score (hits)</label>
                  <input className="finp" type="number" min="0" max={form.total} placeholder="e.g. 78" value={form.score} onChange={e=>setForm(f=>({...f,score:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="flbl">Total Targets</label>
                  <select className="finp" value={form.total} onChange={e=>setForm(f=>({...f,total:e.target.value}))}>
                    <option value="100">100</option><option value="50">50</option><option value="75">75</option><option value="25">25</option>
                  </select>
                </div>
                <div className="ff full">
                  <label className="flbl">Notes (optional)</label>
                  <input className="finp" type="text" placeholder="Wind, wet, etc." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
                </div>
              </div>
              {form.score && (
                <div className="score-disp">
                  <div className="sbig">{form.score}<span style={{fontSize:"1.7rem",color:"#5a4a3a"}}>/{form.total}</span></div>
                  <div className="sbiglbl">{pct}% · {pct>=85?"🔥 Excellent":pct>=70?"👍 Solid":pct>=55?"📈 Building":"💪 Keep at it"}</div>
                  <div className="pbar"><div className="pfill" style={{width:`${pct}%`}}/></div>
                </div>
              )}
              <button className="sub-btn" disabled={!form.shooterId||!form.score||!form.date} onClick={logRound}>RECORD SCORE</button>
              {toastMsg && <div className="toast">✓ {toastMsg}</div>}
            </div>
          </>
        )}

        {/* SHOOTERS */}
        {tab === "shooters" && (
          <>
            <div className="sec-title">Roster</div>
            <div className="sec-sub">Manage shooters and squads</div>
            <div className="squad-row">
              <button className={`sqchip${sqFilter==="all"?" on":""}`} onClick={()=>setSqFilter("all")}>All</button>
              {squads.map(sq=><button key={sq.id} className={`sqchip${sqFilter===sq.id?" on":""}`} onClick={()=>setSqFilter(sq.id)}>{sq.name}</button>)}
            </div>
            <div className="sgrid">
              {filtShooters.map(s=>{
                const stats=sStats(s.id,rounds);
                const squad=squads.find(sq=>sq.id===s.squadId);
                return (
                  <div key={s.id} className="scard">
                    <button className="sdel" onClick={()=>deleteShooter(s.id)}>✕</button>
                    <div className="scard-name">{s.name}</div>
                    <div className="scard-meta">Class {s.classification} · {squad?.name||"No squad"}</div>
                    <div className="scard-avg">{stats.avg??"—"}</div>
                    <div className="scard-rnds">{stats.count} round{stats.count!==1?"s":""} logged</div>
                  </div>
                );
              })}
              {filtShooters.length===0 && <div className="empty" style={{gridColumn:"1/-1"}}>No shooters</div>}
            </div>
            <div className="asf">
              <div className="asf-title">ADD SHOOTER</div>
              <div className="asgrid">
                <div className="ff" style={{gridColumn:"span 2"}}>
                  <label className="flbl">Name</label>
                  <input className="finp" type="text" placeholder="Full name" value={newShooter.name} onChange={e=>setNewShooter(n=>({...n,name:e.target.value}))}/>
                </div>
                <div className="ff">
                  <label className="flbl">Class</label>
                  <select className="finp" value={newShooter.classification} onChange={e=>setNewShooter(n=>({...n,classification:e.target.value}))}>
                    {CLASSIFICATIONS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ff" style={{gridColumn:"span 3"}}>
                  <label className="flbl">Squad</label>
                  <select className="finp" value={newShooter.squadId} onChange={e=>setNewShooter(n=>({...n,squadId:e.target.value}))}>
                    <option value="">No squad</option>
                    {squads.map(sq=><option key={sq.id} value={sq.id}>{sq.name}</option>)}
                  </select>
                </div>
              </div>
              <button className="add-btn" onClick={addShooter} disabled={!newShooter.name.trim()}>+ ADD SHOOTER</button>
            </div>
            <div className="danger-zone">
              <div className="dz-title">⚠ Danger Zone</div>
              <button className="dz-btn" onClick={resetAll}>Reset all data</button>
            </div>
          </>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <>
            <div className="sec-title">Round History</div>
            <div className="sec-sub">{filtHist.length} round{filtHist.length!==1?"s":""} archived</div>
            <div className="filters">
              <select className="fsel" value={hShooter} onChange={e=>setHShooter(e.target.value)}>
                <option value="all">All Shooters</option>
                {shooters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="fsel" value={hSquad} onChange={e=>setHSquad(e.target.value)}>
                <option value="all">All Squads</option>
                {squads.map(sq=><option key={sq.id} value={sq.id}>{sq.name}</option>)}
              </select>
            </div>
            {filtHist.length===0 ? <div className="empty">No rounds match filters</div> : (
              <table className="ht">
                <thead><tr><th>Date</th><th>Shooter</th><th>Squad</th><th>Class</th><th>Score</th><th>Pct</th><th>Notes</th>{(role==="admin"||role==="owner")&&<th></th>}</tr></thead>
                <tbody>
                  {filtHist.map(r=>{
                    const shooter=shooters.find(s=>s.id===r.shooterId);
                    const squad=squads.find(sq=>sq.id===shooter?.squadId);
                    const pv=Math.round((r.score/r.total)*100);
                    return (
                      <tr key={r.id}>
                        <td style={{fontFamily:"'Source Code Pro',monospace",fontSize:"0.72rem",color:"#7a7060"}}>{r.date}</td>
                        <td><span className="sname" style={{fontSize:"0.86rem"}}>{shooter?.name||"Unknown"}</span></td>
                        <td style={{fontFamily:"'Source Code Pro',monospace",fontSize:"0.72rem",color:"#5a5040"}}>{squad?.name||"—"}</td>
                        <td><span className="cbadge">{shooter?.classification||"?"}</span></td>
                        <td><span className={`sc ${scoreCls(r.score,r.total)}`}>{r.score}/{r.total}</span></td>
                        <td style={{fontFamily:"'Source Code Pro',monospace",fontSize:"0.75rem",color:"#7a7060"}}>{pv}%</td>
                        <td style={{fontSize:"0.78rem",color:"#5a5040",fontStyle:"italic"}}>{r.notes||""}</td>
                        {(role==="admin"||role==="owner")&&<td><button className="del-btn" onClick={()=>deleteRound(r.id)}>✕</button></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* REGISTRY */}
        {tab === "registry" && (
          <>
            <div className="reg-hdr">
              <div>
                <div className="sec-title">Admin Activity Registry</div>
                <div className="reg-sub">Append-only · {auditLog.length} entries · Owner eyes only</div>
              </div>
              <button className="print-btn" onClick={()=>window.print()}>🖨 Print Registry</button>
            </div>
            {auditByYear.length===0 ? (
              <div className="audit-empty">No admin activity recorded yet</div>
            ) : (
              auditByYear.map(({year,entries})=>(
                <div key={year} className="yfolder">
                  <div className="yhdr" onClick={()=>toggleYear(year)}>
                    <span style={{fontSize:"0.9rem"}}>📁</span>
                    <span className="ylbl">{year}</span>
                    <span className="ycnt">{entries.length} record{entries.length!==1?"s":""}</span>
                    <span className={`ychev${openYears[year]!==false?" open":""}`}>▶</span>
                  </div>
                  {openYears[year]!==false && (
                    <table className="at">
                      <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th></tr></thead>
                      <tbody>
                        {entries.map(e=>(
                          <tr key={e.id}>
                            <td><span className="ats">{fmtTs(e.ts)}</span></td>
                            <td><span className="atu">{e.username}</span></td>
                            <td><span className={`atype ${e.type}`}>{e.type.toUpperCase()}</span><span className="ata">{e.description}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))
            )}
          </>
        )}

      </div>
    </div>
  );
}
