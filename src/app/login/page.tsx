import { redirect } from "next/navigation";

import { LoginForm } from "@/components/order4u/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";

const AREA_ERROR: Record<string, string> = {
  agent: "That page is for shop agents. Sign in with an agent account.",
  cargo: "That page is for cargo staff. Sign in with a cargo account.",
  customer: "That page is for customers. Sign in with a customer account.",
  session: "Your session expired. Please sign in again.",
};

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.role === "agent") redirect("/agent/dashboard");
  if (session?.role === "cargo") redirect("/cargo/orders");
  if (session?.role === "customer") redirect("/customer/orders");

  const { error } = await searchParams;
  const areaError = error ? AREA_ERROR[error] : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mt-2 text-3xl font-bold text-primary">Order4U</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {areaError && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {areaError}
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
