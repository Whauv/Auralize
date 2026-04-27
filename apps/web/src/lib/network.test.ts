import { afterEach, describe, expect, it, vi } from "vitest";

import { createFormData, postFile, postJson } from "./network";

describe("network helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates form data with the file field", () => {
    const file = new File(["[]"], "watch-history.json");
    const formData = createFormData(file);

    expect(formData.get("file")).toBe(file);
  });

  it("posts files and returns json payloads", async () => {
    const file = new File(["[]"], "watch-history.json");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    const payload = await postFile<{ ok: boolean }>("/analyze", file);

    expect(payload).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws api detail messages for failed requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Bad request" }),
    } as Response);

    await expect(postJson("/lastfm", { username: "prana" })).rejects.toThrow("Bad request");
  });

  it("throws a deployment-oriented message when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(postFile("/jobs/analyze?source=takeout", new File(["[]"], "watch-history.json")))
      .rejects.toThrow("Couldn't reach the API");
  });
});
