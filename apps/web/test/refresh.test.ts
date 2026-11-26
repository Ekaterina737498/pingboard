import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshAccessToken } from "@/lib/refresh";

const respond = (accessToken: string) =>
  new Response(JSON.stringify({ data: { refresh: { accessToken } } }));

describe("refreshAccessToken", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends one request for parallel calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond("token-1"));
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(tokens).toEqual(["token-1", "token-1"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends a new request after the previous one finished", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond("token-1"))
      .mockResolvedValueOnce(respond("token-2"));
    vi.stubGlobal("fetch", fetchMock);

    await refreshAccessToken();

    await expect(refreshAccessToken()).resolves.toBe("token-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(refreshAccessToken()).resolves.toBeNull();
  });
});
