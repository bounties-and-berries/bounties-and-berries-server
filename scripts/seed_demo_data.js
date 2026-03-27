const db = require('../config/knex');
const flagFixedSequences = async () => {
    const tables = ['user', 'bounty', 'user_bounty_participation', 'point_request'];
    for (const table of tables) {
        try {
            const seqNameResult = await db.raw(`SELECT pg_get_serial_sequence('"${table}"', 'id') as seqname`);
            const seqName = seqNameResult.rows[0].seqname;
            if (seqName) {
                await db.raw(`SELECT setval('${seqName}', (SELECT COALESCE(MAX(id), 0) + 1 FROM "${table}"), false)`);
            }
        } catch (e) {}
    }
};

const bcrypt = require('bcryptjs');

const seedDemoData = async () => {
  try {
    await flagFixedSequences();
    console.log('🌱 Starting demo data insertion with correct schema...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const studentData = [
      {
        name: 'Aarav Sharma', username: 'aarav_s', email: 'aarav@example.com', password: hashedPassword,
        role_id: 3, department: 'Computer Science', year: 2024, college_id: 1, is_active: true,
        mobilenumber: '9876543210', mobile: '9876543210'
      },
      {
        name: 'Priya Iyer', username: 'priya_i', email: 'priya@example.com', password: hashedPassword,
        role_id: 3, department: 'Engineering', year: 2023, college_id: 1, is_active: true,
        mobilenumber: '9876543211', mobile: '9876543211'
      },
      {
        name: 'Ishaan Gupta', username: 'ishaan_g', email: 'ishaan@example.com', password: hashedPassword,
        role_id: 3, department: 'Business', year: 2025, college_id: 1, is_active: true,
        mobilenumber: '9876543212', mobile: '9876543212'
      },
      {
        name: 'Ananya Verma', username: 'ananya_v', email: 'ananya@example.com', password: hashedPassword,
        role_id: 3, department: 'Arts', year: 2024, college_id: 1, is_active: true,
        mobilenumber: '9876543213', mobile: '9876543213'
      }
    ];

    for (const student of studentData) {
      const existing = await db('user').where('username', student.username).orWhere('email', student.email).first();
      if (!existing) {
        await db('user').insert(student);
        console.log(`✅ Student ${student.name} created.`);
      }
    }

    const students = await db('user').where('role_id', 3).select('id');

    const bountyData = [
      { name: 'Quantum Computing Intro', description: 'Basics of Qubits and Gates.', type: 'Academic', is_active: true, created_by: '1', alloted_points: 500, alloted_berries: 50 },
      { name: 'Hackathon 2024', description: '48hr build session.', type: 'Competition', is_active: true, created_by: '1', alloted_points: 1000, alloted_berries: 100 },
      { name: 'Green Campus Drive', description: 'Plantation and awareness.', type: 'Social', is_active: true, created_by: '1', alloted_points: 300, alloted_berries: 30 }
    ];

    for (const bounty of bountyData) {
      const existing = await db('bounty').where('name', bounty.name).first();
      if (!existing) {
        await db('bounty').insert(bounty);
        console.log(`✅ Bounty ${bounty.name} created.`);
      }
    }

    const bounties = await db('bounty').whereIn('name', bountyData.map(b => b.name)).select('id');
    
    for (const student of students) {
        for (const bounty of bounties) {
           const existingPart = await db('user_bounty_participation').where({ user_id: student.id, bounty_id: bounty.id }).first();
           if (!existingPart) {
              await db('user_bounty_participation').insert({
                user_id: student.id, bounty_id: bounty.id, points_earned: Math.floor(Math.random() * 500) + 200, berries_earned: Math.floor(Math.random() * 40) + 10,
                status: 'completed', created_by: '1'
              });
           }
        }

        const existingReq = await db('point_request').where('student_id', student.id).first();
        if (!existingReq) {
          await db('point_request').insert({
            student_id: student.id, activity_title: 'Voluntary Tech Support', category: 'Social',
            description: 'Helped juniors in lab.', activity_date: new Date(), proof_description: 'None',
            points_requested: 100, berries_requested: 10, points_awarded: 100, berries_awarded: 10,
            status: 'approved', created_by: '1'
          });
        }
    }

    console.log('🚀 Visual Demo data active!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding demo data:', err);
    process.exit(1);
  }
};

seedDemoData();
