const TARGET = 180000000;
const STORAGE_KEY = "goal-wealth-weekly-entries";

const colors = {
  cash: "#2f7d63",
  stocks: "#4267a9",
  pension: "#77b7a2",
  gold: "#c1902f",
  debt: "#bc5b6a",
  property: "#6f7a86",
};

const labels = {
  cash: "현금",
  stocks: "주식",
  pension: "연금",
  gold: "금",
  debt: "대출",
  property: "부동산",
};

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

function parseMoney(value) {
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

function formatMoney(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100000000) {
    const eok = Math.floor(abs / 100000000);
    const man = Math.round((abs % 100000000) / 10000);
    return `${sign}${eok}억${man ? ` ${man.toLocaleString("ko-KR")}만` : ""} 원`;
  }
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString("ko-KR")}만 원`;
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

function netWorth(entry) {
  return entry.cash + entry.stocks + entry.pension + entry.gold - entry.debt;
}

function sortedEntries() {
  return getEntries().sort((a, b) => a.date.localeCompare(b.date));
}

function getEntries() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function weeksLeft(dateText) {
  const current = dateText ? new Date(`${dateText}T00:00:00`) : new Date();
  const end = new Date(`${current.getFullYear()}-12-31T00:00:00`);
  const diff = Math.ceil((end - current) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(diff, 1);
}

function renderDashboard() {
  const entries = sortedEntries();
  const latest = entries.at(-1);
  if (!latest) {
    qs("#goalGauge").style.strokeDasharray = "0 100";
    qs("#goalRate").textContent = "0%";
    qs("#goalNetWorth").textContent = "0원";
    qs("#remainingAmount").textContent = formatMoney(TARGET);
    qs("#weeklyNeed").textContent = formatMoney(TARGET / weeksLeft());
    qs("#weeklyChange").textContent = "0원";
    qs("#weeklyChange").style.color = "var(--ink)";
    qs("#fourWeekAverage").textContent = "0원";
    qs("#propertyValue").textContent = "0원";
    qs("#totalReference").textContent = "0원";
    qs("#latestDate").textContent = "아직 입력 없음";
    qs("#latestNote").textContent = "주간 입력 화면에서 첫 기록을 남겨보세요.";
    qs("#assetDonut").style.background = "conic-gradient(#e6ece4 0 100%)";
    qs("#assetLegend").innerHTML = `<div class="empty-state">첫 주간 기록을 저장하면 자산 구성이 표시됩니다.</div>`;
    qs("#recentEntries").innerHTML = `<div class="empty-state">아직 저장된 기록이 없습니다.</div>`;
    return;
  }

  const current = netWorth(latest);
  const previous = entries.length > 1 ? netWorth(entries.at(-2)) : current;
  const change = current - previous;
  const lastFive = entries.slice(-5).map(netWorth);
  const changes = lastFive.slice(1).map((value, index) => value - lastFive[index]);
  const avg = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : 0;
  const rate = Math.min(Math.max((current / TARGET) * 100, 0), 100);

  qs("#goalGauge").style.strokeDasharray = `${rate} 100`;
  qs("#goalRate").textContent = `${Math.round(rate)}%`;
  qs("#goalNetWorth").textContent = formatMoney(current);
  qs("#remainingAmount").textContent = formatMoney(Math.max(TARGET - current, 0));
  qs("#weeklyNeed").textContent = formatMoney(Math.max(TARGET - current, 0) / weeksLeft(latest.date));
  qs("#weeklyChange").textContent = formatMoney(change);
  qs("#weeklyChange").style.color = change >= 0 ? "var(--green-dark)" : "var(--rose)";
  qs("#fourWeekAverage").textContent = formatMoney(avg);
  qs("#propertyValue").textContent = formatMoney(latest.property);
  qs("#totalReference").textContent = formatMoney(current + latest.property);
  qs("#latestDate").textContent = latest.date;
  qs("#latestNote").textContent = latest.memo || "메모가 없습니다.";

  renderDonut(latest);
  renderRecent(entries);
}

function renderDonut(entry) {
  const assetKeys = ["cash", "stocks", "pension", "gold"];
  const total = assetKeys.reduce((sum, key) => sum + entry[key], 0);
  let cursor = 0;
  const segments = assetKeys.map((key) => {
    const start = cursor;
    const size = total ? (entry[key] / total) * 100 : 0;
    cursor += size;
    return `${colors[key]} ${start}% ${cursor}%`;
  });
  qs("#assetDonut").style.background = `conic-gradient(${segments.join(", ")})`;

  qs("#assetLegend").innerHTML = [
    ...assetKeys.map((key) => legendRow(key, entry[key], total)),
    debtRow(entry.debt),
  ].join("");
}

function legendRow(key, value, total) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return `
    <div class="legend-row">
      <i class="swatch" style="background:${colors[key]}"></i>
      <span>${labels[key]}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[key]}"></div></div>
      <strong>${formatMoney(value)}</strong>
    </div>
  `;
}

function debtRow(value) {
  return `
    <div class="legend-row">
      <i class="swatch" style="background:${colors.debt}"></i>
      <span>대출</span>
      <div class="bar-track"><div class="bar-fill" style="width:100%;background:${colors.debt}"></div></div>
      <strong>-${formatMoney(value)}</strong>
    </div>
  `;
}

function renderRecent(entries) {
  qs("#recentEntries").innerHTML = entries
    .slice(-4)
    .reverse()
    .map((entry) => `<div class="mini-entry"><span>${entry.date}</span><strong>${formatMoney(netWorth(entry))}</strong></div>`)
    .join("");
}

function renderTrend() {
  const entries = sortedEntries();
  renderNetWorthChart(entries);
  renderAssetBars(entries.at(-1));
}

function renderNetWorthChart(entries) {
  const chart = qs("#netWorthChart");
  if (!entries.length) {
    chart.innerHTML = `<text x="380" y="160" text-anchor="middle" fill="#667065">주간 입력을 저장하면 추이가 표시됩니다.</text>`;
    return;
  }

  const values = entries.map(netWorth);
  const max = Math.max(TARGET, ...values) * 1.08;
  const min = Math.min(0, ...values) * 0.9;
  const width = 760;
  const height = 320;
  const pad = 44;
  const xStep = entries.length > 1 ? (width - pad * 2) / (entries.length - 1) : 0;
  const y = (value) => height - pad - ((value - min) / (max - min || 1)) * (height - pad * 2);
  const x = (index) => pad + xStep * index;
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const targetY = y(TARGET);
  const grid = [0.25, 0.5, 0.75].map((ratio) => {
    const gy = pad + (height - pad * 2) * ratio;
    return `<line x1="${pad}" y1="${gy}" x2="${width - pad}" y2="${gy}" stroke="#dce3da" />`;
  });
  const dots = entries
    .map((entry, index) => `<circle cx="${x(index)}" cy="${y(values[index])}" r="5" fill="#2f7d63"><title>${entry.date}: ${formatMoney(values[index])}</title></circle>`)
    .join("");

  chart.innerHTML = `
    ${grid.join("")}
    <line x1="${pad}" y1="${targetY}" x2="${width - pad}" y2="${targetY}" stroke="#bc5b6a" stroke-width="2" stroke-dasharray="7 7" />
    <text x="${width - pad}" y="${targetY - 10}" text-anchor="end" fill="#bc5b6a" font-size="13">목표 1억 8,000만 원</text>
    <polyline points="${points}" fill="none" stroke="#2f7d63" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    <text x="${pad}" y="${height - 14}" fill="#667065" font-size="12">${entries[0].date}</text>
    <text x="${width - pad}" y="${height - 14}" text-anchor="end" fill="#667065" font-size="12">${entries.at(-1).date}</text>
  `;
}

function renderAssetBars(entry) {
  if (!entry) {
    qs("#assetBars").innerHTML = `<div class="empty-state">첫 주간 기록을 저장하면 자산군별 변화가 표시됩니다.</div>`;
    return;
  }
  const keys = ["cash", "stocks", "pension", "gold", "debt", "property"];
  const max = Math.max(...keys.map((key) => entry[key]), 1);
  qs("#assetBars").innerHTML = keys
    .map((key) => {
      const width = Math.max((entry[key] / max) * 100, 2);
      return `
        <div class="bar-row">
          <i class="swatch" style="background:${colors[key]}"></i>
          <span>${labels[key]}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${colors[key]}"></div></div>
          <strong>${key === "debt" ? "-" : ""}${formatMoney(entry[key])}</strong>
        </div>
      `;
    })
    .join("");
}

function renderAll() {
  renderDashboard();
  renderTrend();
}

function syncPreview() {
  const entry = readForm();
  qs("#entryPreview").textContent = formatMoney(netWorth(entry));
}

function readForm() {
  return {
    date: qs("#date").value,
    cash: parseMoney(qs("#cash").value),
    stocks: parseMoney(qs("#stocks").value),
    pension: parseMoney(qs("#pension").value),
    gold: parseMoney(qs("#gold").value),
    debt: parseMoney(qs("#debt").value),
    property: parseMoney(qs("#property").value),
    memo: qs("#memo").value.trim(),
  };
}

function fillForm(entry) {
  qs("#date").value = entry.date;
  ["cash", "stocks", "pension", "gold", "debt", "property"].forEach((key) => {
    qs(`#${key}`).value = entry[key] ? entry[key].toLocaleString("ko-KR") : "";
  });
  qs("#memo").value = entry.memo || "";
  syncPreview();
}

function initForm() {
  const entries = sortedEntries();
  const latest = entries.at(-1);
  const today = new Date().toISOString().slice(0, 10);
  fillForm({
    cash: latest?.cash || 0,
    stocks: latest?.stocks || 0,
    pension: latest?.pension || 0,
    gold: latest?.gold || 0,
    debt: latest?.debt || 0,
    property: latest?.property || 0,
    date: today,
    memo: "",
  });

  qsa("input, textarea").forEach((input) => {
    input.addEventListener("input", syncPreview);
  });

  qsa('input[inputmode="numeric"]').forEach((input) => {
    input.addEventListener("blur", () => {
      const value = parseMoney(input.value);
      input.value = value ? value.toLocaleString("ko-KR") : "";
      syncPreview();
    });
  });
}

function initTabs() {
  qsa(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      qsa(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      qsa(".view").forEach((view) => view.classList.toggle("active", view.id === button.dataset.view));
      renderAll();
    });
  });
}

function initSubmit() {
  qs("#entryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const entry = readForm();
    if (!entry.date) return;

    const entries = getEntries().filter((item) => item.date !== entry.date);
    entries.push(entry);
    saveEntries(entries);
    renderAll();
    document.querySelector('[data-view="dashboard"]').click();
  });

  qs("#clearData").addEventListener("click", () => {
    saveEntries([]);
    initForm();
    renderAll();
  });
}

initTabs();
initForm();
initSubmit();
renderAll();
