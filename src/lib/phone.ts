/**
 * Cameroon mobile numbers have 9 digits starting with 6.
 * Accepts "+237 677 12 34 56", "237677123456", "677-123-456"... and returns "677123456".
 * Returns null when the input is not a valid Cameroon mobile number.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("237")) {
    digits = digits.slice(3);
  }
  if (digits.length === 9 && digits.startsWith("6")) {
    return digits;
  }
  return null;
}

export function formatPhone(phone: string): string {
  if (phone.length !== 9) return phone;
  return `+237 ${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 7)} ${phone.slice(7)}`;
}

/** "237677123456", the format used by WhatsApp links. */
export function internationalPhone(phone: string): string {
  return `237${phone}`;
}

/** "+237 6•• •• 12 34", for places where the full number is not needed. */
export function maskPhone(phone: string): string {
  if (phone.length !== 9) return phone;
  return `+237 ${phone[0]}•• •• ${phone.slice(5, 7)} ${phone.slice(7)}`;
}
