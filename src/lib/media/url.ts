/** Public URL for a stored file (PUBLIC_MEDIA_URL lets Nginx or a CDN serve the folder). */
export function mediaUrl(relativePath: string): string {
  const base = (process.env.PUBLIC_MEDIA_URL || "/media").replace(/\/+$/, "");
  return `${base}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}
