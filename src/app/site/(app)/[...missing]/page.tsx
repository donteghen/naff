import { notFound } from "next/navigation";

// Unknown paths inside this app show this app's own "not found" page.
export default function Missing() {
  notFound();
}
