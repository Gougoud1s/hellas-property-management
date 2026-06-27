export type TransmissionStatus = 'draft' | 'transmitted' | 'cancelled' | 'error';

export interface MyDataTransmission {
  id: string;
  propertyId: string;
  period: string;
  status: TransmissionStatus;
  mark?: string;
  transmittedAt?: string;
  errorMessage?: string;
}

export type AssemblyStatus = 'draft' | 'open' | 'closed';
export type VoteChoice = 'yes' | 'no' | 'abstain';

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  votes: Record<string, VoteChoice>;
}

export interface Assembly {
  id: string;
  propertyId: string;
  title: string;
  scheduledAt: string;
  status: AssemblyStatus;
  quorumPercent: number;
  agendaItems: AgendaItem[];
}
