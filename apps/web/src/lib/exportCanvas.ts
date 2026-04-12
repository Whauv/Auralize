import html2canvas from "html2canvas";

type ExportFontSpec = {
  displayFontLoad: string;
  bodyFontLoad: string;
};

export async function waitForExportAssets(node: HTMLElement) {
  await document.fonts.ready;

  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

export async function ensureExportFontsLoaded(theme: ExportFontSpec) {
  if (!("fonts" in document)) {
    return;
  }

  await Promise.all([
    document.fonts.load(theme.displayFontLoad),
    document.fonts.load(theme.bodyFontLoad),
    document.fonts.load("900 64px Archivo Black"),
    document.fonts.load("700 24px Space Grotesk"),
    document.fonts.load("600 20px Instrument Sans"),
  ]);
}

export async function renderNodeToCanvas(
  node: HTMLElement,
  backgroundColor: string | null,
) {
  await waitForExportAssets(node);
  const rect = node.getBoundingClientRect();

  return html2canvas(node, {
    backgroundColor,
    scale: 2.5,
    useCORS: true,
    foreignObjectRendering: false,
    imageTimeout: 15000,
    logging: false,
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
    windowWidth: Math.ceil(rect.width),
    windowHeight: Math.ceil(rect.height),
    scrollX: 0,
    scrollY: 0,
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

export async function loadCanvasImage(src: string | null) {
  if (!src) {
    return null;
  }

  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function drawRoundedImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y, width, height);

  const sourceWidth = image.naturalWidth || width;
  const sourceHeight = image.naturalHeight || height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}
