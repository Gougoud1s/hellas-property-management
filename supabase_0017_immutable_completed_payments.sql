-- Completed payments are accounting history and cannot be edited or deleted.
-- Corrections must be represented by a separately auditable reversal workflow.
create or replace function public.prevent_completed_payment_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'Ολοκληρώθηκε' then
    raise exception 'Completed payments are immutable; post an auditable reversal instead';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists payment_ledger_completed_immutable on public.payment_ledger;
create trigger payment_ledger_completed_immutable
before update or delete on public.payment_ledger
for each row execute function public.prevent_completed_payment_mutation();
