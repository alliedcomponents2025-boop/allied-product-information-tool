import { ProductFamily } from "./types";

const allowedExtensions = ["jpg", "jpeg", "png"];
const allowedMimeTypes = ["image/jpeg", "image/png"];
const maxFileSizeBytes = 20 * 1024 * 1024;

export function getAllowedImageExtensions() {
  return allowedExtensions;
}

export function validateImageFile(file: File) {
  if (!file || file.size === 0) {
    return "Choose an image file first.";
  }

  if (file.size > maxFileSizeBytes) {
    return "Image must be 20 MB or smaller.";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedExtensions.includes(extension) || !allowedMimeTypes.includes(file.type)) {
    return "Only JPG, JPEG, and PNG files are allowed.";
  }

  return null;
}

export function buildImageFilename({
  sku,
  sequence,
  originalName,
  date = new Date(),
}: {
  sku: string;
  sequence: number;
  originalName: string;
  date?: Date;
}) {
  const extension = originalName.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = allowedExtensions.includes(extension) ? extension : "jpg";
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const sequencePart = String(sequence).padStart(2, "0");

  return `${sku}_${datePart}_${sequencePart}.${safeExtension}`;
}

export function buildImageStoragePath({
  family,
  sku,
  filename,
}: {
  family: ProductFamily;
  sku: string;
  filename: string;
}) {
  return `${family}/${sku}/${filename}`;
}

export function parseUploadDateFromFilename(filename: string) {
  const match = filename.match(/_(\d{8})_/);

  if (!match) return null;

  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}
