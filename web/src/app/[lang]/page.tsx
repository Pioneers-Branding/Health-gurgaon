import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { getLang } from "@/lib/i18n/server";

/** "/" and "/hi" go to the city homepage. src/proxy.ts normally redirects first. */
export default async function LangRoot() {
  redirect(routes.home(await getLang()));
}
