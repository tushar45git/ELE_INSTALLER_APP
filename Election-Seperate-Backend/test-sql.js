const { getSqlConnection } = require('./config/sqlDatabase');

const testConnections = async () => {
    const phases = ['phase1', 'phase2', 'phase3'];
    
    for (const phase of phases) {
        process.stdout.write(`Testing ${phase}... `);
        try {
            const pool = await getSqlConnection(phase);
            const result = await pool.request().query('SELECT 1 as result');
            if (result.recordset && result.recordset[0].result === 1) {
                console.log('✅ OK');
            } else {
                console.log('❌ Unexpected result');
            }
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
    process.exit(0);
};

testConnections();
