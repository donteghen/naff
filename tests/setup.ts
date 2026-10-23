import { vi } from "vitest";

// Tests never reach the network: ntfy posts are recorded instead of sent.
export const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
vi.stubGlobal("fetch", fetchMock);
