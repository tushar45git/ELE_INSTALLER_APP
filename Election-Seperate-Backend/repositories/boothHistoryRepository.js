/**
 * boothhistory repository — append-only audit trail with a soft-delete flag.
 *
 * SP contract preserved:
 *   • Exactly one "active" (isdelete = 0) history row represents a booth's
 *     current state. On edit/delete the active row(s) are soft-deleted and a
 *     fresh row is appended.
 *   • SP-constant columns are hardcoded to match byte-for-byte: boothstateid=1,
 *     isdisplay=1, longitude=0, latitude=0, IsPink=0, IsAro=0.
 */

const sql = require("mssql");

/**
 * Append a history row.
 * @param {object} h Fields (see below). `isOutsideBooth` is 0/1; page/from
 *   columns may be null where the SP omitted them (INSERT vs UPDATE variants).
 * @param {string} getist ODBC style-121 timestamp string.
 */
async function insert(makeRequest, h, getist) {
  await makeRequest()
    .input("streamid", sql.Int, h.streamId)
    .input("operatorid", sql.Int, h.operatorId)
    .input("district", sql.NVarChar(sql.MAX), h.district)
    .input("accode", sql.NVarChar(sql.MAX), h.accode)
    .input("acname", sql.NVarChar(sql.MAX), h.acname)
    .input("psnum", sql.NVarChar(50), h.psNum)
    .input("location", sql.NVarChar(sql.MAX), h.location)
    .input("cameralocationtype", sql.NVarChar(100), h.cameraLocationType)
    .input("isoutsidebooth", sql.Bit, h.isOutsideBooth)
    .input("addedby", sql.VarChar(255), h.addedBy)
    .input("updatedby", sql.NVarChar(50), h.updatedBy)
    .input("updatedfrom", sql.NVarChar(50), h.updatedFrom)
    .input("action", sql.VarChar(50), h.action)
    .input("boothid", sql.Int, h.boothId)
    .input("ipaddress", sql.VarChar(50), h.ipAddress)
    .input("addedfrompage", sql.VarChar(100), h.addedFromPage ?? null)
    .input("addedfrom", sql.VarChar(100), h.addedFrom ?? null)
    .input("updatedfrompage", sql.VarChar(100), h.updatedFromPage ?? null)
    .input("getist", sql.VarChar(30), getist).query(`
      INSERT INTO boothhistory
        (streamid, operatorid, district, accode, acname, PSNum, location,
         boothstateid, isdisplay, longitude, latitude, cameralocationtype,
         IsPink, IsOutsideBooth, AddDatetime, addedBy, IsAro, updatedDate,
         updatedBy, updatedFrom, Action, boothid, IPAddress,
         AddedFromPage, AddedFrom, UpdatedFromPage, isdelete)
      VALUES
        (@streamid, @operatorid, @district, @accode, @acname, @psnum, @location,
         1, 1, 0, 0, @cameralocationtype,
         0, @isoutsidebooth, CONVERT(datetime, @getist, 121), @addedby, '0',
         CONVERT(datetime, @getist, 121),
         @updatedby, @updatedfrom, @action, @boothid, @ipaddress,
         @addedfrompage, @addedfrom, @updatedfrompage, 0)`);
}

/** Soft-delete all currently active history rows for a booth (SP edit step). */
async function softDeleteActiveByBooth(makeRequest, boothId, meta, getist) {
  await makeRequest()
    .input("boothid", sql.Int, boothId)
    .input("updatedby", sql.NVarChar(50), meta.updatedBy)
    .input("updatedfrom", sql.NVarChar(50), meta.updatedFrom)
    .input("updatedfrompage", sql.VarChar(100), meta.updatedFromPage)
    .input("getist", sql.VarChar(30), getist).query(`
      UPDATE boothhistory
      SET isdelete = 1,
          updatedDate = CONVERT(datetime, @getist, 121),
          updatedBy = @updatedby,
          updatedFrom = @updatedfrom,
          UpdatedFromPage = @updatedfrompage
      WHERE boothid = @boothid AND ISNULL(isdelete, 0) = 0`);
}

/** Full history for a booth (newest first) — backs the "View History" action. */
async function listByBooth(makeRequest, boothId) {
  const result = await makeRequest()
    .input("boothid", sql.Int, boothId)
    .query(`
      SELECT h.id, h.boothid, h.streamid, s.streamname, h.district, h.accode,
             h.acname, h.PSNum, h.location, h.cameralocationtype, h.Action,
             h.addedBy, h.updatedBy, h.updatedFrom, h.updatedDate, h.AddDatetime,
             h.IPAddress, h.isdelete
      FROM boothhistory h WITH (NOLOCK)
      LEFT JOIN streamlist s WITH (NOLOCK) ON s.id = h.streamid
      WHERE h.boothid = @boothid
      ORDER BY h.id DESC`);
  return result.recordset;
}

module.exports = { insert, softDeleteActiveByBooth, listByBooth };
