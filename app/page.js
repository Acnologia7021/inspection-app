import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login"); // automatically sends user to login page
}
