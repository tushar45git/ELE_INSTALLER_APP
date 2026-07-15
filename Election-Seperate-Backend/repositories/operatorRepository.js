/**
 * operator_info repository.
 * Mirrors the SP's find-or-create behaviour: look up an operator by the exact
 * (name, number, designation) triple, insert if none matches.
 */

const sql = require("mssql");

/** Returns the matching operator id, or 0 if none (SP semantics). */
async function findId(makeRequest, { name, number, designation }) {
  const result = await makeRequest()
    .input("name", sql.NVarChar(100), name)
    .input("number", sql.NVarChar(100), number)
    .input("designation", sql.NVarChar(100), designation)
    .query(`
      SELECT id FROM operator_info WITH (NOLOCK)
      WHERE operatorName = @name
        AND operatorNumber = @number
        AND ISNULL(Designation, '') = ISNULL(@designation, '')`);
  return result.recordset[0]?.id ?? 0;
}

/** Insert a new operator and return its identity. */
async function insert(makeRequest, { name, number, designation, district }) {
  const result = await makeRequest()
    .input("name", sql.NVarChar(100), name)
    .input("number", sql.NVarChar(100), number)
    .input("designation", sql.NVarChar(100), designation)
    .input("district", sql.NVarChar(sql.MAX), district)
    .query(`
      INSERT INTO operator_info (operatorName, operatorNumber, Designation, district)
      VALUES (@name, @number, @designation, @district);
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
  return result.recordset[0].id;
}

module.exports = { findId, insert };
