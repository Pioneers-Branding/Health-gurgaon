import { notFound } from "next/navigation";

/**
 * Any URL that matches no route still renders inside the site shell, in the
 * right language: this catch-all hands it to app/[lang]/not-found.tsx.
 * (Specific routes always win over a catch-all.)
 */
export default function UnknownPage() {
  notFound();
}
