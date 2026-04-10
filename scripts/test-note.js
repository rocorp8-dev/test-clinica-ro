const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNote() {
  const userId = '5f3f228e-851a-4604-9774-192e2798c13d';
  console.log('--- Testing AutoHeal for Carlos Perez ---')
  const { data: found } = await supabase.rpc('search_patients_nia', {
      search_query: '%carlos perez%',
      doctor_id: userId
  });
  console.log('Found:', found);
  
  if (!found || found.length === 0) return console.log('not found');
  
  const args = {
      subjetivo: "Dolor de cabeza",
      analisis: "Migraña",
      plan: "Descanso"
  };

  const patientId = found[0].id;
  const soapContent = `S: ${args.subjetivo || '-'}\nO: ${args.objetivo || '-'}\nA: ${args.analisis || '-'}\nP: ${args.plan || '-'}`;

  const { data, error } = await supabase
      .from('medical_notes')
      .insert([{
          patient_id: patientId,
          doctor_id: userId,
          diagnostico: soapContent
      }])
      .select('id, created_at')
      .single();
      
  console.log('Insert Error:', error);
  console.log('Insert Data:', data);
}

testNote();
