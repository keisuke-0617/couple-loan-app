// app.js ふたりの借用ノート（ロリポップPHP＋MySQL連携版）

// 利子の割合（10%）
const INTEREST_RATE = 0.10;

// ★ここをあなたの実際のURLに変更してください
// 例: const API_BASE = "https://piaget.hungry.jp/borrow-api";
const API_BASE = "http://piaget.hungry.jp/borrow-api";

// DOM 参照用変数
let form;
let nameInput;
let amountInput;
let dateInput;
let amountWithInterestInput;
let recalcBtn;

let recordsBody;
let emptyMessage;

// サマリー表示
let summaryBorrow;
let summaryRepay;
let summaryNet;
let footerBase;
let footerInterest;

// JS 内で扱うレコード配列
let records = [];

// ===================== API 呼び出し =====================

// 一覧取得
async function apiFetchRecords() {
  const res = await fetch(`${API_BASE}/fetch_records.php`, {
    method: "GET"
  });
  if (!res.ok) {
    throw new Error("fetch_records.php がエラーになりました");
  }

  const data = await res.json();

  if (!data.success && !Array.isArray(data.records)) {
    // person/type 版の PHP サンプルでは
    // { success: true, records: [...] } の形で返す想定
    // もし data が配列ならそのまま扱う
    records = Array.isArray(data) ? data : [];
  } else {
    records = (data.records || []);
  }

  // PHP 側のキー名 → フロント用のキー名に揃える
  records = records.map(row => ({
    id: Number(row.id),
    person: row.person,                             // "keisuke" or "hitomi"
    kind: row.type,                                // "borrow" or "repay"
    name: row.memo,
    amount: Number(row.amount),
    amountWithInterest: Number(row.interest_amount),
    date: row.date
  }));
}

// 追加
async function apiAddRecord(rec) {
  const res = await fetch(`${API_BASE}/add_record.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rec)
  });
  if (!res.ok) {
    throw new Error("add_record.php がエラーになりました");
  }
  const data = await res.json();
  if (data && data.success === false) {
    throw new Error(data.error || "add_record で失敗しました");
  }
}

// 削除
async function apiDeleteRecord(id) {
  const res = await fetch(`${API_BASE}/delete_record.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  if (!res.ok) {
    throw new Error("delete_record.php がエラーになりました");
  }
  const data = await res.json();
  if (data && data.success === false) {
    throw new Error(data.error || "delete_record で失敗しました");
  }
}

// ===================== 表示系ユーティリティ =====================

function formatYen(value) {
  if (Number.isNaN(value)) value = 0;
  return value.toLocaleString("ja-JP") + " 円";
}

function labelPerson(person) {
  if (person === "hitomi") return "瞳";
  if (person === "keisuke") return "恵輔";
  return person || "";
}

function labelKind(kind) {
  if (kind === "repay") return "返済した";
  return "借りた";
}

// 差額計算用（恵輔基準）
// 戻り値がプラスなら「恵輔が瞳に借りている」
// マイナスなら「瞳が恵輔に借りている」
function signedAmountForNet(rec) {
  const amt = rec.amountWithInterest;
  const p = rec.person; // "keisuke" or "hitomi"
  const k = rec.kind;   // "borrow" or "repay"

  if (p === "keisuke" && k === "borrow") return amt;
  if (p === "keisuke" && k === "repay")  return -amt;
  if (p === "hitomi"   && k === "borrow") return -amt;
  if (p === "hitomi"   && k === "repay")  return amt;
  return 0;
}

// 一覧とサマリーの描画
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
  let netInterest = 0;

  records.forEach((rec) => {
    // 集計
    if (rec.kind === "borrow") {
      totalBorrowBase += rec.amount;
      totalBorrowInterest += rec.amountWithInterest;
    } else if (rec.kind === "repay") {
      totalRepayBase += rec.amount;
      totalRepayInterest += rec.amountWithInterest;
    }

    netInterest += signedAmountForNet(rec);

    // 行描画
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
    delBtn.addEventListener("click", async () => {
      if (!confirm("この記録を削除しますか？")) return;
      try {
        await apiDeleteRecord(rec.id);
        await apiFetchRecords();
        renderRecords();
      } catch (e) {
        console.error(e);
        alert("削除に失敗しました。");
      }
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

  // 上部サマリー
  summaryBorrow.textContent =
    "借入合計（利子込み）：" + formatYen(totalBorrowInterest);
  summaryRepay.textContent =
    "返済合計（利子込み）：" + formatYen(totalRepayInterest);

  // フッターの基礎情報
  footerBase.textContent =
    "借入：" + formatYen(totalBorrowBase) +
    " ／ 返済：" + formatYen(totalRepayBase);

  footerInterest.textContent =
    "借入：" + formatYen(totalBorrowInterest) +
    " ／ 返済：" + formatYen(totalRepayInterest);

  // 差額（恵輔基準）
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

// ===================== 入力系処理 =====================

// 金額入力 → 利子込み金額を自動計算
function recalcInterestField() {
  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) {
    amountWithInterestInput.value = "";
    return;
  }
  const interestAmount = Math.round(amount * (1 + INTEREST_RATE));
  amountWithInterestInput.value = interestAmount;
}

// フォーム送信（追加処理）
async function addRecord(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  let date = dateInput.value;

  const personRadio = document.querySelector('input[name="person"]:checked');
  const kindRadio = document.querySelector('input[name="kind"]:checked');

  const person = personRadio ? personRadio.value : "keisuke"; // "keisuke" / "hitomi"
  const kind = kindRadio ? kindRadio.value : "borrow";        // "borrow" / "repay"

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
    amountWithInterest = Math.round(amount * (1 + INTEREST_RATE));
  }

  const newRecord = {
    person,                // PHP add_record.php 側で person として受ける
    kind,                  // type 列に入る予定
    name,                  // memo 列
    amount,
    date,
    amountWithInterest     // interest_amount 列
  };

  try {
    await apiAddRecord(newRecord);
    await apiFetchRecords();
    renderRecords();
  } catch (e) {
    console.error(e);
    alert("登録に失敗しました。サーバー設定（PHP / DB）を確認してください。");
    return;
  }

  // フォームリセット
  nameInput.value = "";
  amountInput.value = "";
  amountWithInterestInput.value = "";

  // ラジオをデフォルト（恵輔・借りた）に戻す
  const keisukeRadio = document.querySelector(
    'input[name="person"][value="keisuke"]'
  );
  const borrowRadio = document.querySelector(
    'input[name="kind"][value="borrow"]'
  );
  if (keisukeRadio) keisukeRadio.checked = true;
  if (borrowRadio) borrowRadio.checked = true;
}

// ===================== 初期化 =====================

document.addEventListener("DOMContentLoaded", async () => {
  // DOM 要素取得
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

  // 初期状態で利子込み欄をクリア
  recalcInterestField();

  // サーバーから現在のデータを取得して表示
  try {
    await apiFetchRecords();
    renderRecords();
  } catch (e) {
    console.error(e);
    alert(
      "サーバーからデータを取得できませんでした。\n" +
      "API_BASE のURLや PHPファイルの場所、db.php の接続情報を確認してください。"
    );
  }

  // イベント登録
  amountInput.addEventListener("input", recalcInterestField);
  recalcBtn.addEventListener("click", recalcInterestField);
  form.addEventListener("submit", addRecord);
});

