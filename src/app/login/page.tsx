import { redirect } from "next/navigation";

export default function Page() {
  // Redirect legacy /login to the consolidated /auth page
  redirect('/auth');
}
