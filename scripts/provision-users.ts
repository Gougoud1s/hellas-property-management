import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const raw = process.env.PROVISION_USERS_JSON;
if (!url || !key || !raw) throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PROVISION_USERS_JSON are required');

const users = JSON.parse(raw) as Array<{ email: string; password: string; profileId: string; emailConfirmed?: boolean }>;
if (!Array.isArray(users) || !users.length) throw new Error('PROVISION_USERS_JSON must be a non-empty array');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

for (const candidate of users) {
  if (!candidate.email || candidate.password.length < 12 || !candidate.profileId) throw new Error(`Invalid provisioning entry for ${candidate.email || 'unknown user'}`);
  const email = String(candidate.email).toLowerCase();
  const { data: existingProfile, error: profileError } = await supabase.from('user_profiles').select('id,email').eq('id', candidate.profileId).single();
  if (profileError || existingProfile.email.toLowerCase() !== email) throw new Error(`Profile/email mismatch for ${candidate.email}`);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: candidate.email, password: candidate.password, email_confirm: candidate.emailConfirmed ?? true,
  });
  let authId = created.user?.id;
  if (createError) {
    const { data: page, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    authId = (page.users as Array<{ id: string; email?: string }>).find((user) => user.email?.toLowerCase() === email)?.id;
    if (!authId) throw createError;
  }
  const { error: linkError } = await supabase.from('user_profiles').update({ auth_user_id: authId }).eq('id', candidate.profileId);
  if (linkError) throw linkError;
  console.log(`Linked ${candidate.email} to profile ${candidate.profileId}`);
}
