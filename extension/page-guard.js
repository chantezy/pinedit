export function shouldInject(url) {
  if (typeof url !== "string" || url === "") return true;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file:");
}
