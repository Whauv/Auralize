import type { MusicPassportData, MusicPassportTheme } from "../components/MusicPassportCard";
import type { PublicProfileSharePayload } from "./types";
import { copyText } from "./browser";
import { downloadCanvas, drawRoundedImageCover, ensureExportFontsLoaded, loadCanvasImage, renderNodeToCanvas } from "./exportCanvas";
import { getPublicProfileUrl, getShareUrl } from "./sharing";

export type ExportThemeDefinition = {
  label: string;
  storyBackground: string;
  storyPanelFill: string;
  storyPanelBorder: string;
  noteColor: string;
  labelColor: string;
  titleColor: string;
  subtitleColor: string;
  accentColor: string;
  accentSoft: string;
  rankBackground: string;
  dividerColor: string;
  auroraBands: string[];
  displayFont: string;
  bodyFont: string;
  displayFontLoad: string;
  bodyFontLoad: string;
  passportTheme: MusicPassportTheme;
};

export async function renderPassportCanvas(
  passportNode: HTMLDivElement | null,
  exportTheme: ExportThemeDefinition,
): Promise<HTMLCanvasElement | null> {
  if (!passportNode) {
    return null;
  }

  await ensureExportFontsLoaded(exportTheme);
  return renderNodeToCanvas(passportNode, "#06070b");
}

export async function buildInstagramStoryCanvas(
  activePassport: MusicPassportData | null,
  exportTheme: ExportThemeDefinition,
): Promise<HTMLCanvasElement | null> {
  if (!activePassport) {
    return null;
  }

  await ensureExportFontsLoaded(exportTheme);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const displayFont = exportTheme.displayFont;
  const bodyFont = exportTheme.bodyFont;

  ctx.fillStyle = exportTheme.storyBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const auroraBands = [
    { color: exportTheme.auroraBands[0], x: -120, y: -140, width: 240, height: 2320, angle: -0.18 },
    { color: exportTheme.auroraBands[1], x: 90, y: -160, width: 220, height: 2360, angle: 0.14 },
    { color: exportTheme.auroraBands[2], x: 300, y: -180, width: 210, height: 2340, angle: -0.12 },
    { color: exportTheme.auroraBands[3], x: 520, y: -150, width: 260, height: 2380, angle: 0.16 },
    { color: exportTheme.auroraBands[4], x: 760, y: -170, width: 230, height: 2380, angle: -0.14 },
    { color: exportTheme.auroraBands[5], x: 930, y: -140, width: 210, height: 2320, angle: 0.12 },
  ];

  auroraBands.forEach((band) => {
    ctx.save();
    ctx.translate(band.x, band.y);
    ctx.rotate(band.angle);
    const bandGradient = ctx.createLinearGradient(0, 0, band.width, 0);
    bandGradient.addColorStop(0, "rgba(255,255,255,0)");
    bandGradient.addColorStop(0.5, band.color);
    bandGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bandGradient;
    ctx.fillRect(0, 0, band.width, band.height);
    ctx.restore();
  });

  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = exportTheme.dividerColor;
  for (let x = 0; x < canvas.width; x += 108) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 108) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  const floatingShapes = [
    { text: "♪", x: 106, y: 190, size: 92, color: "rgba(75, 113, 255, 0.14)" },
    { text: "♫", x: 874, y: 1570, size: 108, color: "rgba(223, 104, 153, 0.14)" },
    { text: "♬", x: 902, y: 212, size: 76, color: "rgba(58, 198, 184, 0.16)" },
    { text: "♩", x: 120, y: 1708, size: 82, color: "rgba(104, 89, 239, 0.12)" },
  ];

  floatingShapes.forEach((shape) => {
    ctx.fillStyle = shape.color;
    ctx.font = `700 ${shape.size}px ${bodyFont}`;
    ctx.fillText(shape.text, shape.x, shape.y);
  });

  ctx.fillStyle = exportTheme.labelColor;
  ctx.font = `600 26px ${bodyFont}`;
  ctx.fillText("AURALIZE", 86, 112);

  ctx.fillStyle = exportTheme.titleColor;
  ctx.font = `900 94px ${displayFont}`;
  ctx.fillText("Music", 82, 214);
  ctx.fillText("Passport", 82, 312);

  const storyPanelX = 60;
  const storyPanelY = 400;
  const storyPanelWidth = 960;
  const storyPanelHeight = 1320;

  ctx.save();
  ctx.fillStyle = exportTheme.storyPanelFill;
  ctx.strokeStyle = exportTheme.storyPanelBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(storyPanelX, storyPanelY, storyPanelWidth, storyPanelHeight, 44);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const topArtistImage = await loadCanvasImage(activePassport.topArtist.thumbnail);
  if (topArtistImage) {
    drawRoundedImageCover(ctx, topArtistImage, 92, 438, 128, 128, 30);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(92, 438, 128, 128, 30);
    ctx.fill();
  }

  ctx.fillStyle = exportTheme.labelColor;
  ctx.font = `600 20px ${bodyFont}`;
  ctx.fillText("#1 ARTIST", 252, 478);

  ctx.fillStyle = exportTheme.titleColor;
  ctx.font = `800 48px ${displayFont}`;
  ctx.fillText(activePassport.topArtist.name, 252, 534, 720);

  ctx.fillStyle = exportTheme.subtitleColor;
  ctx.font = `500 24px ${bodyFont}`;
  ctx.fillText("leads this snapshot", 252, 572);

  const statCardY = 618;
  const statCardWidth = 286;
  const statGap = 24;
  const statCards = [
    { label: "Listening", value: `${activePassport.totalListeningHours.toFixed(1)} hrs` },
    { label: "Mood", value: activePassport.dominantMood },
    { label: "Genre", value: activePassport.dominantGenre },
  ];

  statCards.forEach((card, index) => {
    const x = 92 + index * (statCardWidth + statGap);
    ctx.fillStyle = exportTheme.labelColor;
    ctx.font = `600 18px ${bodyFont}`;
    ctx.fillText(card.label.toUpperCase(), x, statCardY + 20);

    ctx.fillStyle = exportTheme.titleColor;
    ctx.font = `800 34px ${displayFont}`;
    ctx.fillText(card.value, x, statCardY + 66, statCardWidth - 8);
  });

  ctx.fillStyle = exportTheme.labelColor;
  ctx.font = `600 22px ${bodyFont}`;
  ctx.fillText("Top 10 songs in this frame", 92, 772);

  const songs = activePassport.topSongs.slice(0, 10);
  const songThumbs = await Promise.all(songs.map((song) => loadCanvasImage(song.thumbnail)));

  songs.forEach((song, index) => {
    const y = 800 + index * 66;

    ctx.fillStyle = exportTheme.rankBackground;
    ctx.beginPath();
    ctx.roundRect(112, y + 8, 40, 40, 14);
    ctx.fill();

    ctx.fillStyle = exportTheme.titleColor;
    ctx.font = `700 22px ${displayFont}`;
    ctx.fillText(String(index + 1), 124, y + 33);

    const thumb = songThumbs[index];
    if (thumb) {
      drawRoundedImageCover(ctx, thumb, 174, y + 6, 44, 44, 14);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.roundRect(174, y + 6, 44, 44, 14);
      ctx.fill();
    }

    ctx.fillStyle = exportTheme.titleColor;
    ctx.font = `700 20px ${displayFont}`;
    ctx.fillText(song.title, 242, y + 26, 700);

    ctx.fillStyle = exportTheme.subtitleColor;
    ctx.font = `500 18px ${bodyFont}`;
    ctx.fillText(song.artist, 242, y + 46, 700);
  });

  const streakCardY = 1488;
  ctx.fillStyle = exportTheme.labelColor;
  ctx.font = `600 20px ${bodyFont}`;
  ctx.fillText("LISTENING STREAK", 92, streakCardY + 24);

  ctx.fillStyle = exportTheme.titleColor;
  ctx.font = `800 44px ${displayFont}`;
  ctx.fillText(`${activePassport.listeningStreakDays} days`, 92, streakCardY + 72);
  return canvas;
}

export async function exportPassportImage(
  passportNode: HTMLDivElement | null,
  exportTheme: ExportThemeDefinition,
): Promise<string | null> {
  const canvas = await renderPassportCanvas(passportNode, exportTheme);
  if (!canvas) {
    return null;
  }

  downloadCanvas(canvas, "my-music-passport.png");
  return "Passport exported as PNG.";
}

export async function exportInstagramStory(
  activePassport: MusicPassportData | null,
  exportTheme: ExportThemeDefinition,
): Promise<string | null> {
  const canvas = await buildInstagramStoryCanvas(activePassport, exportTheme);
  if (!canvas) {
    return null;
  }

  downloadCanvas(canvas, "my-music-passport-instagram-story.png");
  return "Instagram story image exported as PNG.";
}

export async function shareToInstagram(args: {
  activePassport: MusicPassportData | null;
  publicProfilePayload: PublicProfileSharePayload | null;
  exportTheme: ExportThemeDefinition;
}): Promise<string | null> {
  const { activePassport, publicProfilePayload, exportTheme } = args;
  const canvas = await buildInstagramStoryCanvas(activePassport, exportTheme);
  if (!canvas) {
    return null;
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });
  if (!blob) {
    return "Could not prepare the Instagram image.";
  }

  const file = new File([blob], "auralize-instagram-story.png", { type: "image/png" });
  const shareUrl =
    publicProfilePayload != null
      ? getPublicProfileUrl(publicProfilePayload)
      : activePassport != null
        ? getShareUrl(activePassport)
        : null;

  try {
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({
        files: [file],
        title: "My Auralize Music Passport",
        text: shareUrl ? `Shared from Auralize\n${shareUrl}` : "Shared from Auralize",
        url: shareUrl ?? undefined,
      });
      return "Share sheet opened. Choose Instagram if it appears on your device.";
    }

    if (navigator.share && shareUrl) {
      await navigator.share({
        title: "My Auralize Music Passport",
        text: "Shared from Auralize",
        url: shareUrl,
      });
      return "Share sheet opened with your passport link. Choose Instagram if it appears on your device.";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "Instagram sharing was canceled.";
    }
  }

  if (shareUrl) {
    await copyText(shareUrl);
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    downloadCanvas(canvas, "auralize-instagram-story.png");
    return "Instagram opened in a new tab, your shareable link was copied, and the story image was downloaded for manual posting.";
  }

  downloadCanvas(canvas, "auralize-instagram-story.png");
  return "Direct Instagram sharing is not available here, so a story-ready PNG was downloaded instead.";
}

export async function copyPassportShareLink(payload: MusicPassportData): Promise<string> {
  await copyText(getShareUrl(payload));
  return "Shareable passport link copied to clipboard.";
}

export async function copyPublicShareLink(payload: PublicProfileSharePayload): Promise<string> {
  await copyText(getPublicProfileUrl(payload));
  return "Public profile link copied to clipboard.";
}
