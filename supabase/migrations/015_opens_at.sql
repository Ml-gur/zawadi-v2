-- 015_opens_at.sql
-- Some scholarships are announced before applications open. opens_at lets the
-- UI show "Opens in N days" instead of pretending an unopened award is live.
-- Idempotent.

ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS opens_at DATE;

CREATE INDEX IF NOT EXISTS idx_scholarships_opens_at ON scholarships(opens_at);

-- Keep the urgency trigger semantics unchanged: an award that has not opened
-- yet is not "Urgent" even if its deadline is near.
CREATE OR REPLACE FUNCTION compute_urgency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deadline IS NULL THEN
    NEW.urgency = 'TBA';
  ELSIF NEW.deadline < CURRENT_DATE THEN
    NEW.urgency = 'Expired';
  ELSIF NEW.opens_at IS NOT NULL AND NEW.opens_at > CURRENT_DATE THEN
    NEW.urgency = 'Upcoming';
  ELSIF NEW.deadline <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.urgency = 'Urgent';
  ELSIF NEW.deadline <= CURRENT_DATE + INTERVAL '60 days' THEN
    NEW.urgency = 'Warning';
  ELSE
    NEW.urgency = 'Normal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scholarships_urgency ON scholarships;
CREATE TRIGGER trg_scholarships_urgency
  BEFORE INSERT OR UPDATE OF deadline, opens_at ON scholarships
  FOR EACH ROW EXECUTE FUNCTION compute_urgency();
