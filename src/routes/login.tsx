import { createFileRoute } from "@tanstack/react-router";
import { SignInPanel } from "@/components/apostle/sign-in-panel";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return <SignInPanel callbackURL="/" />;
}
