import { getTranslator } from "@/i18n/server";
import { dayKey, formatDateTime, formatTime } from "@/lib/dates";
import { formatXAF } from "@/lib/money";
import type { AdminOrderView } from "@/server/services/order-views";
import { IconFlag } from "../Icons";
import { EmptyState, StatusChip } from "../ui";
import { orderRoute } from "./OrderRow";
import { Cell, Row, RowLink, Table } from "./Table";

/** Orders as a table. Rows with an open issue or a passed arrival time are tinted red. */
export async function OrdersTable({ orders }: { orders: AdminOrderView[] }) {
  const { t, tx, language } = await getTranslator();
  if (orders.length === 0) return <EmptyState>{t("orders.none")}</EmptyState>;
  return (
    <Table
      columns={[
        { label: t("table.order") },
        { label: t("table.route") },
        { label: t("table.sender"), className: "hidden lg:table-cell" },
        { label: t("table.price"), className: "hidden md:table-cell text-right" },
        { label: t("orders.status"), className: "hidden sm:table-cell" },
        { label: t("table.created"), className: "text-right" },
      ]}
    >
      {orders.map((order) => {
        const when = dayKey(new Date(order.createdAt)) === dayKey() ? formatTime(order.createdAt, language) : formatDateTime(order.createdAt, language);
        return (
          <Row key={order.id} tone={order.issue.open || order.etaPassed ? "bg-red-tint/60" : ""}>
            <Cell className="whitespace-nowrap tabular-nums">
              <RowLink href={`/orders/${order.id}`}>#{order.number}</RowLink>
              {order.issue.open && <IconFlag size={14} className="ml-1.5 inline text-red" />}
            </Cell>
            <Cell className="max-w-[320px]">
              <p className="truncate">{orderRoute(order, tx)}{order.goods.isSale ? ` · ${tx("summary.saleShort")}` : ""}</p>
              <p className="truncate text-xs text-muted lg:hidden">{order.sender.name}</p>
              <span className="mt-1 inline-flex sm:hidden"><StatusChip status={order.status} label={tx(`status.${order.status}`)} /></span>
            </Cell>
            <Cell className="hidden lg:table-cell">{order.sender.name}</Cell>
            <Cell className="hidden text-right whitespace-nowrap tabular-nums md:table-cell">{order.netPrice !== null ? formatXAF(order.netPrice) : "—"}</Cell>
            <Cell className="hidden sm:table-cell"><StatusChip status={order.status} label={tx(`status.${order.status}`)} /></Cell>
            <Cell className="text-right whitespace-nowrap text-muted tabular-nums">{when}</Cell>
          </Row>
        );
      })}
    </Table>
  );
}
