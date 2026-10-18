import type { FeeTiming, GoodsStatus, IntercityMode, OrderType, PaymentMethod } from "./constants";
import { formatXAF } from "./money";

export type SummaryInput = {
  type: OrderType;
  intercityMode: IntercityMode | null;
  destinationCityName: string;
  goods: { isSale: boolean; status: GoodsStatus | null; amount: number };
  fee: { timing: FeeTiming; method: PaymentMethod };
};

type Tx = (key: string, values?: Record<string, string | number>) => string;

/**
 * Plain-language summary of the sender's answers, shown to the admin at the top of each order,
 * e.g. "Local sale. Receiver pays 15,000 XAF for the goods on delivery. Receiver pays the delivery fee on delivery (cash)."
 */
export function orderSummary(order: SummaryInput, tx: Tx): string {
  const parts: string[] = [];
  const sale = order.goods.isSale ? "sale" : "parcel";
  if (order.type === "local") parts.push(tx(`summary.local.${sale}`));
  else if (order.intercityMode === "collect_at_agency") parts.push(tx(`summary.collect.${sale}`, { city: order.destinationCityName }));
  else parts.push(tx(`summary.toAddress.${sale}`, { city: order.destinationCityName }));

  if (order.goods.isSale && order.goods.status === "receiver_pays") parts.push(tx("summary.goodsReceiverPays", { amount: formatXAF(order.goods.amount) }));
  if (order.goods.isSale && order.goods.status === "already_paid") parts.push(tx("summary.goodsAlreadyPaid"));

  parts.push(tx(`summary.fee.${order.fee.timing}`, { method: tx(`method.${order.fee.method}`) }));
  return parts.join(" ");
}

/** "Confirm with receiver first": not a sale and the receiver pays the delivery fee. */
export function needsReceiverConfirmation(isSale: boolean, timing: FeeTiming): boolean {
  return !isSale && timing === "delivery";
}
