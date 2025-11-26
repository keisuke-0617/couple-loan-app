// 利子の割合（10%）
const INTEREST_RATE = 0.10;
// 旧バージョンと分けるためキーを変更
const STORAGE_KEY = "couple-loan-records-v3";

let form;
let nameInput;
let amountInput;
let dateInput;
let amountWithInterestInput;
let recalcBtn;

let recordsBody;
let emptyMessage;

let summaryBorrow;
let summaryRepay;
let summaryNet;
let footerBase;
let footerInterest;

let records = [];

// 読み込み
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

// 保存
function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatYen(value) {
  return value.toLocaleString("ja-JP") + " 円";
}

function labelPerson(person) {
  return person === "hitomi" ? "瞳" : "恵輔";
}

function labelKind(kind) {
  return kind === "repay" ? "返済した" : "借りた";
}

// 一覧・合計描画
function renderRecords() {
  recordsBody.innerHTML = "";

  if (records.length === 0) {
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }

  let totalBorrowBase = 0;
  let totalBorrowInterest = 0;
  let totalRepayBase = 0;
  let totalRepayInterest = 0;

  // 恵輔基準の差額（＋なら恵輔が瞳に借りている、−なら瞳が恵輔に借りている）
  let netInterest = 0;

  records.forEach((rec, index) => {
    // 借入・返済の合計（絶対値）
    if (rec.kind === "borrow") {
      totalBorrowBase += rec.amount;
      totalBorrowInterest += rec.amountWithInterest;
    } else {
      totalRepayBase += rec.amount;
      totalRepayInterest += rec.amountWithInterest;
    }

    // 差額計算（恵輔基準）
    const sign = signedAmountForNet(rec);
    netInterest += sign;

    // テーブル行生成
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = rec.date;

    const tdPerson = document.createElement("td");
    tdPerson.textContent = labelPerson(rec.person);

    const tdKind = document.createElement("td");
    tdKind.textContent = labelKind(rec.kind);

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
    tr.appendChild(tdPerson);
    tr.appendChild(tdKind);
    tr.appendChild(tdName);
    tr.appendChild(tdAmount);
    tr.appendChild(tdAmountWithInterest);
    tr.appendChild(tdActions);

    recordsBody.appendChild(tr);
  });

  // 合計表示
  summaryBorrow.textContent =
    "借入合計（利子込み）：" + formatYen(totalBorrowInterest);
  summaryRepay.textContent =
    "返済合計（利子込み）：" + formatYen(totalRepayInterest);

  // フッターには「借入合計 / 返済合計（元本）」として表示
  footerBase.textContent =
    "借入：" +
    formatYen(totalBorrowBase) +
    " ／ 返済：" +
    formatYen(totalRepayBase);
  footerInterest.textContent =
    "借入：" +
    formatYen(totalBorrowInterest) +
    " ／ 返済：" +
    formatYen(totalRepayInterest);

  // 差額表示（恵輔基準）
  let netText;
  if (netInterest > 0) {
    netText =
      "差額（利子込み）：" +
      formatYen(Math.abs(netInterest)) +
      "（恵輔が瞳に借りている）";
  } else if (netInterest < 0) {
    netText =
      "差額（利子込み）：" +
      formatYen(Math.abs(netInterest)) +
      "（瞳が恵輔に借りている）";
  } else {
    netText = "差額（利子込み）：0 円（トントン）";
  }
  summaryNet.textContent = netText;
}

// 差額計算用の符号付き金額
function signedAmountForNet(rec) {
  const amt = rec.amountWithInterest;
  const person = rec.person; // "keisuke" or "hitomi"
  const kind = rec.kind;     // "borrow" or "repay"

  // 定義：netInterest > 0 なら「恵輔が瞳に借りている」
  if (person === "keisuke" && kind === "borrow") {
    return amt; // 恵輔が借入 → 借金増
  }
  if (person === "keisuke" && kind === "repay") {
    return -amt; // 恵輔が返済 → 借金減
  }
  if (person === "hitomi" && kind === "borrow") {
    return -amt; // 瞳が借入 → 恵輔から見て「貸している」のでマイナス
  }
  if (person === "hitomi" && kind === "repay") {
    return amt; // 瞳が返済 → 貸している額が減るのでプラス方向
  }
  return 0;
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

  const personRadio = document.querySelector('input[name="person"]:checked');
  const kindRadio = document.querySelector('input[name="kind"]:checked');

  const person = personRadio ? personRadio.value : "keisuke"; // keisuke / hitomi
  const kind = kindRadio ? kindRadio.value : "borrow";        // borrow / repay

  if (!name) {
    alert("メモを入力してください。");
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
    person,              // "keisuke" or "hitomi"
    kind,                // "borrow" or "repay"
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

  // デフォルトを戻す
  const keisukeRadio = document.querySelector(
    'input[name="person"][value="keisuke"]'
  );
  if (keisukeRadio) keisukeRadio.checked = true;
  const borrowRadio = document.querySelector(
    'input[name="kind"][value="borrow"]'
  );
  if (borrowRadio) borrowRadio.checked = true;
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

  summaryBorrow = document.getElementById("summary-borrow");
  summaryRepay = document.getElementById("summary-repay");
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
