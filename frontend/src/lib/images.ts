const IMAGES_URL =
  process.env.NEXT_PUBLIC_IMAGES_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export const normalizeImageSrc = (img: string): string => {
  if (!img) return "/placeholder.png";

  if (img.startsWith("http://") || img.startsWith("https://")) {
    return img;
  }

  if (img.startsWith("/images/")) {
    return `${IMAGES_URL}${img}`;
  }

  if (img.startsWith("/")) {
    return `${IMAGES_URL}${img}`;
  }

  return `${IMAGES_URL}/images/${img}`;
};
