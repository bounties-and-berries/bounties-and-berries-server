const pool = require('./config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting migration...');

    // 1. Create notifications table
    console.log('🔔 Creating notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add notification settings and leveling to user table
    console.log('👤 Updating user table with settings and leveling...');
    await client.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS department VARCHAR(255),
      ADD COLUMN IF NOT EXISTS year INTEGER;
    `);

    // 3. Add achievement table
    console.log('🏅 Creating achievements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        points_required INTEGER DEFAULT 0,
        type VARCHAR(50) DEFAULT 'milestone'
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      );
    `);

    // 4. Seed some achievements if table is empty
    const checkAchievements = await client.query('SELECT COUNT(*) FROM achievements');
    if (parseInt(checkAchievements.rows[0].count) === 0) {
      console.log('🌱 Seeding achievements...');
      await client.query(`
        INSERT INTO achievements (name, description, icon, points_required, type) VALUES
        ('Bronze Bounty Hunter', 'Complete 5 bounties', 'trophy', 500, 'bounty'),
        ('Silver Bounty Hunter', 'Complete 10 bounties', 'trophy', 1000, 'bounty'),
        ('Gold Bounty Hunter', 'Complete 25 bounties', 'trophy', 2500, 'bounty'),
        ('Academic Star', 'Earn 500 points from academic activities', 'star', 500, 'academic'),
        ('Community Hero', 'Earn 500 points from community service', 'heart', 500, 'community');
      `);
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
