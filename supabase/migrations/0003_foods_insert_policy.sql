-- =====================================================
-- Allow authenticated users to insert into `foods`
-- =====================================================
-- Required for Phase 2c LLM fallback:
-- the lookup-food-via-ai edge function (running with the user's JWT)
-- inserts AI-generated food entries into the master DB so future searches
-- find them directly without re-calling the LLM.
--
-- Verified=false ensures these aren't shown as authoritative.
-- =====================================================

create policy "Authenticated users insert foods (LLM-generated)"
  on foods
  for insert
  to authenticated
  with check (
    source = 'llm'
    and verified = false
  );
