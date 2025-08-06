-- Dummy creator user for testing

INSERT INTO "user" (
    name,
    mobile,
    role_id,
    password,
    is_active,
    college_id,
    created_by,
    modified_by,
    img_url
) VALUES (
    'Creator User',
    '9000000011',
    4, -- role_id for creator
    '$2b$10$wH6Qw1Qw1Qw1Qw1Qw1QwOeQw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Q', -- bcrypt hash for 'creator@123'
    TRUE,
    1, -- college_id
    'system',
    'system',
    'http://example.com/creator.png'
); 