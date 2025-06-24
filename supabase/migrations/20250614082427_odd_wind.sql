/*
  # Update reservation fee calculation

  1. Changes
    - Update existing properties to use dynamic reservation fee calculation
    - The reservation fee should be 1% of individual space rent (total_rent / total_rooms * 0.01)
    - This ensures fair pricing based on actual space value

  2. Security
    - No changes to RLS policies needed
*/

-- Update existing properties with calculated reservation fees
UPDATE properties 
SET reservation_fee = ROUND((price::numeric / total_rooms::numeric) * 0.01)
WHERE total_rooms > 0;

-- Add a constraint to ensure reservation fee is calculated correctly for new properties
-- This will be enforced at the application level since we can't easily add a computed column constraint