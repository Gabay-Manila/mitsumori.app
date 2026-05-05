"use client";

import { useState, useRef } from "react";

// ============================================================
// データ（後でSupabaseに差し替え）
// ============================================================
const WORK_ITEMS = [
  { id: "1", name: "壁紙貼り替え", unit: "㎡",  unit_price: 1080 },
  { id: "2", name: "床材",        unit: "㎡",  unit_price: 4550 },
  { id: "3", name: "照明",        unit: "式",  unit_price: 15000 },
];
const TAX_RATE = 0.10;
const fmt = (n) => "¥" + Math.round(n).toLocaleString("ja-JP");

// ============================================================
// テンキーパッド
// ============================================================
function QuantityPad({ item, value, onChange, onClose }) {
  const [input, setInput] = useState(value > 0 ? String(value) : "");

  const press = (k) => {
    if (k === "C")  { setInput(""); return; }
    if (k === "←") { setInput(p => p.slice(0, -1)); return; }
    if (k === "." && input.includes(".")) return;
    if (input.length >= 5) return;
    setInput(p => p === "" && k === "." ? "0." : p + k);
  };

  const confirm = () => {
    onChange(parseFloat(input) || 0);
    onClose();
  };

  const keys = ["7","8","9","4","5","6","1","2","3","C","0","."];

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.padBox} onClick={e => e.stopPropagation()}>
        <p style={S.padTitle}>{item.name}</p>

        <div style={S.padDisplay}>
          <span style={S.padValue}>{input || "0"}</span>
          <span style={S.padUnit}> {item.unit}</span>
        </div>
        <p style={S.padPreview}>
          = {fmt((parseFloat(input) || 0) * item.unit_price)}
        </p>

        <div style={S.keyGrid}>
          {keys.map(k => (
            <button
              key={k}
              style={{ ...S.key, ...(k === "C" ? S.keyClear : {}) }}
              onClick={() => press(k)}
            >
              {k}
            </button>
          ))}
        </div>

        <div style={S.padActions}>
          <button style={{ ...S.btn, ...S.btnGray }} onClick={onClose}>キャンセル</button>
          <button style={{ ...S.btn, ...S.btnBlue }} onClick={confirm}>決　定</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 署名キャンバス
// ============================================================
function SignatureCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const painting  = useRef(false);
  const lastPos   = useRef(null);

  const getXY = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const down = (e) => {
    e.preventDefault();
    painting.current = true;
    lastPos.current  = getXY(e);
  };
  const move = (e) => {
    e.preventDefault();
    if (!painting.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const p   = getXY(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#1a3a5c";
    ctx.lineWidth   = 5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = p;
  };
  const up = () => { painting.current = false; lastPos.current = null; };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
  };

  const save = () => onSave(canvasRef.current.toDataURL("image/png"));

  return (
    <div style={S.overlay}>
      <div style={S.signBox}>
        <p style={S.signTitle}>✍️ ここにサインをお願いします</p>
        <canvas
          ref={canvasRef}
          width={640} height={260}
          style={S.canvas}
          onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up}
        />
        <div style={S.padActions}>
          <button style={{ ...S.btn, ...S.btnGray  }} onClick={clear}>やり直す</button>
          <button style={{ ...S.btn, ...S.btnGray  }} onClick={onCancel}>戻る</button>
          <button style={{ ...S.btn, ...S.btnRed   }} onClick={save}>サイン確定</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// メインアプリ
// ============================================================
export default function EstimateApp() {
  const [customerName, setCustomerName] = useState("");
  const [editName,     setEditName]     = useState(false);
  const [quantities,   setQuantities]   = useState({});
  const [activePad,    setActivePad]    = useState(null);
  const [photos,       setPhotos]       = useState([]);
  const [showSign,     setShowSign]     = useState(false);
  const [signature,    setSignature]    = useState(null);
  const [done,         setDone]         = useState(false);
  const photoRef = useRef(null);

  // 計算
  const rows = WORK_ITEMS.map(w => ({
    ...w,
    qty:    quantities[w.id] || 0,
    amount: Math.round((quantities[w.id] || 0) * w.unit_price),
  }));
  const subtotal  = rows.reduce((s, r) => s + r.amount, 0);
  const tax       = Math.round(subtotal * TAX_RATE);
  const total     = subtotal + tax;
  const canSign   = customerName.trim() && total > 0;

  const handleSign = (data) => {
    setSignature(data);
    setShowSign(false);
    setDone(true);
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotos(p => [...p, URL.createObjectURL(file)]);
    e.target.value = "";
  };

  if (done) return <CompletePage
    customerName={customerName} total={total} signature={signature}
    onReset={() => { setDone(false); setSignature(null); setCustomerName(""); setQuantities({}); setPhotos([]); }}
  />;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <span style={S.logo}>🏠 現場見積</span>
        <span style={S.ver}>内装工事システム</span>
      </header>

      <main style={S.main}>

        {/* 顧客名 */}
        <section style={S.card}>
          <div style={S.cardLabel}>👤 お客さまのお名前</div>
          {editName ? (
            <div style={{ display:"flex", gap:10 }}>
              <input
                autoFocus
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onBlur={() => setEditName(false)}
                onKeyDown={e => e.key === "Enter" && setEditName(false)}
                placeholder="山田 花子 様"
                style={S.nameInput}
              />
            </div>
          ) : (
            <button style={S.nameTap} onClick={() => setEditName(true)}>
              {customerName || "タップして入力 →"}
            </button>
          )}
        </section>

        {/* 工事項目 */}
        <section style={S.card}>
          <div style={S.cardLabel}>🔨 工事項目</div>
          {rows.map(r => (
            <div key={r.id} style={S.itemRow}>
              <div style={S.itemInfo}>
                <span style={S.itemName}>{r.name}</span>
                <span style={S.itemPrice}>{fmt(r.unit_price)} / {r.unit}</span>
              </div>
              <button style={S.qtyBtn} onClick={() => setActivePad(r.id)}>
                <span style={S.qtyNum}>{r.qty}</span>
                <span style={S.qtyUnitLabel}>{r.unit}</span>
              </button>
              <span style={{ ...S.amount, color: r.qty > 0 ? "#c0392b" : "#bbb" }}>
                {r.qty > 0 ? fmt(r.amount) : "—"}
              </span>
            </div>
          ))}
        </section>

        {/* 合計 */}
        <section style={S.totalCard}>
          <div style={S.totalRow}>
            <span>小　計</span><span>{fmt(subtotal)}</span>
          </div>
          <div style={S.totalRow}>
            <span>消費税（10%）</span><span>{fmt(tax)}</span>
          </div>
          <div style={{ ...S.totalRow, ...S.grandRow }}>
            <span>合 計 金 額</span><span>{fmt(total)}</span>
          </div>
        </section>

        {/* 現場写真 */}
        <section style={S.card}>
          <div style={S.cardLabel}>📷 現場写真</div>
          <div style={S.photoWrap}>
            {photos.map((url, i) => (
              <img key={i} src={url} style={S.thumb} alt={`写真${i+1}`} />
            ))}
            <button style={S.photoBtn} onClick={() => photoRef.current.click()}>
              <span style={{ fontSize:32 }}>＋</span>
              <span style={{ fontSize:14 }}>撮影</span>
            </button>
            <input ref={photoRef} type="file" accept="image/*" capture="environment"
              style={{ display:"none" }} onChange={handlePhoto} />
          </div>
        </section>

        {/* サインボタン */}
        <div style={S.actions}>
          <button
            style={{ ...S.signBtn, opacity: canSign ? 1 : 0.45 }}
            disabled={!canSign}
            onClick={() => setShowSign(true)}
          >
            ✍️　お客さまにサインをいただく
          </button>
          {!canSign && (
            <p style={S.hint}>
              {!customerName.trim() ? "お名前を入力してください" : "工事項目を入力してください"}
            </p>
          )}
        </div>

      </main>

      {/* テンキーパッド */}
      {activePad && (() => {
        const item = WORK_ITEMS.find(w => w.id === activePad);
        return (
          <QuantityPad
            item={item}
            value={quantities[activePad] || 0}
            onChange={v => setQuantities(q => ({ ...q, [activePad]: v }))}
            onClose={() => setActivePad(null)}
          />
        );
      })()}

      {/* 署名パッド */}
      {showSign && (
        <SignatureCanvas onSave={handleSign} onCancel={() => setShowSign(false)} />
      )}
    </div>
  );
}

// ============================================================
// 完了画面
// ============================================================
function CompletePage({ customerName, total, signature, onReset }) {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  const shareUrl = `https://mitsumori-app.vercel.app/view/${token}`;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <span style={S.logo}>🏠 現場見積</span>
        <span style={S.ver}>内装工事システム</span>
      </header>
      <main style={{ ...S.main, alignItems:"center", paddingTop:40 }}>
        <div style={S.doneIcon}>✅</div>
        <p style={S.doneTitle}>署名完了！</p>
        <p style={S.doneSub}>{customerName} 様　{fmt(total)}</p>

        {signature && (
          <div style={S.signPreviewBox}>
            <p style={{ fontSize:16, color:"#666", marginBottom:8 }}>署名データ</p>
            <img src={signature} style={{ maxWidth:"100%", borderRadius:8 }} alt="署名" />
          </div>
        )}

        <div style={S.shareBox}>
          <p style={S.shareLabel}>📨 お客さまへ確認URLを送る</p>
          <p style={S.shareUrl}>{shareUrl}</p>
          <button
            style={{ ...S.btn, ...S.btnBlue, width:"100%", fontSize:20, padding:"16px 0" }}
            onClick={() => navigator.share?.({ title:"見積確認", url: shareUrl })}
          >
            LINEやメールで送る
          </button>
        </div>

        <button
          style={{ ...S.btn, ...S.btnGray, marginTop:24, fontSize:18, padding:"14px 32px" }}
          onClick={onReset}
        >
          新しい見積を作る
        </button>
      </main>
    </div>
  );
}

// ============================================================
// スタイル定数
// ============================================================
const C = {
  bg:     "#f5f0e8",
  card:   "#ffffff",
  navy:   "#1a3a5c",
  red:    "#c0392b",
  gold:   "#d4a853",
  gray:   "#6b7280",
  border: "#e5e7eb",
};

const S = {
  root: {
    fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif",
    background: C.bg,
    minHeight: "100svh",
    maxWidth: 680,
    margin: "0 auto",
    paddingBottom: 80,
  },
  header: {
    background: C.navy,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "18px 20px",
    position: "sticky",
    top: 0,
    zIndex: 50,
    boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
  },
  logo: { fontSize: 26, fontWeight: 900 },
  ver:  { fontSize: 15, opacity: 0.75 },
  main: { padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 },

  card: {
    background: C.card,
    borderRadius: 16,
    padding: "18px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  cardLabel: { fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 12 },

  nameTap: {
    width: "100%", background: "#eef2ff", border: `2px solid ${C.navy}`,
    borderRadius: 12, padding: "18px 16px", fontSize: 26, fontWeight: 700,
    color: "#1a1a1a", cursor: "pointer", textAlign: "left",
  },
  nameInput: {
    flex: 1, border: `3px solid ${C.navy}`, borderRadius: 12,
    padding: "14px 16px", fontSize: 24, fontWeight: 700, width: "100%",
    boxSizing: "border-box",
  },

  itemRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 0", borderBottom: `1px solid ${C.border}`,
  },
  itemInfo: { flex: 1 },
  itemName:  { display: "block", fontSize: 22, fontWeight: 700 },
  itemPrice: { display: "block", fontSize: 15, color: C.gray, marginTop: 2 },
  qtyBtn: {
    background: C.navy, color: "#fff", border: "none",
    borderRadius: 12, padding: "10px 14px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80,
  },
  qtyNum:       { fontSize: 30, fontWeight: 900, lineHeight: 1 },
  qtyUnitLabel: { fontSize: 14, opacity: 0.8, marginTop: 2 },
  amount: { fontSize: 22, fontWeight: 700, minWidth: 100, textAlign: "right" },

  totalCard: {
    background: C.navy, borderRadius: 16, padding: "18px 20px",
    display: "flex", flexDirection: "column", gap: 10,
  },
  totalRow: {
    display: "flex", justifyContent: "space-between",
    color: "#fff", fontSize: 20,
  },
  grandRow: {
    borderTop: "2px solid rgba(255,255,255,0.3)",
    paddingTop: 12, marginTop: 4,
    fontSize: 30, fontWeight: 900, color: C.gold,
  },

  photoWrap: { display: "flex", gap: 10, flexWrap: "wrap" },
  thumb: { width: 86, height: 86, objectFit: "cover", borderRadius: 10, border: `2px solid ${C.border}` },
  photoBtn: {
    width: 86, height: 86, border: `3px dashed ${C.navy}`,
    borderRadius: 10, background: "#eef2ff",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: C.navy, gap: 2,
  },

  actions: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  signBtn: {
    background: C.red, color: "#fff", border: "none",
    borderRadius: 16, padding: "22px 20px",
    fontSize: 24, fontWeight: 900, cursor: "pointer",
    width: "100%", boxShadow: "0 6px 18px rgba(192,57,43,0.4)",
    fontFamily: "inherit",
  },
  hint: { fontSize: 17, color: C.gray },

  // オーバーレイ共通
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 200, padding: 0,
  },

  // テンキー
  padBox: {
    background: "#fff", borderRadius: "20px 20px 0 0",
    padding: "24px 20px 36px",
    width: "100%", maxWidth: 480,
    display: "flex", flexDirection: "column", gap: 14,
  },
  padTitle:   { fontSize: 22, fontWeight: 800, textAlign: "center", color: C.navy, margin: 0 },
  padDisplay: {
    background: C.navy, borderRadius: 12, padding: "14px 18px",
    display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 6,
  },
  padValue:   { fontSize: 48, fontWeight: 900, color: "#fff" },
  padUnit:    { fontSize: 22, color: "rgba(255,255,255,0.7)" },
  padPreview: { fontSize: 18, color: C.gray, textAlign: "right", margin: 0 },
  keyGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
  },
  key: {
    background: "#f3f4f6", border: "none", borderRadius: 10,
    fontSize: 30, fontWeight: 700, padding: "16px 0",
    cursor: "pointer", color: "#1a1a1a", fontFamily: "inherit",
    active: { background: "#e5e7eb" },
  },
  keyClear: { background: "#fee2e2", color: C.red },
  padActions: { display: "flex", gap: 10 },

  // 署名
  signBox: {
    background: "#fff", borderRadius: "20px 20px 0 0",
    padding: "24px 16px 36px",
    width: "100%",
    display: "flex", flexDirection: "column", gap: 14,
  },
  signTitle: { fontSize: 24, fontWeight: 800, textAlign: "center", color: C.navy, margin: 0 },
  canvas: {
    width: "100%", border: `2px solid ${C.border}`, borderRadius: 12,
    background: "#fafafa", touchAction: "none", cursor: "crosshair",
    display: "block",
  },

  // ボタン
  btn: {
    border: "none", borderRadius: 12, fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit", fontSize: 18, padding: "14px 20px",
    flex: 1,
  },
  btnBlue: { background: C.navy, color: "#fff" },
  btnRed:  { background: C.red,  color: "#fff" },
  btnGray: { background: "#e5e7eb", color: "#374151" },

  // 完了画面
  doneIcon:  { fontSize: 80 },
  doneTitle: { fontSize: 36, fontWeight: 900, color: C.navy, margin: 0 },
  doneSub:   { fontSize: 22, color: C.gray },
  signPreviewBox: {
    background: "#fff", borderRadius: 14, padding: 16, width: "100%",
    boxSizing: "border-box",
  },
  shareBox: {
    background: "#fff", borderRadius: 16, padding: "20px 16px",
    width: "100%", boxSizing: "border-box",
    display: "flex", flexDirection: "column", gap: 12,
  },
  shareLabel: { fontSize: 20, fontWeight: 800, color: C.navy, margin: 0 },
  shareUrl: {
    fontSize: 14, color: C.gray, wordBreak: "break-all",
    background: "#f3f4f6", borderRadius: 8, padding: "10px 12px", margin: 0,
  },
};
