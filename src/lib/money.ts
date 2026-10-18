// All amounts are whole XAF integers.

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}

export function formatXAF(amount: number): string {
  return `${formatAmount(amount)} XAF`;
}

/** Discount for registered users. The rate is a fraction, e.g. 0.05 for 5%. */
export function computePrice(gross: number, rate: number, registered: boolean) {
  const appliedRate = registered && rate > 0 ? rate : 0;
  const discountAmount = Math.round(gross * appliedRate);
  return { discountRate: appliedRate, discountAmount, netPrice: gross - discountAmount };
}

export function percent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}
