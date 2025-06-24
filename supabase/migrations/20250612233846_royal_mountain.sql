/*
  # Fix RLS policies and add sample data

  1. Changes
    - Update RLS policies to be less restrictive for testing
    - Add sample properties for testing
    - Ensure proper access for both authenticated and anonymous users

  2. Security
    - Temporarily allow broader access for debugging
    - Will be tightened after confirming functionality
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can read verified properties" ON properties;
DROP POLICY IF EXISTS "Landlords can read own properties" ON properties;

-- Create more permissive policies for testing
CREATE POLICY "Anyone can read all properties"
  ON properties
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow landlords to manage their properties
CREATE POLICY "Landlords can manage own properties"
  ON properties
  FOR ALL
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Update users policies to be more permissive
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Update reservations policies
DROP POLICY IF EXISTS "Students can read own reservations" ON reservations;
CREATE POLICY "Students can read reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Insert sample data if no properties exist
DO $$
BEGIN
  -- Check if any properties exist
  IF NOT EXISTS (SELECT 1 FROM properties LIMIT 1) THEN
    -- Create a sample landlord user first (this would normally be created through signup)
    INSERT INTO users (id, name, email, role, phone, is_verified) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Sample Landlord', 'landlord@example.com', 'landlord', '+2348012345678', true)
    ON CONFLICT (id) DO NOTHING;

    -- Insert sample properties
    INSERT INTO properties (
      title, 
      description, 
      location, 
      detailed_location,
      rooms_available, 
      total_rooms, 
      price, 
      tier, 
      reservation_fee, 
      is_verified, 
      images, 
      landlord_id
    ) VALUES 
    (
      'Modern 2-Bedroom Apartment Near LASU',
      'Beautiful and spacious 2-bedroom apartment with modern amenities, located just 5 minutes walk from LASU main gate. Features include 24/7 electricity, running water, security, and parking space.',
      'Near LASU, Ojo',
      'No. 15 University Road, Opposite LASU Main Gate, Ojo, Lagos State. Landmark: Blue building next to First Bank.',
      3,
      4,
      180000,
      'mid',
      5000,
      true,
      ARRAY['https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg', 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'],
      '00000000-0000-0000-0000-000000000001'
    ),
    (
      'Luxury Studio Apartment Near UNILAG',
      'Premium studio apartment with all modern amenities. Perfect for students who want comfort and style. Located in a secure estate with 24/7 security.',
      'Near UNILAG, Akoka',
      'Block 5, Flat 12, University View Estate, Akoka Road, Lagos. Opposite UNILAG Staff Quarters.',
      2,
      3,
      250000,
      'premium',
      7500,
      true,
      ARRAY['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg', 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg'],
      '00000000-0000-0000-0000-000000000001'
    ),
    (
      'Budget-Friendly Shared Room Near OAU',
      'Affordable shared accommodation perfect for budget-conscious students. Clean, safe, and well-maintained with basic amenities.',
      'Near OAU, Ile-Ife',
      'House 23, Student Village, Behind OAU Teaching Hospital, Ile-Ife, Osun State.',
      5,
      6,
      80000,
      'low',
      3000,
      true,
      ARRAY['https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg', 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'],
      '00000000-0000-0000-0000-000000000001'
    );
    
    RAISE NOTICE 'Sample properties inserted successfully';
  ELSE
    RAISE NOTICE 'Properties already exist, skipping sample data insertion';
  END IF;
END $$;