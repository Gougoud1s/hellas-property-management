import { Assembly, MyDataTransmission, VoteChoice } from '../../featureTypes';
import { AuthUser } from '../auth';
import { supabase } from './client';

async function propertyUuid(code: string): Promise<string> {
  const { data, error } = await supabase.from('properties').select('id').eq('code', code).single();
  if (error) throw error;
  return data.id as string;
}

export async function loadAssemblies(): Promise<Assembly[]> {
  const { data, error } = await supabase.from('assemblies').select('*, properties(code), agenda_items(*, assembly_votes(voter_user_id, vote))').order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    propertyId: row.properties?.code ?? row.property_id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    status: row.status,
    quorumPercent: Number(row.quorum_percent),
    agendaItems: (row.agenda_items ?? []).sort((a: any, b: any) => a.order_index - b.order_index).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      votes: Object.fromEntries((item.assembly_votes ?? []).map((vote: any) => [vote.voter_user_id, vote.vote])),
    })),
  }));
}

export async function createAssembly(user: AuthUser, input: Pick<Assembly, 'propertyId' | 'title' | 'scheduledAt' | 'quorumPercent'>): Promise<Assembly> {
  const propertyId = await propertyUuid(input.propertyId);
  const { data: assembly, error } = await supabase.from('assemblies').insert({ tenant_id: user.tenantId, property_id: propertyId, title: input.title, scheduled_at: input.scheduledAt, status: 'draft', quorum_percent: input.quorumPercent }).select().single();
  if (error) throw error;
  const { data: agenda, error: agendaError } = await supabase.from('agenda_items').insert({ assembly_id: assembly.id, order_index: 0, title: 'Έγκριση ετήσιου απολογισμού', description: 'Έγκριση δαπανών και οικονομικού απολογισμού.' }).select().single();
  if (agendaError) throw agendaError;
  return { id: assembly.id, propertyId: input.propertyId, title: assembly.title, scheduledAt: assembly.scheduled_at, status: assembly.status, quorumPercent: Number(assembly.quorum_percent), agendaItems: [{ id: agenda.id, title: agenda.title, description: agenda.description ?? '', votes: {} }] };
}

export async function updateAssemblyStatus(id: string, status: Assembly['status']): Promise<void> {
  const { error } = await supabase.from('assemblies').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function castAssemblyVote(user: AuthUser, assemblyId: string, agendaItemId: string, vote: VoteChoice): Promise<void> {
  const { error } = await supabase.from('assembly_votes').upsert({ assembly_id: assemblyId, agenda_item_id: agendaItemId, voter_user_id: user.id, vote }, { onConflict: 'agenda_item_id,voter_user_id' });
  if (error) throw error;
}

export async function loadMyDataTransmissions(): Promise<MyDataTransmission[]> {
  const { data, error } = await supabase.from('mydata_transmissions').select('*, properties(code)');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.id, propertyId: row.properties?.code ?? row.property_id, period: row.period, status: row.status, mark: row.mark ?? undefined, transmittedAt: row.transmitted_at ?? undefined, errorMessage: row.error_message ?? undefined }));
}

export async function saveMyDataTransmission(user: AuthUser, record: MyDataTransmission): Promise<MyDataTransmission> {
  const propertyId = await propertyUuid(record.propertyId);
  const { data, error } = await supabase.from('mydata_transmissions').upsert({ tenant_id: user.tenantId, property_id: propertyId, period: record.period, status: record.status, mark: record.mark ?? null, transmitted_at: record.transmittedAt ?? null, error_message: record.errorMessage ?? null }, { onConflict: 'property_id,period' }).select().single();
  if (error) throw error;
  return { ...record, id: data.id };
}
