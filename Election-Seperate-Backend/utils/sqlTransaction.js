/**
 * Transaction / request-factory helpers around the shared MSSQL pool.
 *
 * The legacy SP had NO transaction — a mid-way failure could leave the booth,
 * boothhistory and ChangeCamera tables inconsistent. Every write path in this
 * module runs inside `withTransaction`, so any failure rolls back all of it.
 *
 * Repositories never see the pool or the transaction directly. They receive a
 * `makeRequest` factory that yields a *fresh* mssql Request each call (fresh so
 * that per-query `.input()` parameters never bleed across statements). The same
 * repository code therefore works transactionally (factory bound to a
 * Transaction) or for plain reads (factory bound to the pool).
 */

const sql = require("mssql");
const { getSqlConnection } = require("../config/sqlDatabase");

const PHASE = "phase1"; // Camera Mapping lives in the phase1 (patna2026) database.

/**
 * Run `work(makeRequest)` inside a single SQL transaction.
 * Commits on success, rolls back on any thrown error, and re-throws.
 * @param {(makeRequest: () => import('mssql').Request) => Promise<any>} work
 */
async function withTransaction(work) {
  const pool = await getSqlConnection(PHASE);
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  let committed = false;
  try {
    const makeRequest = () => new sql.Request(transaction);
    const result = await work(makeRequest);
    await transaction.commit();
    committed = true;
    return result;
  } catch (err) {
    if (!committed) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        // Surface the rollback failure alongside the original cause.
        console.error("Transaction rollback failed:", rollbackErr.message);
      }
    }
    throw err;
  }
}

/**
 * A request factory bound to the pool, for read-only queries with no transaction.
 * @returns {Promise<() => import('mssql').Request>}
 */
async function getReadFactory() {
  const pool = await getSqlConnection(PHASE);
  return () => pool.request();
}

module.exports = { withTransaction, getReadFactory, sql };
