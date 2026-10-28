// Market scope changes the message, never the seller's imported building.
export function projectMessageContext(lead, match, nearby = false) {
  if (nearby || match?.scope !== 'development') return { lead, projectWide: false };
  return { lead: { ...lead, building: match.name, resolvedBuilding: match.name }, projectWide: true };
}

export function projectMessageTemplate(template, projectWide) {
  if (!projectWide) return template;
  return template
    .replaceAll('{{building}}', '{{building}} (project-wide)')
    .replace(/\byour (?:building|tower|block)\b/gi, 'the development');
}
