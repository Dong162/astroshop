-- Enable Row Level Security (optional, based on your current setup)
ALTER TABLE astro_vouchers ENABLE ROW LEVEL SECURITY;

-- Creating a policy that allows anyone (anon) to read the vouchers (so the checkout page can check if it's valid)
CREATE POLICY "Allow public select on astro_vouchers"
  ON astro_vouchers FOR SELECT
  USING (true);

-- Allow public to inert/update/delete (since admin uses anon key too)
CREATE POLICY "Allow public all on astro_vouchers"
  ON astro_vouchers FOR ALL
  USING (true)
  WITH CHECK (true);
