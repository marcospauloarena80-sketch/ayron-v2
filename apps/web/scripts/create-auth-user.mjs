import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rhwhveioyjpbjyvngdnn.supabase.co',
  'sb_secret_MzCKgQzkULmtY2vSbjDqdw_5S47GiPE',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@ayron.health',
  password: 'Ayron@Admin2025!',
  email_confirm: true,
  user_metadata: {
    name: 'Dr. Marcos (Admin)',
    role: 'MASTER',
    clinic_id: 'clinic-1',
    unit: 'Clínica Barra',
  },
});

if (error) console.error('Error:', error.message);
else console.log('User created:', data.user.id, data.user.email);
