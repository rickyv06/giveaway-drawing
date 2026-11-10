(function () {
  "use strict";

  const cfg = Object.assign(
    {
      closesAt: "2026-11-30T23:59:00-06:00",
      announceBy: "December 4, 2026",
      sheetCsvUrl: "",
      liveCsvUrl: "live-entries.csv",
      entriesUrl: "entries.json",
      demoEntriesUrl: "demo-entries.json",
      pollMs: 25000,
      prizes: [],
    },
    window.DRAWING_CONFIG || {}
  );

  const params = new URLSearchParams(location.search);
  const forceDemo = params.get("demo") === "1" || params.get("demo") === "true";
  const forceSpinShot = params.get("shot") === "spin";
  const forceWinnerShot = params.get("shot") === "winner";

  const el = {
    count: document.getElementById("statCount"),
    cdD: document.getElementById("cdD"),
    cdH: document.getElementById("cdH"),
    cdM: document.getElementById("cdM"),
    cdS: document.getElementById("cdS"),
    ticker: document.getElementById("ticker"),
    wheel: document.getElementById("wheel"),
    hubCount: document.getElementById("hubCount"),
    spinBtn: document.getElementById("spinBtn"),
    resetBtn: document.getElementById("resetBtn"),
    status: document.getElementById("dataStatus"),
    overlay: document.getElementById("winnerOverlay"),
    winnerName: document.getElementById("winnerName"),
    winnerMeta: document.getElementById("winnerMeta"),
    closeWinner: document.getElementById("closeWinner"),
    confetti: document.getElementById("confetti"),
    csvInput: document.getElementById("csvInput"),
    prizes: document.getElementById("prizeChips"),
  };

  /** @type {{id:string,name:string,entered_at?:string,demo?:boolean}[]} */
  let entries = [];
  let spinning = false;
  let currentRotation = 0;
  let lastWinner = null;
  let colors = [];

  const WHEEL_PALETTE = [
    "#C8102E", "#1F4A36", "#C4A35A", "#E01E3C", "#2F6B4F",
    "#E8A8B0", "#264A3B", "#EBD48A", "#AFC6E6", "#B5D9C6",
  ];

  function secureRandomIndex(n) {
    if (n <= 0) return 0;
    const max = 0x100000000;
    const limit = max - (max % n);
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % n;
  }

  function setStatus(text, kind) {
    if (!el.status) return;
    const dot =
      kind === "err" ? "err" : kind === "warn" ? "warn" : "";
    el.status.innerHTML =
      '<span class="status-dot ' +
      dot +
      '"></span>' +
      text;
  }

  function updateStats() {
    const n = entries.length;
    if (el.count) el.count.textContent = String(n);
    if (el.hubCount) el.hubCount.textContent = String(n);
    el.spinBtn.disabled = spinning || n < 1;
    renderTicker();
    paintWheel();
  }

  function renderTicker() {
    const recent = entries.slice(-12).reverse();
    if (!recent.length) {
      el.ticker.innerHTML = "<span>Entries are just getting started</span><span>Entries are just getting started</span>";
      return;
    }
    const bits = recent.map((e) => "<span>" + escapeHtml(e.name) + " entered</span>");
    // duplicate for seamless marquee
    el.ticker.innerHTML = bits.join("") + bits.join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paintWheel() {
    const canvas = el.wheel;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;
    ctx.clearRect(0, 0, size, size);

    const n = entries.length;
    if (n === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#F6F1EA";
      ctx.fill();
      ctx.fillStyle = "#5A6B62";
      ctx.font = "800 20px Lato,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Entries are just", cx, cy - 14);
      ctx.fillText("getting started", cx, cy + 12);
      ctx.font = "600 13px Lato,sans-serif";
      ctx.fillText("The wheel fills as people enter", cx, cy + 40);
      return;
    }

    colors = [];
    const slice = (Math.PI * 2) / n;
    // Start with pointer at top: angle 0 is right, so offset -PI/2
    const start0 = -Math.PI / 2;

    for (let i = 0; i < n; i++) {
      const a0 = start0 + i * slice;
      const a1 = a0 + slice;
      const col = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
      colors.push(col);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = n > 40 ? 0.5 : 1.5;
      ctx.stroke();

      // Labels only when readable
      if (n <= 28) {
        const mid = a0 + slice / 2;
        const lr = r * 0.68;
        ctx.save();
        ctx.translate(cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr);
        ctx.rotate(mid + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = (n > 18 ? "700 11px" : "800 13px") + " Lato,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = entries[i].name;
        ctx.fillText(label.length > 14 ? label.slice(0, 13) + "…" : label, 0, 0);
        ctx.restore();
      }
    }

    // outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(31,58,47,.2)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function tickCountdown() {
    const end = new Date(cfg.closesAt).getTime();
    const now = Date.now();
    let ms = Math.max(0, end - now);
    const d = Math.floor(ms / 86400000);
    ms -= d * 86400000;
    const h = Math.floor(ms / 3600000);
    ms -= h * 3600000;
    const m = Math.floor(ms / 60000);
    ms -= m * 60000;
    const s = Math.floor(ms / 1000);
    el.cdD.textContent = String(d);
    el.cdH.textContent = String(h).padStart(2, "0");
    el.cdM.textContent = String(m).padStart(2, "0");
    el.cdS.textContent = String(s).padStart(2, "0");
  }

  function fitCanvas() {
    const stage = document.querySelector(".wheel-stage");
    const css = Math.min(stage.clientWidth, 420);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.wheel.style.width = css + "px";
    el.wheel.style.height = css + "px";
    el.wheel.width = Math.round(css * dpr);
    el.wheel.height = Math.round(css * dpr);
    paintWheel();
  }

  async function loadJson(url) {
    const res = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function applyPayload(data, sourceLabel) {
    const list = Array.isArray(data.entries) ? data.entries : [];
    // privacy: only keep id, name, entered_at, demo — strip anything else
    entries = list
      .map((e) => ({
        id: String(e.id || ""),
        name: String(e.name || "Friend"),
        entered_at: e.entered_at || null,
        demo: !!e.demo || !!data.demo,
      }))
      .filter((e) => e.id && e.name);
    const demo = !!data.demo || entries.some((e) => e.demo) || forceDemo;
    document.documentElement.setAttribute("data-demo", demo ? "1" : "0");
    setStatus(
      sourceLabel +
        " · " +
        entries.length +
        " completed" +
        (demo ? " · DEMO DATA" : ""),
      demo ? "warn" : "ok"
    );
    updateStats();
  }

  function bust(url) {
    return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  async function loadText(url) {
    const res = await fetch(bust(url), { cache: "no-store", mode: "cors" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.text();
  }

  /** Parse the public drawing sheet CSV: timestamp,display_name,entry_id */
  function ingestSheetCsv(text) {
    const rows = parseCsv(text);
    if (!rows.length) {
      entries = [];
      document.documentElement.setAttribute("data-demo", "0");
      setStatus("Sheet feed · 0 completed", "ok");
      updateStats();
      return;
    }
    const header = rows[0].map(function (h) {
      return String(h || "").trim().toLowerCase().replace(/^"|"$/g, "");
    });
    const idx = function (names) {
      for (var n = 0; n < names.length; n++) {
        var i = header.indexOf(names[n]);
        if (i >= 0) return i;
      }
      return -1;
    };
    var iTs = idx(["timestamp", "entered_at", "submitted_at", "date"]);
    var iName = idx(["display_name", "name", "entrant"]);
    var iId = idx(["entry_id", "id"]);
    // If no header match, assume timestamp,display_name,entry_id
    var start = 1;
    if (iName < 0 && iId < 0) {
      iTs = 0;
      iName = 1;
      iId = 2;
      start = header[0] && /timestamp|display|name|entry/i.test(header[0]) ? 1 : 0;
    }
    var seen = Object.create(null);
    var out = [];
    for (var r = start; r < rows.length; r++) {
      var row = rows[r];
      var name = String((iName >= 0 ? row[iName] : "") || "")
        .trim()
        .replace(/^"|"$/g, "");
      var id = String((iId >= 0 ? row[iId] : "") || "")
        .trim()
        .replace(/^"|"$/g, "");
      var entered = iTs >= 0 ? String(row[iTs] || "").trim().replace(/^"|"$/g, "") : "";
      if (!name) continue;
      if (!id) id = opaqueFrom(name, entered, String(r));
      if (seen[id]) continue;
      seen[id] = true;
      out.push({ id: id, name: name, entered_at: entered || null });
    }
    entries = out;
    document.documentElement.setAttribute("data-demo", "0");
    setStatus("Sheet feed · " + entries.length + " completed", "ok");
    updateStats();
  }

  async function refreshEntries() {
    if (forceDemo) {
      try {
        const data = await loadJson(cfg.demoEntriesUrl);
        applyPayload(data, "Demo feed");
      } catch (err) {
        setStatus("Could not load demo-entries.json", "err");
      }
      return;
    }

    // Prefer live Google Sheet CSV (Zapier appends completed entries).
    if (cfg.sheetCsvUrl) {
      try {
        const text = await loadText(cfg.sheetCsvUrl);
        ingestSheetCsv(text);
        return;
      } catch (sheetErr) {
        // fall through
      }
    }

    // Same-origin CSV mirror (no CORS), then entries.json
    if (cfg.liveCsvUrl) {
      try {
        const text = await loadText(cfg.liveCsvUrl);
        ingestSheetCsv(text);
        return;
      } catch (liveErr) {
        // fall through
      }
    }

    try {
      const data = await loadJson(cfg.entriesUrl);
      applyPayload(data, "entries.json");
    } catch (err) {
      try {
        const data = await loadJson(cfg.demoEntriesUrl);
        applyPayload(data, "Fallback demo feed");
        setStatus("Live feed unavailable — showing DEMO", "warn");
      } catch (e2) {
        setStatus("No entry data loaded", "err");
      }
    }
  }

  // CSV fallback: GHL contact export columns vary; accept common ones.
  function parseCsv(text) {
    const rows = [];
    let i = 0;
    let cur = "";
    let row = [];
    let inQ = false;
    while (i < text.length) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"' && text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        if (ch === '"') {
          inQ = false;
          i++;
          continue;
        }
        cur += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (ch === ",") {
        row.push(cur);
        cur = "";
        i++;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
    if (cur.length || row.length) {
      row.push(cur);
      if (row.some((c) => c.trim())) rows.push(row);
    }
    return rows;
  }

  function opaqueFrom(email, phone, fallback) {
    const raw = (email || "") + "|" + (phone || "") + "|" + (fallback || "");
    // lightweight FNV-1a-ish hash for browser-only opaque id
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const a = ("00000000" + (h >>> 0).toString(16)).slice(-8);
    const b = ("00000000" + (Math.imul(h ^ raw.length, 2654435761) >>> 0).toString(16)).slice(-8);
    return a + b;
  }

  function ingestCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("CSV looks empty");
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (names) => {
      for (const n of names) {
        const i = header.indexOf(n);
        if (i >= 0) return i;
      }
      return -1;
    };
    const iFirst = idx(["first name", "firstname", "first_name", "first"]);
    const iLast = idx(["last name", "lastname", "last_name", "last"]);
    const iEmail = idx(["email", "email address", "contact email"]);
    const iPhone = idx(["phone", "phone number", "mobile", "contact phone"]);
    const iTags = idx(["tags", "tag", "contact tags"]);
    const iCreated = idx(["created", "date added", "created at", "dateadded"]);
    const iId = idx(["contact id", "id", "contactid"]);

    const seenE = new Set();
    const seenP = new Set();
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const tags = (iTags >= 0 ? row[iTags] || "" : "").toLowerCase();
      // If tags column exists, require giveaway-entered; otherwise accept all rows (operator responsibility)
      if (iTags >= 0 && !tags.includes("giveaway-entered")) continue;
      const email = (iEmail >= 0 ? row[iEmail] || "" : "").trim().toLowerCase();
      const phone = (iPhone >= 0 ? row[iPhone] || "" : "").replace(/\D/g, "");
      if (/\+giveawaytest@/i.test(email)) continue;
      if (email && seenE.has(email)) continue;
      if (phone && seenP.has(phone)) continue;
      if (email) seenE.add(email);
      if (phone) seenP.add(phone);
      const first = (iFirst >= 0 ? row[iFirst] : "") || "Friend";
      const last = iLast >= 0 ? row[iLast] || "" : "";
      const initial = last.trim() ? last.trim()[0].toUpperCase() + "." : "";
      const name = (first.trim()[0].toUpperCase() + first.trim().slice(1) + " " + initial).trim();
      const id = opaqueFrom(email, phone, iId >= 0 ? row[iId] : String(r));
      out.push({
        id,
        name,
        entered_at: iCreated >= 0 ? row[iCreated] || null : null,
      });
    }
    entries = out;
    document.documentElement.setAttribute("data-demo", "0");
    setStatus("CSV import · " + entries.length + " completed (local only)", "ok");
    updateStats();
  }

  function spinToWinner(winnerIndex, opts) {
    opts = opts || {};
    const n = entries.length;
    if (n < 1 || spinning) return;
    spinning = true;
    el.spinBtn.disabled = true;
    lastWinner = entries[winnerIndex];

    const sliceDeg = 360 / n;
    // Pointer at top. Slice i center is at start0 + (i+0.5)*slice in radians from east,
    // which in wheel degrees (CSS rotate clockwise) means we want the slice center under the top pointer.
    // With initial paint starting at -90deg (top), slice i center is at i*sliceDeg + sliceDeg/2 from top, clockwise.
    // To bring that center to top, rotate by -(i*sliceDeg + sliceDeg/2) plus extra full turns.
    const targetMod = (360 - (winnerIndex * sliceDeg + sliceDeg / 2)) % 360;
    const turns = opts.turns != null ? opts.turns : 6 + secureRandomIndex(3);
    const duration = opts.duration != null ? opts.duration : 6500;
    const final = currentRotation - (currentRotation % 360) + turns * 360 + targetMod;
    // ensure we always spin forward a lot
    const delta = ((final - currentRotation) % 360 + 360) % 360 + turns * 360;
    const next = currentRotation + delta;
    const from = currentRotation;
    currentRotation = next;

    el.wheel.style.transition = "none";
    el.wheel.style.transform = "rotate(" + from + "deg)";
    void el.wheel.offsetWidth;
    el.wheel.style.transition = "transform " + duration + "ms cubic-bezier(0.12, 0.75, 0.12, 1)";
    el.wheel.style.transform = "rotate(" + next + "deg)";
    el.wheel.classList.add("spinning");

    window.setTimeout(function () {
      spinning = false;
      el.wheel.classList.remove("spinning");
      el.spinBtn.disabled = entries.length < 1;
      revealWinner(lastWinner);
      recordWinner(lastWinner);
    }, duration + 40);
  }

  function onSpin() {
    if (entries.length < 1 || spinning) return;
    const idx = secureRandomIndex(entries.length);
    spinToWinner(idx);
  }

  function revealWinner(entry) {
    if (!entry) return;
    el.winnerName.textContent = entry.name;
    el.winnerMeta.textContent =
      (entry.demo || document.documentElement.getAttribute("data-demo") === "1"
        ? "DEMO winner · "
        : "") +
      "Picked at random · one entry per person";
    el.overlay.classList.add("show");
    burstConfetti();
  }

  async function recordWinner(entry) {
    if (!entry) return;
    var payload = {
      id: entry.id,
      name: entry.name,
      demo: !!entry.demo || document.documentElement.getAttribute("data-demo") === "1",
      drawn_at: new Date().toISOString(),
    };
    try {
      localStorage.setItem("giveaway2026_last_winner", JSON.stringify(payload));
    } catch (_) {}
    try {
      const res = await fetch("/api/record-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const j = await res.json().catch(function () {
          return {};
        });
        if (j.path) setStatus("Winner saved privately · " + j.path, "ok");
      }
    } catch (_) {
      // Static GitHub Pages: winner is shown on screen; run scripts/record_winner_local.py after the drawing.
    }
  }

  function burstConfetti() {
    const canvas = el.confetti;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const pieces = [];
    const cols = ["#C8102E", "#C4A35A", "#1F4A36", "#E01E3C", "#fff", "#EBD48A", "#B5D9C6"];
    for (let i = 0; i < 160; i++) {
      pieces.push({
        x: W * 0.5 + (Math.random() - 0.5) * 80,
        y: H * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 14 - 4,
        g: 0.22 + Math.random() * 0.12,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        c: cols[i % cols.length],
        life: 0,
      });
    }
    let raf;
    const start = performance.now();
    function frame(t) {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life = elapsed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3200);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < 3200) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    cancelAnimationFrame(raf);
    requestAnimationFrame(frame);
  }

  function renderPrizes() {
    if (!el.prizes) return;
    el.prizes.innerHTML = (cfg.prizes || [])
      .map(function (p) {
        return '<span class="chip"><b>•</b> ' + escapeHtml(p) + "</span>";
      })
      .join("");
  }

  // Events
  el.spinBtn.addEventListener("click", onSpin);
  el.resetBtn.addEventListener("click", function () {
    el.overlay.classList.remove("show");
    el.wheel.style.transition = "none";
    currentRotation = currentRotation % 360;
    el.wheel.style.transform = "rotate(" + currentRotation + "deg)";
  });
  el.closeWinner.addEventListener("click", function () {
    el.overlay.classList.remove("show");
  });
  if (el.csvInput) {
    el.csvInput.addEventListener("change", function () {
      const f = el.csvInput.files && el.csvInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          ingestCsv(String(reader.result || ""));
        } catch (err) {
          setStatus("CSV error: " + err.message, "err");
        }
      };
      reader.readAsText(f);
    });
  }
  window.addEventListener("resize", fitCanvas);

  // Boot
  renderPrizes();
  fitCanvas();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  refreshEntries().then(function () {
    // Screenshot helpers
    if (forceSpinShot && entries.length) {
      spinToWinner(Math.min(3, entries.length - 1), { turns: 8, duration: 8000 });
    }
    if (forceWinnerShot && entries.length) {
      const idx = Math.min(5, entries.length - 1);
      // snap instantly under pointer then reveal
      const n = entries.length;
      const sliceDeg = 360 / n;
      const targetMod = (360 - (idx * sliceDeg + sliceDeg / 2)) % 360;
      currentRotation = targetMod;
      el.wheel.style.transition = "none";
      el.wheel.style.transform = "rotate(" + targetMod + "deg)";
      lastWinner = entries[idx];
      setTimeout(function () {
        revealWinner(lastWinner);
      }, 200);
    }
  });
  if (!forceDemo && cfg.pollMs > 0) {
    setInterval(refreshEntries, cfg.pollMs);
  }
})();
