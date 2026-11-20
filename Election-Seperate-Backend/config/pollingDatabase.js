/**
 * Connection to the "polling" MongoDB database (camera master, camera
 * mappings, district/assembly list, operators, history). It replaces the old
 * SQL Server database.
 *
 * It uses the same cluster as DB_URI and only switches the database name, which
 * comes from POLLING_DB_NAME (default "polling"). The connection is created
 * lazily on first use, so config.env is already loaded by then.
 */

const mongoose = require("mongoose");

let connection = null;

function getPollingConnection() {
  if (connection) return connection;

  const uri = process.env.POLLING_DB_URI || process.env.DB_URI;
  const dbName = process.env.POLLING_DB_NAME || "polling";
  if (!uri) throw new Error("DB_URI is not set; cannot connect to polling DB");

  connection = mongoose.createConnection(uri, { dbName });
  connection.on("connected", () =>
    console.log(`✅ Polling MongoDB connected: ${dbName}`),
  );
  connection.on("error", (err) =>
    console.error(`❌ Polling MongoDB error: ${err.message}`),
  );
  return connection;
}

/**
 * Run `work(session)` inside a MongoDB transaction: commits on success and
 * rolls everything back if it throws.
 */
async function withPollingTransaction(work) {
  const session = await getPollingConnection().startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { getPollingConnection, withPollingTransaction };
