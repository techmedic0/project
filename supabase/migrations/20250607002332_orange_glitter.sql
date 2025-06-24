/*
  # Havenix Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches Supabase auth.users
      - `name` (text)
      - `email` (text, unique)
      - `role` (enum: student, landlord)
      - `phone` (text, nullable)
      - `is_verified` (boolean, default false)
      - `created_at` (timestamp)

    - `properties`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `location` (text)
      - `rooms_available` (integer)
      - `total_rooms` (integer)
      - `price` (integer) - monthly rent in Naira
      - `tier` (enum: low, mid, premium)
      - `reservation_fee` (integer) - unlock fee in Naira
      - `is_verified` (boolean, default false)
      - `images` (text array) - Supabase storage URLs
      - `video_url` (text, nullable)
      - `landlord_id` (uuid, foreign key to users)
      - `created_at` (timestamp)

    - `reservations`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to users)
      - `property_id` (uuid, foreign key to properties)
      - `payment_status` (enum: pending, paid, refunded)
      - `unlock_granted` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Students can read properties and manage their reservations
    - Landlords can manage their properties
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'landlord');
CREATE TYPE property_tier AS ENUM ('low', 'mid', 'premium');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  phone text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  rooms_available integer NOT NULL DEFAULT 1,
  total_rooms integer NOT NULL DEFAULT 1,
  price integer NOT NULL,
  tier property_tier NOT NULL DEFAULT 'mid',
  reservation_fee integer NOT NULL DEFAULT 5000,
  is_verified boolean DEFAULT false,
  images text[] DEFAULT '{}',
  video_url text,
  landlord_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_room_count CHECK (rooms_available <= total_rooms AND rooms_available >= 0),
  CONSTRAINT valid_price CHECK (price > 0),
  CONSTRAINT valid_reservation_fee CHECK (reservation_fee > 0)
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  payment_status payment_status DEFAULT 'pending',
  unlock_granted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, property_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Properties policies
CREATE POLICY "Anyone can read verified properties"
  ON properties
  FOR SELECT
  TO authenticated
  USING (is_verified = true);

CREATE POLICY "Landlords can read own properties"
  ON properties
  FOR SELECT
  TO authenticated
  USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can update own properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can delete own properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (landlord_id = auth.uid());

-- Reservations policies
CREATE POLICY "Students can read own reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert own reservations"
  ON reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own reservations"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_verified ON properties(is_verified);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
CREATE INDEX IF NOT EXISTS idx_reservations_student_id ON reservations(student_id);
CREATE INDEX IF NOT EXISTS idx_reservations_property_id ON reservations(property_id);

-- Create function to automatically decrease room availability when reservation is made
CREATE OR REPLACE FUNCTION handle_reservation_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrease availability if payment is successful and unlock is granted
  IF NEW.payment_status = 'paid' AND NEW.unlock_granted = true THEN
    UPDATE properties 
    SET rooms_available = rooms_available - 1 
    WHERE id = NEW.property_id AND rooms_available > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reservation insert
CREATE TRIGGER on_reservation_insert
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION handle_reservation_insert();

-- Create function to handle reservation updates (refunds)
CREATE OR REPLACE FUNCTION handle_reservation_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment status changes from paid to refunded, increase room availability
  IF OLD.payment_status = 'paid' AND NEW.payment_status = 'refunded' THEN
    UPDATE properties 
    SET rooms_available = rooms_available + 1 
    WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reservation update
CREATE TRIGGER on_reservation_update
  AFTER UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION handle_reservation_update();