import { LogOut } from "lucide-react"
import { ExportDialog } from "@/components/export/export-dialog"

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <span className="text-lg font-bold text-primary">Finance Tracker</span>
        <div className="ml-auto flex items-center gap-2">
          <ExportDialog variant="default" responsiveLabel />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Exit demo</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
