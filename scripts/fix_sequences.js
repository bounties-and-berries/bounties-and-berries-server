const db = require('../config/knex');

const tables = ['user', 'bounty', 'user_bounty_participation', 'point_request'];

const fix = async () => {
    for (const table of tables) {
        try {
            const seqNameResult = await db.raw(`SELECT pg_get_serial_sequence('"${table}"', 'id') as seqname`);
            const seqName = seqNameResult.rows[0].seqname;
            if (seqName) {
                await db.raw(`SELECT setval('${seqName}', (SELECT COALESCE(MAX(id), 0) + 1 FROM "${table}"), false)`);
                console.log(`✅ Sequence ${seqName} for ${table} fixed.`);
            }
        } catch (e) {
            console.error(`❌ Error fixing sequence for ${table}:`, e.message);
        }
    }
    process.exit(0);
};

fix();
