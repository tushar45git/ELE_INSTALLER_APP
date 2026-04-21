const sql = require("mssql");

const phaseConfigs = {
  phase1: {
    user: "vmukti",
    password: "bhargav@123456",
    server: "20.244.18.133",
    database: "wbph12026",
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
  phase2: {
    user: "vmukti",
    password: "bhargav@123456",
    server: "135.235.218.6",
    database: "wbph22026",
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
};

const pools = new Map();

const getSqlConnection = async (phase) => {
  const config = phaseConfigs[phase];
  if (!config) {
    throw new Error(`Invalid phase: ${phase}`);
  }

  // Use the unique combination of server and database as the pool key
  const poolKey = `${config.server}_${config.database}`;

  if (pools.has(poolKey)) {
    return pools.get(poolKey);
  }

  const pool = new sql.ConnectionPool(config);
  const connectedPool = await pool.connect();
  pools.set(poolKey, connectedPool);
  return connectedPool;
};

module.exports = { getSqlConnection };
