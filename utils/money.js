// shared/utils/money.js  (owner: Jean, Accounting)
// Round every computed amount with round2(). Show money with peso(): ₱1,250.50

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

const pesoFormat = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function peso(n) {
  return "₱" + pesoFormat.format(round2(n || 0));
}
