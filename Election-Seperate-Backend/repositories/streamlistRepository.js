/**
 * streamlist repository — read-only camera master.
 * The SP only ever read `streamname` from this table; we add existence and
 * search helpers to back the frontend camera picker and validation.
 */

const sql = require("mssql");

/** Get a camera's stream name, or null if the id does not exist. */
async function getStreamName(makeRequest, streamId) {
  const result = await makeRequest()
    .input("streamid", sql.Int, streamId)
    .query(
      "SELECT streamname FROM streamlist WITH (NOLOCK) WHERE id = @streamid",
    );
  return result.recordset[0]?.streamname ?? null;
}

/** True if the camera id exists (used by the "invalid stream" validation). */
async function existsById(makeRequest, streamId) {
  const result = await makeRequest()
    .input("streamid", sql.Int, streamId)
    .query("SELECT TOP 1 id FROM streamlist WITH (NOLOCK) WHERE id = @streamid");
  return result.recordset.length > 0;
}

/**
 * Resolve a single camera by its device id or exact stream name.
 * Returns { id, streamname, deviceid } or null. Used by the AutoInstaller
 * lookup to turn a scanned/entered device id into a streamlist id.
 */
async function findByDeviceOrName(makeRequest, term) {
  const result = await makeRequest()
    .input("term", sql.NVarChar(100), term)
    .query(`
      SELECT TOP 1 id, streamname, deviceid
      FROM streamlist WITH (NOLOCK)
      WHERE ISNULL(isdeleted, 0) = 0
        AND (deviceid = @term OR streamname = @term)
      ORDER BY id DESC`);
  return result.recordset[0] ?? null;
}

/** Autocomplete search for the camera dropdown. */
async function search(makeRequest, { term = "", limit = 25 } = {}) {
  const result = await makeRequest()
    .input("term", sql.NVarChar(100), `%${term}%`)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT TOP (@limit) id, streamname, deviceid
      FROM streamlist WITH (NOLOCK)
      WHERE ISNULL(isdeleted, 0) = 0
        AND (@term = '%%' OR streamname LIKE @term OR deviceid LIKE @term)
      ORDER BY streamname`);
  return result.recordset;
}

module.exports = { getStreamName, existsById, findByDeviceOrName, search };
