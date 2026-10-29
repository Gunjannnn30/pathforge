import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/world");

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <RegisterForm />
      <p className="mt-6 text-xs text-center text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/auth/login"
          className="text-signal underline hover:not-italic"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
