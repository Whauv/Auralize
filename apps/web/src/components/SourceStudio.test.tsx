import type { FormEvent } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SourceStudio } from "./SourceStudio";

describe("SourceStudio", () => {
  it("switches source modes and submits the selected upload flow", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onSourceModeChange = vi.fn();

    render(
      <SourceStudio
        actionMessage={null}
        error={null}
        fileName={null}
        isDragActive={false}
        isUploading={false}
        lastFmUsername=""
        loadingIndicator={null}
        onDragLeave={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onFileChange={vi.fn()}
        onLastFmUsernameChange={vi.fn()}
        onSourceModeChange={onSourceModeChange}
        onSubmit={onSubmit}
        onYoutubeMusicProfileUrlChange={vi.fn()}
        sourceMode="takeout"
        youtubeMusicProfileUrl=""
      />,
    );

    await user.click(screen.getByRole("button", { name: "YouTube + Music" }));
    await user.click(screen.getByRole("button", { name: "Apple Music" }));
    await user.click(screen.getByRole("button", { name: "Last.fm Live Mode" }));
    await user.click(screen.getByRole("button", { name: /Build dashboard or preview/i }));

    expect(onSourceModeChange).toHaveBeenCalledWith("unified-takeout");
    expect(onSourceModeChange).toHaveBeenCalledWith("apple-music");
    expect(onSourceModeChange).toHaveBeenCalledWith("lastfm");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("passes selected files to the upload handler", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();

    render(
      <SourceStudio
        actionMessage={null}
        error={null}
        fileName={null}
        isDragActive={false}
        isUploading={false}
        lastFmUsername=""
        loadingIndicator={null}
        onDragLeave={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        onFileChange={onFileChange}
        onLastFmUsernameChange={vi.fn()}
        onSourceModeChange={vi.fn()}
        onSubmit={vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())}
        onYoutubeMusicProfileUrlChange={vi.fn()}
        sourceMode="takeout"
        youtubeMusicProfileUrl=""
      />,
    );

    const fileInput = screen.getByLabelText("Choose file");
    const file = new File(["{}"], "watch-history.json", { type: "application/json" });

    await user.upload(fileInput, file);

    expect(onFileChange).toHaveBeenCalledTimes(1);
  });
});
