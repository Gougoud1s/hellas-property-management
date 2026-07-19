import { Property, Unit } from '../types';
import { GeneratedStatement } from '../lib/calculationCore';

export default function StatementPrintView({ property, unit, statement }: { property: Property; unit: Unit; statement?: GeneratedStatement }) {
  const previousBalance = statement?.previousBalance ?? unit.prevBalance;
  const currentCharges = statement?.currentCharges ?? Math.max(0, unit.balance - unit.prevBalance);
  const totalDue = statement?.totalDue ?? unit.balance;
  return <section className="statement-print">
    <header><div><strong>ATLAS PM</strong><span>Ειδοποιητήριο κοινοχρήστων</span></div><div>{property.period}</div></header>
    <h1>{property.name} · Μονάδα {unit.id}</h1><p>{property.address}</p>
    <table><tbody><tr><th>Προηγούμενο υπόλοιπο</th><td>{previousBalance.toFixed(2)} €</td></tr><tr><th>Τρέχουσα χρέωση</th><td>{currentCharges.toFixed(2)} €</td></tr><tr className="total"><th>Σύνολο πληρωτέο</th><td>{totalDue.toFixed(2)} €</td></tr></tbody></table>
    <footer>Κωδικός πληρωμής: {property.id}-{unit.id} · Το παρόν δημιουργήθηκε ηλεκτρονικά.</footer>
  </section>;
}
