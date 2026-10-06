// Trial duration is controlled by the server, never by the checkout caller.
export const TRIAL_PERIOD_DAYS = 7;

export function resolveTrialPeriodDays(input) {
  if (typeof input !== "number" || !Number.isInteger(input)) return null;
  if (input <= 0 || input > 30) return null;
  return TRIAL_PERIOD_DAYS;
}
