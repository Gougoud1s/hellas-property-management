-- Demo seed for Hellas Property Management.
-- Run after supabase_0001_initial_schema.sql.
-- auth_user_id values are intentionally null; after creating Supabase Auth users,
-- update user_profiles.auth_user_id with the matching auth.users.id.

insert into public.tenants (id, slug, name, support_email, support_phone)
values
  ('10000000-0000-4000-8000-000000000001', 'hellas-property-management', 'Hellas Property Management', 'info@hellaspm.gr', '210-9993311'),
  ('10000000-0000-4000-8000-000000000002', 'north-block-management', 'North Block Management', 'support@northblock.gr', '2310-445500')
on conflict (id) do nothing;

insert into public.user_profiles (id, tenant_id, email, full_name, role, avatar_url, phone, job_title, status, notification_email, notification_sms)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'admin@hellaspm.gr', 'Γεώργιος Δημητρίου', 'company_admin', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6cwUSvLhqjWyORNMs4_PrjnQ0o0tjrvQ8vWREi0GvqlMPqr1iPLmnp2-DuMNZnbplKTKlp-2m9apWPQ4QXhyFa5h3kG0fHWvu_-CVWrH22RIVnXmJnnoMCfl_nwQUdpugVP161LsUJamC4F4zOxCovNfkdEmELt7CeVmMVrS8hMwKbbY6fan34iYqjYvoZkkwbM0HXDeZRiSLRjH9iCWNnKAZvSr6HmjL70Fp2vGxLQ7rIr25MmwBPLzVrcZ8sX5iUcqId-e4nSk', '210-9993311', 'Managing Partner', 'active', true, false),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'staff@hellaspm.gr', 'Μαρία Αντωνίου', 'company_staff', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80', '210-9993312', 'Operations Manager', 'active', true, true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'owner@example.gr', 'Ιωάννης Παπαδόπουλος', 'owner', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&q=80', '697-4000001', 'Ιδιοκτήτης Α1', 'active', true, false),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'resident@example.gr', 'Ανδρέας Νικολάου', 'resident', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&q=80', '697-4000002', 'Ένοικος B1', 'active', true, true)
on conflict (id) do nothing;

insert into public.tenant_registration_requests (id, company_name, contact_name, email, phone, city, properties_estimate, status)
values
  ('21000000-0000-4000-8000-000000000001', 'Athens Blocks ΙΚΕ', 'Σοφία Κωνσταντίνου', 'sofia@athensblocks.gr', '210-5533000', 'Αθήνα', 18, 'pending')
on conflict (id) do nothing;

insert into public.properties (id, tenant_id, code, name, address, period, status, dues, image_url, occupancy)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'ATH-0226', 'Athenian Court', 'Λεωφ. Κηφισίας 124, Αθήνα', 'Ιούνιος 2026', 'Draft', 2450.00, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMX7yo9BrjP_os2a0HHN8h25V-Fl19gQETGHgs0QPj2xlxqN4r-IhRhuZezdBdPLhuSy3AfLEpgSY_0-QFNS0AlP7HWzAyJfT5eG5wbqc-wb4McvXqs0m47VporD6P5bdvgkPSTrVhe1FL2oMskGFtR6G55ppU9wZQDFTiUSYXXaLnuqfisWJFCJ1h0LLNeX4KCagZmFnDsQc1GUTd7Q05FBBXaVVCKpnv0m4RWfFcl--_INejTCKeVJdOjzF9Du3YpdNOy3RAwOk', 100),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'MAR-0118', 'Marina Residences', 'Ποσειδώνος 45, Γλυφάδα', 'Ιούνιος 2026', 'Published', 420.00, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80', 94),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'PEF-0332', 'Pefki Heights', 'Αγίου Όρους 12, Πεύκη', 'Ιούνιος 2026', 'Published', 1120.50, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80', 100),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'PAN-0412', 'Panorama Plaza', 'Β. Όλγας 210, Θεσσαλονίκη', 'Μάιος 2026', 'Published', 0.00, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', 83)
on conflict (id) do nothing;

insert into public.units (id, tenant_id, property_id, code, floor, type, size, share, coefficient, owner_name, owner_phone, owner_email, resident_name, resident_type, status, balance, prev_balance, deposit)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'A1', '1ος', 'Διαμέρισμα', 85.40, 120.00, 1.00, 'Παπαδόπουλος Ιωάννης', '210-98213XX', 'i.papadopoulos@email.gr', 'Παπαδόπουλος Ι.', 'Ιδιοκατοίκηση', 'Ενεργό', 124.50, 0.00, 250.00),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'A2', '1ος', 'Διαμέρισμα', 85.40, 120.00, 1.00, 'Παππάς Νικόλαος', '210-91123XX', 'n.pappas@email.com', 'Παππάς Νικόλαος', 'Ιδιοκατοίκηση', 'Ενεργό', 0.00, 0.00, 250.00),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'B1', '2ος', 'Διαμέρισμα', 85.40, 120.00, 1.00, 'Καραμανλή Ελένη', '210-94432XX', 'e.kar@email.com', 'Νικολάου Ανδρέας', 'Ενοικιαστής', 'Ενεργό', 270.40, 150.00, 250.00),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'C2', '3ος', 'Διαμέρισμα', 120.00, 330.00, 1.00, 'Κώστα Ελένη', null, null, 'Κώστα Ελένη', 'Ιδιοκατοίκηση', 'Ενεργό', 44.80, 0.00, 380.00),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'P1', 'Ισόγειο', 'Parking', 12.50, 0.00, 1.00, 'Παπαδόπουλος Ιωάννης', null, null, '', 'Κενό', 'Ενεργό', 0.00, 0.00, 0.00)
on conflict (id) do nothing;

insert into public.user_unit_access (user_profile_id, unit_id)
values
  ('20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.expenses (tenant_id, property_id, expense_date, supplier, category, amount, file_name, status)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-06-12', 'CleanX', 'Καθαριότητα', 240.00, 'clean_inv_12.pdf', 'Verified'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-06-15', 'LiftService', 'Συντήρηση Ασανσέρ', 180.00, null, 'Draft'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-06-18', 'Κηπουρός (Papadakis)', 'Κηπουρός', 120.00, 'rec_gard_06.jpg', 'Verified');

insert into public.distribution_rules (tenant_id, property_id, category, method, sample_amount, description)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Γενικά', 'Χιλιοστά', 100.00, 'Οι γενικές δαπάνες κατανέμονται αναλογικά σε όλα τα διαμερίσματα βάσει των γενικών χιλιοστών συνδιοκτησίας.'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Ασανσέρ', 'Χιλιοστά', 100.00, 'Η δαπάνη Ασανσέρ κατανέμεται αναλογικά στις συμμετέχουσες μονάδες βάσει των καταχωρημένων χιλιοστών. Οι μονάδες ισογείου εξαιρούνται βάσει καταστατικού.'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Καθαριότητα', 'Βάσει Ατόμων', 180.00, 'Οι δαπάνες καθαρισμού κοινόχρηστων χώρων κατανέμονται ανάλογα με τον αριθμό των μόνιμων κατοίκων κάθε διαμερίσματος.')
on conflict (property_id, category) do nothing;

insert into public.issues (tenant_id, property_id, unit_id, title, severity, status, reported_at, estimate, technician, progress)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null, 'Διαρροή στον κήπο', 'High', 'New', 'Πριν από 2 ώρες', 150.00, 'Garden Solutions', null),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Απόφραξη κεντρικής στήλης', 'Urgent', 'In Progress', 'Σε εξέλιξη (1ω)', 220.00, 'Papamichael Plumbing', 65);

insert into public.bank_transactions (tenant_id, property_id, transaction_date, amount, bank, reference, description, suggested_unit_id, suggested_owner)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-06-22', 124.50, 'ALPHA BANK', '902341XX', 'ΚΑΤΑΘΕΣΗ ΚΟΙΝΟΧΡΗΣΤΩΝ A1 PAPADOPOULOS', '40000000-0000-4000-8000-000000000001', 'Παπαδόπουλος Ιωάννης'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-06-21', 270.40, 'EUROBANK', 'EB7721', 'METAΦΟΡΑ ΚΟΙΝΟΧΡΗΣΤΩΝ B1 KARAMANLI', '40000000-0000-4000-8000-000000000003', 'Καραμανλή Ελένη');

insert into public.payment_ledger (tenant_id, property_id, unit_id, paid_at, payer, payment_code, amount, method, match_type, status)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '2026-06-20', 'Νικόλαος Σταύρου', 'PYM-8822-X1', 245.50, 'Τράπεζα', 'ΑΥΤΟΜΑΤΗ', 'Ολοκληρώθηκε'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', '2026-06-19', 'Ελένη Κώστα', 'PYM-7712-B2', 120.00, 'Μετρητά', 'ΧΕΙΡΟΚΙΝΗΤΗ', 'Υπό έγκριση');

insert into public.documents (tenant_id, property_id, name, document_date, type, visibility, size, storage_path)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Συμβόλαιο Ανελκυστήρα 2026', '2026-05-12', 'Σύμβαση', 'Μόνο Εταιρεία', '1.2 MB', null),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Τιμολόγιο ΕΥΔΑΠ - Ιούνιος 2026', '2026-06-05', 'Παραστατικό', 'Ιδιοκτήτες', '420 KB', null),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Πρακτικά Γενικής Συνέλευσης', '2026-05-28', 'Πρακτικά', 'Όλοι', '2.4 MB', null);
