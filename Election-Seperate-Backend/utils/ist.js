/**
 * IST (India Standard Time, UTC+5:30) timestamp helper.
 *
 * The legacy SP stamped every row with `dbo.GETIST()`, a scalar UDF that
 * returns the current wall-clock time in IST stored in a `datetime` column
 * (no timezone). To reproduce that value deterministically from Node — and
 * avoid a dependency on the UDF — we compute the IST wall-clock time here and
 * pass it as a `'YYYY-MM-DD HH:mm:ss.SSS'` string. Every INSERT/UPDATE then
 * uses `CONVERT(datetime, @getist, 121)` so the driver's own timezone handling
 * cannot shift the stored value.
 */

const IST_OFFSET_MINUTES = 5 * 60 + 30; // +05:30

const pad = (n, width = 2) => String(n).padStart(width, "0");

/**
 * Returns the current IST time as an ODBC-canonical string (style 121).
 * @returns {string} e.g. "2026-07-14 17:42:10.123"
 */
function getISTString() {
  const now = new Date();
  // Shift the UTC epoch by the IST offset, then read the "UTC" parts of the
  // shifted date — those parts now represent IST wall-clock components.
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return (
    `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ` +
    `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}.` +
    `${pad(ist.getUTCMilliseconds(), 3)}`
  );
}

module.exports = { getISTString };
