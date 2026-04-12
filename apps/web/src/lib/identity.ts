export function parseLastFmUsername(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("last.fm")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const userIndex = parts.findIndex((part) => part.toLowerCase() === "user");
      if (userIndex >= 0 && parts[userIndex + 1]) {
        return parts[userIndex + 1];
      }
      if (parts[0]) {
        return parts[0];
      }
    }
  } catch {
    return trimmed.replace(/^@/, "");
  }

  return trimmed.replace(/^@/, "");
}

export function parseYoutubeMusicProfileUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (!["music.youtube.com", "www.music.youtube.com"].includes(url.hostname)) {
      return "";
    }

    const path = url.pathname.replace(/\/+$/, "");
    if (/^\/@[^/]+$/i.test(path)) {
      return `https://music.youtube.com${path}`;
    }
    if (/^\/(channel|browse|playlist)\/[^/]+$/i.test(path)) {
      return `https://music.youtube.com${path}`;
    }
    return "";
  } catch {
    return "";
  }
}
