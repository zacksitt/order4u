import Link from "next/link";

import { LoginForm } from "@/components/order4u/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        {/* <p className="text-sm font-semibold uppercase tracking-wider text-primary">Order4U</p> */}
        <h1 className="mt-2 text-3xl font-bold text-foreground text-primary">Order4U Dashboard</h1>
        {/* <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Sign in with your shop account. Agents and cargo staff use separate demo emails after seed.
        </p> */}
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          {/* <CardDescription>Multi-tenant: each agent sees only their shop orders.</CardDescription> */}
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
{/* 
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Customer track (no login):{" "}
        <Link href="/o/demo-token-123" className="text-primary underline-offset-2 hover:underline">
          /o/demo-token-123
        </Link>
      </p> */}
    </main>
  );
}
