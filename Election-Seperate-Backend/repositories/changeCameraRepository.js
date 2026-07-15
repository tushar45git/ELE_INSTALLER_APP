/**
 * ChangeCamera repository — the "camera-at-location" ledger.
 *
 * Semantics carried over from the SP:
 *   • A row with Updatedatetime IS NULL is the *currently active* mapping.
 *   • openRow(...)         -> a new mapping starts (Adddatetime set, Update null).
 *   • closeActiveRow(...)  -> the active mapping ends  (Updatedatetime stamped).
 *   • rewriteLocation(...) -> the same physical mapping's location metadata
 *                             changed (edit in place, no camera change).
 *
 * All timestamps are passed as an ODBC style-121 string and CONVERTed, matching
 * utils/ist.js so stored values are identical regardless of driver timezone.
 */

const sql = require("mssql");

// Column-accurate parameter binders (sizes taken from the live schema).
const bindTuple = (req, t) =>
  req
    .input("district", sql.NVarChar(50), t.district)
    .input("accode", sql.VarChar(50), t.accode)
    .input("acname", sql.NVarChar(50), t.acname)
    .input("psNo", sql.NVarChar(100), t.psNo)
    .input("location", sql.NVarChar(sql.MAX), t.location);

/** Open a new active ledger row for (location tuple + camera). */
async function openRow(makeRequest, tuple, streamName, getist) {
  const req = bindTuple(makeRequest(), tuple)
    .input("streamname", sql.NVarChar(50), streamName)
    .input("getist", sql.VarChar(30), getist);
  await req.query(`
    INSERT INTO ChangeCamera (District, accode, acname, PsNo, location, streamname, Adddatetime)
    VALUES (@district, @accode, @acname, @psNo, @location, @streamname, CONVERT(datetime, @getist, 121))`);
}

/**
 * Close the active row that matches the (location tuple + camera) exactly.
 * Only rows with Updatedatetime IS NULL are affected — never re-closes history.
 */
async function closeActiveRow(makeRequest, tuple, streamName, getist) {
  const req = bindTuple(makeRequest(), tuple)
    .input("streamname", sql.NVarChar(50), streamName)
    .input("getist", sql.VarChar(30), getist);
  await req.query(`
    UPDATE ChangeCamera
    SET Updatedatetime = CONVERT(datetime, @getist, 121)
    WHERE district = @district AND acname = @acname AND PsNo = @psNo
      AND location = @location AND streamname = @streamname
      AND Updatedatetime IS NULL`);
}

/** Find the ledger row id for a location tuple (most recent first). */
async function findLocationRowId(makeRequest, tuple) {
  const result = await bindTuple(makeRequest(), tuple).query(`
    SELECT TOP 1 ID FROM ChangeCamera
    WHERE district = @district AND acname = @acname AND location = @location
      AND PsNo = @psNo AND accode = @accode
    ORDER BY ID DESC`);
  return result.recordset[0]?.ID ?? null;
}

/** Rewrite a ledger row's location metadata in place (no camera change). */
async function rewriteLocation(makeRequest, id, tuple) {
  await bindTuple(makeRequest().input("id", sql.Int, id), tuple).query(`
    UPDATE ChangeCamera
    SET District = @district, acname = @acname, location = @location,
        PsNo = @psNo, accode = @accode
    WHERE ID = @id`);
}

module.exports = { openRow, closeActiveRow, findLocationRowId, rewriteLocation };
