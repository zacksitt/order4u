import { redirect } from "next/navigation";

import { LoginForm } from "@/components/order4u/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.role === "agent") redirect("/agent/dashboard");
  if (session?.role === "cargo") redirect("/cargo/queue");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mt-2 text-3xl font-bold text-foreground text-primary">Order4U Dashboard</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
