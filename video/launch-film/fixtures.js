// Demo data for the launch film. Seller names and phone numbers are fictional;
// building names are real Downtown Dubai towers used as context only.
const due = (id, name, building, bedroom, unit, status, statusLabel) => ({
  id, name, building, resolvedBuilding: building, bedroom, unit,
  phone: `+971 50 555 01${id.slice(-2)}`,
  statusRule: { id: status }, statusLabel,
  dueLabel: 'Due today', isDue: true,
  dataQuality: { level: 'trusted' },
});

export const SELLERS = [
  due('s-01', 'Sara Haddad', 'Act One', '2', '1204', 'for_sale_available', 'For sale'),
  due('s-02', 'James Whitmore', 'Boulevard Point', '1', '905', 'prospect', 'Prospect'),
  due('s-03', 'Aisha Al Mansoori', 'Burj Vista 1', '3', '2201', 'market_appraisal', 'Appraisal'),
  due('s-04', 'Daniel Okafor', 'Opera Grand', '2', '1703', 'prospect', 'Prospect'),
  due('s-05', 'Priya Nair', 'Forte 1', '1', '612', 'for_sale_available', 'For sale'),
  due('s-06', 'Omar Khalil', 'The St. Regis Residences', '2', '3108', 'market_appraisal', 'Appraisal'),
];

export const insightFor = (lead) => ({ status: 'ready', hasTodaysTransactions: true, recentTransactions: [{}], locationName: lead.building });

export const COUNTS = { due: 24, scheduled: 118 };
