export function redirect(to) {
  const error = new Error(`REDIRECT ${to}`);
  error.redirect = to;
  throw error;
}
export function notFound() {
  const error = new Error("NOT_FOUND");
  error.notFound = true;
  throw error;
}
