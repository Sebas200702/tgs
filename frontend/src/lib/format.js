/**
 * Format a Colombian peso amount with thousands separators.
 * 120000 -> "$ 120.000 COP"
 */
export function formatCOP(value, withSuffix = true) {
  if (value == null || isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
  return withSuffix ? `$ ${formatted} COP` : `$ ${formatted}`;
}
