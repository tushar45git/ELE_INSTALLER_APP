/**
 * booth repository — the camera↔booth mapping table.
 *
 * Column types below are bound to the *live* schema:
 *   district varchar(100), acname varchar(100), accode nvarchar(max),
 *   PSNum nvarchar(50), location nvarchar(max), cameralocationtype nvarchar(100),
 *   addedBy varchar(255), updatedBy nvarchar(50), IsAro varchar(255).
 *
 * Per the parity decision, longitude/latitude are stored as 0 and IsPink/IsAro
 * as 0 on write, exactly as the SP did (values are accepted at the API for
 * forward-compatibility but not persisted).
 */

const sql = require("mssql");
const {
  SORTABLE_COLUMNS,
  DEFAULT_SORT_COLUMN,
  DEFAULT_SORT_ORDER,
} = require("../constants/cameraMapping");

/** Bind the shared booth column set from a mapping payload onto a request. */
function bindBoothColumns(req, d) {
  return req
    .input("streamid", sql.Int, d.streamId)
    .input("operatorid", sql.Int, d.operatorId)
    .input("district", sql.VarChar(100), d.district)
    .input("accode", sql.NVarChar(sql.MAX), d.accode)
    .input("acname", sql.VarChar(100), d.acname)
    .input("psnum", sql.NVarChar(50), d.psNum)
    .input("location", sql.NVarChar(sql.MAX), d.location)
    .input("cameralocationtype", sql.NVarChar(100), d.cameraLocationType)
    .input("isoutsidebooth", sql.Bit, d.isOutsideBooth);
}

/**
 * Find another *non-deleted* booth already using this camera (SP duplicate
 * probe). Excludes the booth being edited. Returns the conflicting row or null.
 */
async function findDuplicateByStream(makeRequest, { streamId, excludeId }) {
  const result = await makeRequest()
    .input("streamid", sql.Int, streamId)
    .input("excludeid", sql.Int, excludeId)
    .query(`
      SELECT TOP 1 id, streamid, district, acname, PSNum, location
      FROM booth WITH (NOLOCK)
      WHERE streamid = @streamid AND id <> @excludeid AND ISNULL(isdelete, 0) = 0
      ORDER BY id`);
  return result.recordset[0] ?? null;
}

/** Single mapping joined with camera + operator, or null. */
async function findById(makeRequest, id) {
  const result = await makeRequest().input("id", sql.Int, id).query(`
      SELECT b.id, b.streamid, s.streamname, b.operatorid,
             o.operatorName, o.operatorNumber, o.Designation AS operatorDesignation,
             b.district, b.accode, b.acname, b.PSNum, b.location,
             b.cameralocationtype, b.IsOutsideBooth, b.longitude, b.latitude,
             b.addedBy, b.AddDatetime, b.updatedBy, b.updatedDate, b.updatedFrom
      FROM booth b WITH (NOLOCK)
      LEFT JOIN streamlist s WITH (NOLOCK) ON s.id = b.streamid
      LEFT JOIN operator_info o WITH (NOLOCK) ON o.id = b.operatorid
      WHERE b.id = @id AND ISNULL(b.isdelete, 0) = 0`);
  return result.recordset[0] ?? null;
}

/**
 * Old snapshot (booth ⋈ streamlist) needed by the edit path to detect camera
 * and location changes. Returns null if the booth is missing/deleted.
 */
async function findOldSnapshot(makeRequest, id) {
  const result = await makeRequest().input("id", sql.Int, id).query(`
      SELECT s.streamname AS oldStreamName, b.streamid AS oldStreamId,
             b.operatorid AS oldOperatorId, b.cameralocationtype AS oldCameraLocationType,
             b.district AS oldDistrict, b.acname AS oldAcname,
             b.location AS oldLocation, b.PSNum AS oldPsNum, b.accode AS oldAccode
      FROM booth b WITH (NOLOCK)
      LEFT JOIN streamlist s WITH (NOLOCK) ON s.id = b.streamid
      WHERE b.id = @id`);
  return result.recordset[0] ?? null;
}

/**
 * Latest non-deleted mapping for a given camera (streamid), joined with camera
 * + operator. Backs the AutoInstaller "is this camera mapped?" lookup.
 */
async function findByStreamId(makeRequest, streamId) {
  const result = await makeRequest().input("streamid", sql.Int, streamId).query(`
      SELECT TOP 1 b.id, b.streamid, s.streamname, b.operatorid,
             o.operatorName, o.operatorNumber, o.Designation AS operatorDesignation,
             b.district, b.accode, b.acname, b.PSNum, b.location,
             b.cameralocationtype, b.IsOutsideBooth, b.longitude, b.latitude,
             b.addedBy, b.AddDatetime, b.updatedBy, b.updatedDate
      FROM booth b WITH (NOLOCK)
      LEFT JOIN streamlist s WITH (NOLOCK) ON s.id = b.streamid
      LEFT JOIN operator_info o WITH (NOLOCK) ON o.id = b.operatorid
      WHERE b.streamid = @streamid AND ISNULL(b.isdelete, 0) = 0
      ORDER BY b.id DESC`);
  return result.recordset[0] ?? null;
}

/**
 * Find another non-deleted booth occupying the same location slot
 * (assembly name + PS number + camera location type), excluding the booth
 * being edited. Backs the AutoInstaller location-swap prompt.
 */
async function findByLocationSlot(makeRequest, { acname, psNum, cameraLocationType, excludeId }) {
  const result = await makeRequest()
    .input("acname", sql.VarChar(100), acname)
    .input("psnum", sql.NVarChar(50), psNum)
    .input("cameralocationtype", sql.NVarChar(100), cameraLocationType)
    .input("excludeid", sql.Int, excludeId)
    .query(`
      SELECT TOP 1 b.id, b.streamid, s.streamname, b.district, b.accode,
             b.acname, b.PSNum, b.location, b.cameralocationtype, b.operatorid,
             b.IsOutsideBooth
      FROM booth b WITH (NOLOCK)
      LEFT JOIN streamlist s WITH (NOLOCK) ON s.id = b.streamid
      WHERE ISNULL(b.isdelete, 0) = 0 AND b.id <> @excludeid
        AND b.acname = @acname AND b.PSNum = @psnum
        AND b.cameralocationtype = @cameralocationtype
      ORDER BY b.id DESC`);
  return result.recordset[0] ?? null;
}

/**
 * Server-side paginated / filtered / sorted list.
 * Uses COUNT(*) OVER() so the total ships back in the same round trip.
 * `sortBy` is whitelisted; `sortOrder` is coerced — neither can inject SQL.
 */
async function list(makeRequest, params) {
  const {
    search = "",
    district = "",
    assembly = "",
    camera = "",
    offset = 0,
    limit = 10,
    sortBy,
    sortOrder,
  } = params;

  const sortColumn = SORTABLE_COLUMNS[sortBy] || DEFAULT_SORT_COLUMN;
  const direction =
    String(sortOrder).toUpperCase() === "ASC" ? "ASC" : DEFAULT_SORT_ORDER;

  const result = await makeRequest()
    .input("search", sql.NVarChar(200), `%${search}%`)
    .input("hasSearch", sql.Bit, search ? 1 : 0)
    .input("district", sql.NVarChar(200), district)
    .input("assembly", sql.NVarChar(200), assembly)
    .input("camera", sql.NVarChar(200), `%${camera}%`)
    .input("hasCamera", sql.Bit, camera ? 1 : 0)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
      SELECT
        b.id, b.streamid, s.streamname, b.district, b.accode, b.acname,
        b.PSNum, b.location, b.cameralocationtype, b.IsOutsideBooth,
        o.operatorName, o.operatorNumber, o.Designation AS operatorDesignation,
        b.updatedBy, b.updatedDate, b.AddDatetime, b.addedBy,
        COUNT(*) OVER() AS totalRecords
      FROM booth b WITH (NOLOCK)
      LEFT JOIN streamlist s WITH (NOLOCK) ON s.id = b.streamid
      LEFT JOIN operator_info o WITH (NOLOCK) ON o.id = b.operatorid
      WHERE ISNULL(b.isdelete, 0) = 0
        AND (@district = '' OR b.district = @district)
        AND (@assembly = '' OR b.acname = @assembly)
        AND (@hasCamera = 0 OR s.streamname LIKE @camera)
        AND (@hasSearch = 0 OR
             s.streamname LIKE @search OR b.location LIKE @search OR
             b.district LIKE @search OR b.acname LIKE @search OR
             b.PSNum LIKE @search OR o.operatorName LIKE @search)
      ORDER BY ${sortColumn} ${direction}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);

  const rows = result.recordset;
  const total = rows.length > 0 ? rows[0].totalRecords : 0;
  rows.forEach((r) => delete r.totalRecords);
  return { rows, total };
}

/** Insert a new booth (SP add branch). Returns the new booth id. */
async function insert(makeRequest, d, getist) {
  const req = bindBoothColumns(makeRequest(), d)
    .input("addedby", sql.VarChar(255), d.userName)
    .input("updatedby", sql.NVarChar(50), d.userName)
    .input("addfrom", sql.VarChar(100), d.addedFrom)
    .input("addpage", sql.VarChar(100), d.addedFromPage)
    .input("getist", sql.VarChar(30), getist);
  const result = await req.query(`
    INSERT INTO booth
      (streamid, operatorid, district, accode, acname, PSNum, location,
       boothstateid, isdisplay, longitude, latitude, cameralocationtype,
       IsPink, IsOutsideBooth, AddDatetime, addedBy, IsAro, isdelete,
       AddedFromPage, AddedFrom, updatedBy, updatedFrom)
    VALUES
      (@streamid, @operatorid, @district, @accode, @acname, @psnum, @location,
       1, 1, 0, 0, @cameralocationtype,
       0, @isoutsidebooth, CONVERT(datetime, @getist, 121), @addedby, '0', 0,
       @addpage, @addfrom, @updatedby, @addfrom);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
  return result.recordset[0].id;
}

/** Update an existing booth (SP edit branch). longitude/latitude untouched. */
async function update(makeRequest, id, d, getist) {
  const req = bindBoothColumns(makeRequest().input("id", sql.Int, id), d)
    .input("updatedby", sql.NVarChar(50), d.userName)
    .input("updatedfrom", sql.NVarChar(50), d.updatedFrom)
    .input("updatedfrompage", sql.VarChar(100), d.updatedFromPage)
    .input("getist", sql.VarChar(30), getist);
  await req.query(`
    UPDATE booth SET
      streamid = @streamid, operatorid = @operatorid, district = @district,
      accode = @accode, acname = @acname, PSNum = @psnum, location = @location,
      cameralocationtype = @cameralocationtype, IsOutsideBooth = @isoutsidebooth,
      updatedDate = CONVERT(datetime, @getist, 121), updatedBy = @updatedby,
      updatedFrom = @updatedfrom, UpdatedFromPage = @updatedfrompage,
      IsPink = 0, IsAro = 0, isupdated = 1
    WHERE id = @id`);
}

/** Reassign only the camera of a booth (used by the swap flow). */
async function updateStream(makeRequest, id, streamId, meta, getist) {
  await makeRequest()
    .input("id", sql.Int, id)
    .input("streamid", sql.Int, streamId)
    .input("updatedby", sql.NVarChar(50), meta.userName)
    .input("updatedfrom", sql.NVarChar(50), meta.updatedFrom)
    .input("updatedfrompage", sql.VarChar(100), meta.updatedFromPage)
    .input("getist", sql.VarChar(30), getist).query(`
      UPDATE booth SET
        streamid = @streamid,
        updatedDate = CONVERT(datetime, @getist, 121),
        updatedBy = @updatedby, updatedFrom = @updatedfrom,
        UpdatedFromPage = @updatedfrompage, isupdated = 1
      WHERE id = @id`);
}

/** Soft-delete a booth (net-new; SP had no delete). */
async function softDelete(makeRequest, id, meta, getist) {
  await makeRequest()
    .input("id", sql.Int, id)
    .input("updatedby", sql.NVarChar(50), meta.userName)
    .input("updatedfrom", sql.NVarChar(50), meta.updatedFrom)
    .input("updatedfrompage", sql.VarChar(100), meta.updatedFromPage)
    .input("getist", sql.VarChar(30), getist).query(`
      UPDATE booth SET
        isdelete = 1,
        updatedDate = CONVERT(datetime, @getist, 121),
        updatedBy = @updatedby, updatedFrom = @updatedfrom,
        UpdatedFromPage = @updatedfrompage
      WHERE id = @id`);
}

/** Distinct districts for the filter dropdown. */
async function distinctDistricts(makeRequest) {
  const result = await makeRequest().query(`
    SELECT DISTINCT district FROM booth WITH (NOLOCK)
    WHERE ISNULL(isdelete, 0) = 0 AND district IS NOT NULL AND district <> ''
    ORDER BY district`);
  return result.recordset.map((r) => r.district);
}

/** Distinct assemblies (optionally scoped to a district). */
async function distinctAssemblies(makeRequest, district = "") {
  const result = await makeRequest()
    .input("district", sql.NVarChar(200), district)
    .query(`
      SELECT DISTINCT acname, accode FROM booth WITH (NOLOCK)
      WHERE ISNULL(isdelete, 0) = 0 AND acname IS NOT NULL AND acname <> ''
        AND (@district = '' OR district = @district)
      ORDER BY acname`);
  return result.recordset;
}

/** Distinct PS numbers, optionally scoped to a district and/or assembly. */
async function distinctPsNumbers(makeRequest, { district = "", acname = "" } = {}) {
  const result = await makeRequest()
    .input("district", sql.NVarChar(200), district)
    .input("acname", sql.NVarChar(200), acname)
    .query(`
      SELECT DISTINCT PSNum FROM booth WITH (NOLOCK)
      WHERE ISNULL(isdelete, 0) = 0 AND PSNum IS NOT NULL AND PSNum <> ''
        AND (@district = '' OR district = @district)
        AND (@acname = '' OR acname = @acname)`);
  return result.recordset.map((r) => r.PSNum);
}

module.exports = {
  distinctPsNumbers,
  findDuplicateByStream,
  findById,
  findByStreamId,
  findByLocationSlot,
  findOldSnapshot,
  list,
  insert,
  update,
  updateStream,
  softDelete,
  distinctDistricts,
  distinctAssemblies,
};
