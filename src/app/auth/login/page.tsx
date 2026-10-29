import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/world");

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoginForm />
      <p className="mt-6 text-xs text-center text-muted-foreground">
        Don't have an account?{" "}
        <a
          href="/auth/register"
          className="text-signal underline hover:not-italic"
        >
          Create one
        </a>
      </p>
    </div>
  );
}
