"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const UNAVAILABLE_MESSAGE =
  'Email sign-in isn’t available in the demo. Use "Try the live demo" above.'

/**
 * The email / password / Google block from the reference. It is deliberately
 * inert: this is a demo with no real accounts, so every path here refuses and
 * points the visitor back to the demo button. The only real entrance is the
 * "Try the live demo" form, which lives in the server page above this.
 */
export function DemoLoginForm() {
  const [message, setMessage] = useState<string | null>(null)

  function reject(e: React.SyntheticEvent) {
    e.preventDefault()
    setMessage(UNAVAILABLE_MESSAGE)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>
      </div>

      <form onSubmit={reject} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Email address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            className="h-10"
          />
        </div>

        <Button type="submit" className="h-10 w-full">
          Sign in
        </Button>
      </form>

      {message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={reject}
        className="h-10 w-full gap-2"
      >
        <GoogleIcon />
        Sign in with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&rsquo;t have an account?{" "}
        <button
          type="button"
          onClick={reject}
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
