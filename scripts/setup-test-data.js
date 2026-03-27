const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function setupTestData() {
  const client = await pool.connect();

  try {
    console.log('🔄 Setting up test data for API testing...\n');

    // 1. Create roles
    console.log('📝 Creating roles...');
    await client.query(`
      INSERT INTO role (id, name) VALUES 
      (1, 'admin'),
      (2, 'faculty'), 
      (3, 'student')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Create colleges
    console.log('🏫 Creating colleges...');
    await client.query(`
      INSERT INTO college (id, name, location, berries_purchased, is_active) VALUES 
      (1, 'Test University', 'Test City', 1000, true),
      (2, 'Demo College', 'Demo City', 500, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Create test users with hashed passwords
    console.log('👥 Creating test users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const facultyPassword = await bcrypt.hash('faculty123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    await client.query(`
      INSERT INTO "user" (id, username, mobilenumber, name, mobile, role_id, password, is_active, college_id, created_on) VALUES 
      (1, 'admin', '1234567890', 'Admin User', '1234567890', 1, $1, true, 1, CURRENT_TIMESTAMP),
      (2, 'faculty1', '1234567891', 'Faculty One', '1234567891', 2, $2, true, 1, CURRENT_TIMESTAMP),
      (3, 'faculty2', '1234567892', 'Faculty Two', '1234567892', 2, $3, true, 2, CURRENT_TIMESTAMP),
      (4, 'student1', '1234567893', 'Student One', '1234567893', 3, $4, true, 1, CURRENT_TIMESTAMP),
      (5, 'student2', '1234567894', 'Student Two', '1234567894', 3, $5, true, 1, CURRENT_TIMESTAMP),
      (6, 'student3', '1234567895', 'Student Three', '1234567895', 3, $6, true, 2, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `, [adminPassword, facultyPassword, facultyPassword, studentPassword, studentPassword, studentPassword]);

    // 4. Create test bounties
    console.log('🎯 Creating test bounties...');
    await client.query(`
      INSERT INTO bounty (id, name, description, type, alloted_points, alloted_berries, capacity, is_active, created_on) VALUES 
      (1, 'Web Development Challenge', 'Build a responsive website', 'technical', 100, 50, 10, true, CURRENT_TIMESTAMP),
      (2, 'Data Science Project', 'Analyze dataset and create insights', 'technical', 150, 75, 5, true, CURRENT_TIMESTAMP),
      (3, 'Community Service', 'Volunteer for local charity', 'community', 80, 40, 20, true, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5. Create test rewards
    console.log('🏆 Creating test rewards...');
    await client.query(`
      INSERT INTO reward (id, name, description, berries_required, expiry_date, created_on) VALUES 
      (1, 'Coffee Voucher', 'Free coffee from campus cafe', 25, CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP),
      (2, 'Book Store Credit', '$10 credit at university bookstore', 50, CURRENT_TIMESTAMP + INTERVAL '60 days', CURRENT_TIMESTAMP),
      (3, 'Lunch Voucher', 'Free lunch at campus cafeteria', 40, CURRENT_TIMESTAMP + INTERVAL '45 days', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Create test bounty participations
    console.log('🤝 Creating test participations...');
    await client.query(`
      INSERT INTO user_bounty_participation (id, user_id, bounty_id, points_earned, berries_earned, status, created_on) VALUES 
      (1, 4, 1, 100, 50, 'completed', CURRENT_TIMESTAMP),
      (2, 5, 1, 100, 50, 'completed', CURRENT_TIMESTAMP),
      (3, 6, 2, 150, 75, 'in_progress', CURRENT_TIMESTAMP),
      (4, 4, 3, 80, 40, 'pending', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Create test reward claims
    console.log('💰 Creating test reward claims...');
    await client.query(`
      INSERT INTO user_reward_claim (id, user_id, reward_id, berries_spent, redeemable_code, created_on) VALUES 
      (1, 4, 1, 25, 'COFFEE001', CURRENT_TIMESTAMP),
      (2, 5, 2, 50, 'BOOK001', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Create test point requests
    console.log('📊 Creating test point requests...');
    await client.query(`
      INSERT INTO point_request (id, student_id, faculty_id, activity_title, category, description, activity_date, proof_description, points_requested, berries_requested, status, created_on) VALUES 
      (1, 4, 2, 'Extra Credit Project', 'academic', 'Submitted extra credit project for advanced algorithms', CURRENT_DATE, 'Project submission proof', 50, 25, 'draft', CURRENT_TIMESTAMP),
      (2, 5, 2, 'Research Paper', 'research', 'Published research paper in conference', CURRENT_DATE, 'Publication certificate', 75, 35, 'approved', CURRENT_TIMESTAMP),
      (3, 6, 3, 'Workshop Attendance', 'learning', 'Attended machine learning workshop', CURRENT_DATE, 'Workshop completion certificate', 60, 30, 'draft', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Create berry rules
    console.log('🫐 Creating berry rules...');
    await client.query(`
      INSERT INTO berry_rules (id, name, category, points, max_per_semester, auto_grant, is_active, created_on) VALUES 
      (1, 'Academic Excellence', 'academic', 100, 500, true, true, CURRENT_TIMESTAMP),
      (2, 'Community Service', 'community', 50, 200, false, true, CURRENT_TIMESTAMP),
      (3, 'Research Contribution', 'research', 150, NULL, false, true, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Create berry purchases
    console.log('💳 Creating berry purchases...');
    await client.query(`
      INSERT INTO berry_purchases (id, admin_id, quantity, payment_ref, status, created_on) VALUES 
      (1, 1, 1000, 'PAY-123456789', 'completed', CURRENT_TIMESTAMP),
      (2, 1, 500, 'PAY-987654321', 'pending', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('\n✅ Test data setup completed successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('   👑 Admin: username="admin", password="admin123"');
    console.log('   🎓 Faculty 1: username="faculty1", password="faculty123"');
    console.log('   🎓 Faculty 2: username="faculty2", password="faculty123"');
    console.log('   🎒 Student 1: username="student1", password="student123"');
    console.log('   🎒 Student 2: username="student2", password="student123"');
    console.log('   🎒 Student 3: username="student3", password="student123"');

    console.log('\n📊 Test Data Summary:');
    console.log('   • 3 Roles, 2 Colleges, 6 Users');
    console.log('   • 3 Bounties, 3 Rewards');
    console.log('   • 4 Participations, 2 Claims, 3 Point Requests');
    console.log('   • 3 Berry Rules, 2 Berry Purchases');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  setupTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupTestData;