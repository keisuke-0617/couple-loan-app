// 利子の割合（10%）
const INTEREST_RATE = 0.10;
const STORAGE_KEY = "couple-loan-records-v1";

let form;
let nameInput;
let amountInput;
let dateInput;
let amountWithInterestInput;
let recalcBtn;

let recordsBody;
let emptyMessage;

let summaryBase;
let summaryInterest;
let footerBase;
let footerInterest;

let records = [];

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      records = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      records = parsed;
    } else {
      records = [];
    }
  } catch (e) {
    console.error("Failed to load records:", e);
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatYen(value) {
  return value.toLocaleString("ja-JP") + " 円";
}

function renderRecords() {
  recordsBody.innerHTML = "";

  if (records.length === 0) {
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }

  let totalBase = 0;
  let totalInterest = 0;

  records.forEach((rec, index) => {
    totalBase += rec.amount;
    totalInterest += rec.amountWithInterest;

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = rec.date;

    const tdName = document.createElement("td");
    tdName.textContent = rec.name;

    const tdAmount = document.createElement("td");
    tdAmount.className = "td-number";
    tdAmount.textContent = formatYen(rec.amount);

    const tdAmountWithInterest = document.createElement("td");
    tdAmountWithInterest.className = "td-number";
    tdAmountWithInterest.textContent = formatYen(rec.amountWithInterest);

    const tdActions = document.createElement("td");
    tdActions.className = "td-actions";

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className = "btn btn-outline";
    delBtn.style.padding = "4px 10px";
    delBtn.style.fontSize = "0.8rem";
    delBtn.addEventListener("click", () => {
      deleteRecord(index);
    });

    tdActions.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdName);
    tr.appendChild(tdAmount);
    tr.appendChild(tdAmountWithInterest);
    tr.appendChild(tdActions);

    recordsBody.appendChild(tr);
  });

  summaryBase.textContent = "元本合計：" + formatYen(totalBase);
  summaryInterest.textContent = "利子込み合計：" + formatYen(totalInterest);

  footerBase.textContent = formatYen(totalBase);
  footerInterest.textContent = formatYen(totalInterest);
}

function deleteRecord(index) {
  records.splice(index, 1);
  saveRecords();
  renderRecords();
}

function recalcInterestField() {
  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) {
    amountWithInterestInput.value = "";
    return;
  }
  const interestAmount = Math.round(amount * (1 + INTEREST_RATE));
  amountWithInterestInput.value = interestAmount;
}

function addRecord(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  let date = dateInput.value;

  if (!name) {
    alert("名前・メモを入力してください。");
    return;
  }
  if (!amount || amount <= 0) {
    alert("金額を1円以上で入力してください。");
    return;
  }

  if (!date) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    date = `${yyyy}-${mm}-${dd}`;
  }

  let amountWithInterest = Number(amountWithInterestInput.value);
  if (!amountWithInterest || amountWithInterest <= 0) {
    // 入力が空なら自動計算
    amountWithInterest = Math.round(amount * (1 + INTEREST_RATE));
  }

  const newRecord = {
    name,
    amount,
    date,
    amountWithInterest
  };

  records.push(newRecord);
  saveRecords();
  renderRecords();

  // フォームを軽くリセット
  nameInput.value = "";
  amountInput.value = "";
  amountWithInterestInput.value = "";
  // 日付はそのままでもOKなのでクリアしない
}

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  // DOM要素取得
  form = document.getElementById("record-form");
  nameInput = document.getElementById("name");
  amountInput = document.getElementById("amount");
  dateInput = document.getElementById("date");
  amountWithInterestInput = document.getElementById("amountWithInterest");
  recalcBtn = document.getElementById("recalc-btn");

  recordsBody = document.getElementById("records-body");
  emptyMessage = document.getElementById("empty-message");

  summaryBase = document.getElementById("summary-base");
  summaryInterest = document.getElementById("summary-interest");
  footerBase = document.getElementById("footer-base");
  footerInterest = document.getElementById("footer-interest");

  // ロード & 初期描画
  loadRecords();
  renderRecords();
  recalcInterestField();

  // イベント登録
  amountInput.addEventListener("input", recalcInterestField);
  recalcBtn.addEventListener("click", recalcInterestField);
  form.addEventListener("submit", addRecord);
});
