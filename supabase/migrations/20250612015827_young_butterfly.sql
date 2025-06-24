/*
  # Add detailed location field to properties

  1. Changes
    - Add `detailed_location` column to properties table
    - This field will only be visible after unlocking the property
    - Update existing properties to have a default detailed location

  2. Security
    - No changes to RLS policies needed as this follows existing access patterns
*/

-- Add detailed_location column to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'detailed_location'
  ) THEN
    ALTER TABLE properties ADD COLUMN detailed_location text;
  END IF;
END $$;

-- Update existing properties with a default detailed location
UPDATE properties 
SET detailed_location = COALESCE(detailed_location, location || ' - Exact address will be provided after verification')
WHERE detailed_location IS NULL;

-- Make detailed_location required for new properties
ALTER TABLE properties ALTER COLUMN detailed_location SET NOT NULL;