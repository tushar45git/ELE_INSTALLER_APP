const { getSqlConnection } = require('./config/sqlDatabase');

const checkSchema = async () => {
    try {
        const pool = await getSqlConnection('phase1');
        console.log('--- Phase 1 Schema (streamlist) ---');
        const result = await pool.request().query("SELECT TOP 1 * FROM streamlist");
        console.log('Columns:', Object.keys(result.recordset[0] || {}));
        
        console.log('\n--- Phase 1 Schema (booth) ---');
        const boothResult = await pool.request().query("SELECT TOP 1 * FROM booth");
        console.log('Columns:', Object.keys(boothResult.recordset[0] || {}));
        console.log('\n--- Sample Data (booth) ---');
        console.log(boothResult.recordset[0]);
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
};

checkSchema();
