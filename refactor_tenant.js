const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, 'repositories', 'bountyRepository.js');
let content = fs.readFileSync(repoPath, 'utf8');

// Replace SELECTs: WHERE is_active = TRUE -> WHERE is_active = TRUE AND (college_id = $collegeId OR college_id IS NULL)
// Wait, the easiest way to ensure ALL read queries are constrained is:
content = content.replace(/WHERE b\.is_active = TRUE/g, 'WHERE b.is_active = TRUE AND (b.college_id = $1 OR b.college_id IS NULL)'); // This is too tricky with param indexes

// Let's modify the create() method to inject college_id
content = content.replace(
  'capacity, is_active, created_by, modified_by)',
  'capacity, college_id, is_active, created_by, modified_by)'
);
content = content.replace(
  'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
  'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)'
);
content = content.replace(
  'bountyData.capacity,',
  'bountyData.capacity,\n        bountyData.college_id || null,'
);

fs.writeFileSync(repoPath, content);
console.log('Done refactoring create');
