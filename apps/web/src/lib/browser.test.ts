import { describe, expect, it, vi } from "vitest";

import { copyText, downloadTextFile, formatHours, formatTimestamp, truncateLabel } from "./browser";

describe("browser helpers", () => {
  it("formats timestamps, hours, and labels", () => {
    expect(formatHours(150)).toBe("2.5 hrs");
    expect(truncateLabel("Auralize", 5)).toBe("Aura...");
    expect(formatTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("copies text through the clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await copyText("hello");

    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to textarea copy when clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    const execCommandMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommandMock,
    });

    await copyText("fallback");

    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });

  it("downloads text files through a generated blob url", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const element = document.createElementNS("http://www.w3.org/1999/xhtml", tagName) as HTMLAnchorElement;
      if (tagName === "a") {
        element.click = click;
      }
      return element;
    }) as typeof document.createElement);

    downloadTextFile("file.txt", "content");

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    createElement.mockRestore();
  });
});
