const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const normalizeImageSrc = (img: string): string => {
  if (!img) return "/placeholder.png";

  if (img.startsWith("http://") || img.startsWith("https://")) {
    return img;
  }

  if (img.startsWith("/")) {
    return `${API_URL}${img}`;
  }

  return `${API_URL}/images/${img}`;
};
