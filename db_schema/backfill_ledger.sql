DO $$
DECLARE
  rec RECORD;
  u_acc_id BIGINT;
  rexp_acc_id BIGINT;
  spool_acc_id BIGINT;
  txn_id BIGINT;
BEGIN
  -- Insert missing accounts
  INSERT INTO ledger_account(type, user_id) 
  SELECT 'USER', id FROM "user" 
  ON CONFLICT DO NOTHING;

  SELECT id INTO rexp_acc_id FROM ledger_account WHERE code = 'REWARDS_EXPENSE';
  SELECT id INTO spool_acc_id FROM ledger_account WHERE code = 'SYSTEM_POOL';

  -- Bounties Earned -> Ledger
  FOR rec IN SELECT id, user_id, berries_earned, created_on FROM user_bounty_participation WHERE berries_earned > 0 AND status = 'completed' LOOP
    SELECT id INTO u_acc_id FROM ledger_account WHERE user_id = rec.user_id AND type = 'USER';
    
    INSERT INTO ledger_txn(idempotency_key, reference_type, reference_id, created_on)
    VALUES (gen_random_uuid(), 'BOUNTY', rec.id, rec.created_on) RETURNING id INTO txn_id;

    INSERT INTO ledger_entry(txn_id, account_id, direction, amount, created_on)
    VALUES (txn_id, u_acc_id, 1, rec.berries_earned, rec.created_on),
           (txn_id, rexp_acc_id, -1, rec.berries_earned, rec.created_on)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Point Requests Earned -> Ledger
  FOR rec IN SELECT id, student_id, berries_awarded, submission_date FROM point_request WHERE berries_awarded > 0 AND status = 'approved' LOOP
    SELECT id INTO u_acc_id FROM ledger_account WHERE user_id = rec.student_id AND type = 'USER';
    
    INSERT INTO ledger_txn(idempotency_key, reference_type, reference_id, created_on)
    VALUES (gen_random_uuid(), 'POINT_REQUEST', rec.id, rec.submission_date) RETURNING id INTO txn_id;

    INSERT INTO ledger_entry(txn_id, account_id, direction, amount, created_on)
    VALUES (txn_id, u_acc_id, 1, rec.berries_awarded, rec.submission_date),
           (txn_id, rexp_acc_id, -1, rec.berries_awarded, rec.submission_date)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Spends -> Ledger
  FOR rec IN SELECT id, user_id, berries_spent, created_on FROM user_reward_claim WHERE berries_spent > 0 LOOP
    SELECT id INTO u_acc_id FROM ledger_account WHERE user_id = rec.user_id AND type = 'USER';
    
    INSERT INTO ledger_txn(idempotency_key, reference_type, reference_id, created_on)
    VALUES (gen_random_uuid(), 'REWARD_CLAIM', rec.id, rec.created_on) RETURNING id INTO txn_id;

    INSERT INTO ledger_entry(txn_id, account_id, direction, amount, created_on)
    VALUES (txn_id, u_acc_id, -1, rec.berries_spent, rec.created_on),
           (txn_id, spool_acc_id, 1, rec.berries_spent, rec.created_on)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Update Balance Cache
  INSERT INTO user_balance(user_id, balance)
  SELECT 
    l.user_id, 
    COALESCE(SUM(le.direction * le.amount), 0)
  FROM ledger_account l
  JOIN ledger_entry le ON le.account_id = l.id
  WHERE l.type = 'USER'
  GROUP BY l.user_id
  ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;
END
$$;
