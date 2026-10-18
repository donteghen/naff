import type { OrderStatus } from "@/lib/constants";
import { formatTime } from "@/lib/dates";
import { hasReached } from "@/lib/order-steps";
import { IconCheck } from "../Icons";

/** Vertical journey: passed steps in navy with a check, the current one in amber, the rest dashed. */
export function Timeline({
  steps,
  status,
  times,
  language,
  labelFor,
  nowLabel,
}: {
  steps: OrderStatus[];
  status: OrderStatus;
  times: Partial<Record<OrderStatus, string>>;
  language: string;
  labelFor: (step: OrderStatus) => string;
  nowLabel: string;
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const reached = hasReached(status, step);
        const current = step === status;
        const last = index === steps.length - 1;
        const delivered = current && step === "delivered";
        return (
          <li key={step} className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              {current ? (
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${delivered ? "bg-green text-white" : "bg-amber shadow-[0_0_0_4px_#ffb81c40]"}`}>
                  {delivered ? <IconCheck size={14} /> : <span className="h-2.5 w-2.5 rounded-full bg-navy" />}
                </span>
              ) : reached ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo text-white"><IconCheck size={14} /></span>
              ) : (
                <span className="h-6 w-6 rounded-full border-2 border-dashed border-field" />
              )}
              {!last && <span className={`w-0.5 flex-1 ${reached && !current ? "bg-indigo" : "border-l-2 border-dashed border-field"}`} style={{ minHeight: 18 }} />}
            </div>
            <div className="flex flex-1 items-start justify-between gap-2 pb-4">
              <span className={`text-[15px] ${current ? "font-extrabold" : reached ? "font-bold" : "text-faint"}`}>
                {labelFor(step)}
                {current && <span className="ml-2 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-extrabold text-amber-ink">{nowLabel}</span>}
              </span>
              {reached && times[step] && <span className="text-xs text-muted tabular-nums">{formatTime(times[step]!, language)}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
