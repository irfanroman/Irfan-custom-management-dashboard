/**
 * Utility functions for formatting and parsing Rupiah (IDR) currency
 */

/**
 * Formats a number into Rupiah format with thousand separators (dot)
 * Example: 10000 -> 10.000
 */
export const formatNumberToIDR = (amount: number): string => {
  if (isNaN(amount)) return '0';
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Formats a number into Rupiah with the 'Rp' prefix
 * Example: 10000 -> Rp 10.000
 */
export const toIDRCurrency = (amount: number): string => {
  return `Rp ${formatNumberToIDR(amount)}`;
};

/**
 * Parses a Rupiah string back into a numeric value
 * Example: "10.000" -> 10000
 */
export const parseIDRToNumber = (idrString: string): number => {
  if (!idrString) return 0;
  // Remove all non-numeric characters (except maybe minus sign if we allow it)
  const numericString = idrString.replace(/[^\d]/g, '');
  const parsed = parseInt(numericString, 10);
  return isNaN(parsed) ? 0 : parsed;
};
