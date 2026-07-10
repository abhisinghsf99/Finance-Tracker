import type { Metadata } from "next"
import { LineChart, ArrowRight } from "lucide-react"
import { DemoLoginForm } from "@/components/auth/demo-login-form"

export const metadata: Metadata = {
  title: "Sign in — Finance Tracker",
  description: "Try the live demo of Finance Tracker.",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-4.5" />
          </span>
          <span className="text-lg font-bold text-primary">Finance Tracker</span>
        </div>

        {/* The one real entrance */}
        <form action="/api/auth/demo" method="POST">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            Try the live demo
            <ArrowRight className="size-4" />
          </button>
        </form>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          A private, hands-on sandbox of Finance Tracker. Explore anything —
          your changes stay in the shared demo and reset on re-seed.
        </p>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Decorative, non-functional sign-in */}
        <DemoLoginForm />
      </div>
    </main>
  )
}
