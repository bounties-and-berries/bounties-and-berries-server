-- Dummy users for the "user" table

-- Assume role_id 1 = admin, 2 = faculty, 3 = student
-- Assume college_id 1 = College A, 2 = College B

INSERT INTO "user" (name, mobile, role_id, password, is_active, college_id, img_url, created_by, modified_by)
VALUES
('Admin User', '9000000001', 1, '$2b$10$dummyhashforadmin', TRUE, 1, 'http://example.com/admin.png', 'system', 'system'),
('Faculty User', '9000000002', 2, '$2b$10$dummyhashforfaculty', TRUE, 1, 'http://example.com/faculty.png', 'system', 'system'),
('Student User 1', '9000000003', 3, '$2b$10$dummyhashforstudent1', TRUE, 2, 'http://example.com/student1.png', 'system', 'system'),
('Student User 2', '9000000004', 3, '$2b$10$dummyhashforstudent2', TRUE, 2, 'http://example.com/student2.png', 'system', 'system');