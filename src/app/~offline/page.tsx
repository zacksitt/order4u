import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Order4U needs a network connection for orders and sign-in. Reconnect and try again.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </main>
  );
}
