// 利子の割合（10%）
const INTEREST_RATE = 0.10;
const STORAGE_KEY = "couple-loan-records-v2"; // v2 にして旧データと分ける

let form;
let nameInput;
let amountInput;
let dateInput;
let amountWithInterestInput;
let recalcBtn;
let borrowerRadios;

let recordsBody;
let emptyMessage;

let summaryBase;
let summaryInterest;
let summaryNet;
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

function formatBorrower(borrower) {
  if (borrower === "partner") return "相手が借りた";
  return "あなたが借りた";
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

  let totalBaseMe = 0;
  let totalBasePartner = 0;
  let totalInterestMe = 0;
  let totalInterestPartner = 0;

  records.forEach((rec, index) => {
    const borrower = rec.borrower === "partner" ? "partner" : "me";

    totalBase += rec.amount;
    totalInterest += rec.amountWithInterest;

    if (borrower === "me") {
      totalBaseMe += rec.amount;
      totalInterestMe += rec.amountWithInterest;
    } else {
      totalBasePartner += rec.amount;
      totalInterestPartner += rec.amountWithInterest;
    }

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = rec.date;

    const tdBorrower = document.createElement("td");
    tdBorrower.textContent = formatBorrower(borrower);

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
    tr.appendChild(tdBorrower);
    tr.appendChild(tdName);
    tr.appendChild(tdAmount);
    tr.appendChild(tdAmountWithInterest);
    tr.appendChild(tdActions);

    recordsBody.appendChild(tr);
  });

  // 合計表示（絶対値）
  summaryBase.textContent = "合計（元本）：" + formatYen(totalBase);
  summaryInterest.textContent = "合計（利子込み）：" + formatYen(totalInterest);

  footerBase.textContent = formatYen(totalBase);
  footerInterest.textContent = formatYen(totalInterest);

  // 差額（利子込み）＝ あなたが借りた − 相手が借りた
  const netInterest = totalInterestMe - totalInterestPartner;
  let netLabel;

  if (netInterest > 0) {
    netLabel =
      "差額（利子込み）：" +
      formatYen(netInterest) +
      "（あなたが相手に支払う側）";
  } else if (netInterest < 0) {
    netLabel =
      "差額（利子込み）：" +
      formatYen(Math.abs(netInterest)) +
      "（相手があなたに支払う側）";
  } else {
    netLabel = "差額（利子込み）：0 円（トントン）";
  }

  summaryNet.textContent = netLabel;
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

  const borrowerRadio = document.querySelector('input[name="borrower"]:checked');
  const borrower = borrowerRadio ? borrowerRadio.value : "me";

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
    borrower,              // "me" or "partner"
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
  // 「誰が借りたか」は「あなたが借りた」に戻しておく
  const meRadio = document.querySelector('input[name="borrower"][value="me"]');
  if (meRadio) meRadio.checked = true;
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
  borrowerRadios = document.querySelectorAll('input[name="borrower"]');

  recordsBody = document.getElementById("records-body");
  emptyMessage = document.getElementById("empty-message");

  summaryBase = document.getElementById("summary-base");
  summaryInterest = document.getElementById("summary-interest");
  summaryNet = document.getElementById("summary-net");
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
