-- Dummy data for user_bounty_participation

INSERT INTO user_bounty_participation
(user_id, bounty_id, points_earned, berries_earned, status, created_by, modified_by)
VALUES
(5, 4, 100, 10, 'completed', 'system', 'system'),   -- Admin User, Unique Bounty9
(6, 11, 80, 8, 'in_progress', 'system', 'system'),   -- Faculty User, Unique Bounty21
(7, 12, 50, 5, 'completed', 'system', 'system'),     -- Student User 1, Test Bounty22
(8, 13, 0, 0, 'not_started', 'system', 'system'),    -- Student User 2, Test Bounty23
(7, 14, 60, 6, 'completed', 'system', 'system'),     -- Student User 1, Test Bounty24
(8, 15, 30, 3, 'in_progress', 'system', 'system'),   -- Student User 2, Test Bounty25
(5, 16, 90, 9, 'completed', 'system', 'system'),     -- Admin User, Test Bounty26
(6, 17, 70, 7, 'completed', 'system', 'system'),     -- Faculty User, Test Bounty27
(7, 18, 40, 4, 'in_progress', 'system', 'system'),   -- Student User 1, Test Bounty28
(8, 19, 20, 2, 'not_started', 'system', 'system'),   -- Student User 2, Test Bounty29
(5, 20, 100, 10, 'completed', 'system', 'system'),   -- Admin User, Test Bounty30
(6, 21, 80, 8, 'completed', 'system', 'system'),     -- Faculty User, Test Bounty55
(7, 23, 60, 6, 'completed', 'system', 'system'),     -- Student User 1, Test Bounty556
(8, 10, 30, 3, 'in_progress', 'system', 'system'),   -- Student User 2, Unique Bounty1
(5, 25, 90, 9, 'completed', 'system', 'system'),     -- Admin User, Test Bounty557
(6, 26, 70, 7, 'completed', 'system', 'system');     -- Faculty User, Test Bounty558 