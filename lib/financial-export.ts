// QIF and OFX generators for exporting into other accounting software
// (Quicken, GnuCash, TurboTax, etc.) beyond this app's own CSV/JSON export.
// Both formats model a single account "register" — negative amounts are
// debits (expenses), positive are credits (income) — the same convention
// real bank exports use.

export type LedgerEntry = {
  date: string; // ISO yyyy-mm-dd
  amount: number; // signed, negative = expense
  payee: string;
  category?: string;
  memo?: string;
};

export function toQif(entries: LedgerEntry[]): string {
  const lines: string[] = ["!Type:Bank"];
  for (const e of entries) {
    const [y, m, d] = e.date.split("-");
    lines.push(`D${m}/${d}/${y}`);
    lines.push(`T${e.amount.toFixed(2)}`);
    lines.push(`P${e.payee}`);
    if (e.category) lines.push(`L${e.category}`);
    if (e.memo) lines.push(`M${e.memo}`);
    lines.push("^");
  }
  return lines.join("\n");
}

function ofxDate(dateIso: string) {
  return dateIso.replace(/-/g, "") + "000000";
}

function escapeOfx(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toOfx(entries: LedgerEntry[], accountName: string): string {
  const nowStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const dates = entries.map((e) => e.date).sort();
  const dtStart = dates.length > 0 ? ofxDate(dates[0]) : nowStr;
  const dtEnd = dates.length > 0 ? ofxDate(dates[dates.length - 1]) : nowStr;

  const txns = entries
    .map((e, i) => {
      const memo = e.memo ? `\n<MEMO>${escapeOfx(e.memo)}` : "";
      return `
<STMTTRN>
<TRNTYPE>${e.amount < 0 ? "DEBIT" : "CREDIT"}
<DTPOSTED>${ofxDate(e.date)}
<TRNAMT>${e.amount.toFixed(2)}
<FITID>${i}-${e.date}
<NAME>${escapeOfx(e.payee).slice(0, 32)}${memo}
</STMTTRN>`;
    })
    .join("");

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${nowStr}
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>000000000
<ACCTID>${escapeOfx(accountName)}
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtStart}
<DTEND>${dtEnd}${txns}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>${nowStr}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}
