-- =============================================================================
-- DevDrift — Supabase PostgreSQL Schema
-- Migration: 00003_popularity_trigger.sql
-- Description: Adds a trigger to automatically update listings.popularity_score
--              when an interaction is created or deleted.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_listing_popularity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  score_change FLOAT := 0;
BEGIN
  -- Determine score impact based on interaction kind
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'save' THEN
      score_change := 5.0;
    ELSIF NEW.kind = 'view' THEN
      score_change := 1.0;
    END IF;

    UPDATE public.listings
    SET popularity_score = popularity_score + score_change
    WHERE id = NEW.listing_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'save' THEN
      score_change := -5.0;
    ELSIF OLD.kind = 'view' THEN
      score_change := -1.0;
    END IF;

    -- Ensure score doesn't drop below 0
    UPDATE public.listings
    SET popularity_score = GREATEST(popularity_score + score_change, 0)
    WHERE id = OLD.listing_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Attach trigger to interactions table
CREATE TRIGGER trigger_update_listing_popularity
AFTER INSERT OR DELETE ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_listing_popularity();
