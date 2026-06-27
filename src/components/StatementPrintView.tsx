import { Property, Unit } from '../types';

export default function StatementPrintView({ property, unit }: { property: Property; unit: Unit }) {
  return <section className="statement-print">
    <header><div><strong>ATLAS PM</strong><span>Ειδοποιητήριο κοινοχρήστων</span></div><div>{property.period}</div></header>
    <h1>{property.name} · Μονάδα {unit.id}</h1><p>{property.address}</p>
    <table><tbody><tr><th>Προηγούμενο υπόλοιπο</th><td>{unit.prevBalance.toFixed(2)} €</td></tr><tr><th>Τρέχον πληρωτέο</th><td>{unit.balance.toFixed(2)} €</td></tr><tr className="total"><th>Σύνολο</th><td>{(unit.prevBalance + unit.balance).toFixed(2)} €</td></tr></tbody></table>
    <footer>Κωδικός πληρωμής: {property.id}-{unit.id} · Το παρόν δημιουργήθηκε ηλεκτρονικά.</footer>
  </section>;
}
