const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS billing (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id    UUID REFERENCES patients(id) ON DELETE SET NULL,
  amount        NUMERIC(10, 2) NOT NULL,
  service_type  TEXT NOT NULL DEFAULT 'Consulta General',
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  payment_status TEXT NOT NULL DEFAULT 'pagado',
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'billing' AND policyname = 'Doctors can manage their own billing'
    ) THEN
        CREATE POLICY "Doctors can manage their own billing"
          ON billing FOR ALL
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
`;

async function main() {
    console.log("Creating billing table...");
    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error("Direct RPC failed. You must run the SQL manually in Supabase Dashboard:");
            console.error(sql);
        } else {
            console.log("Success.");
        }
    } catch (e) {
        console.error("RPC exec_sql probably doesn't exist. Run this in Supabase SQL editor:");
        console.log(sql);
    }
}
main();
