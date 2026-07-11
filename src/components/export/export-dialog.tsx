"use client"

import { useState } from "react"
import { Download, Loader2, TriangleAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ExportDialog() {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(() => isoDaysAgo(90))
  const [end, setEnd] = useState(() => today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (start > end) {
      setError("Start date must be on or before the end date.")
      return
    }

    setBusy(true)
    try {
      const url = `/api/export?start=${start}&end=${end}`
      const res = await fetch(url)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `Export failed (HTTP ${res.status})`)
        return
      }

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = `finance-export_${start}_to_${end}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
      setOpen(false)
    } catch {
      setError("Something went wrong generating the file. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setError(null)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Download className="size-3.5" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Export transactions</DialogTitle>
          <DialogDescription>
            Choose a date range. You&rsquo;ll get an Excel workbook with a
            separate sheet for each account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleExport} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="export-start"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                From
              </label>
              <Input
                id="export-start"
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="export-end"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                To
              </label>
              <Input
                id="export-end"
                type="date"
                value={end}
                min={start}
                max={today()}
                onChange={(e) => setEnd(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Download .xlsx
                </>
              )}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
