import { redirect } from "next/navigation"

export default function GhostPage() {
  redirect("/chat?module=ghost")
}
