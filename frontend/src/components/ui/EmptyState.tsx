import React from "react"
import { Inbox } from "lucide-react"
import { Button } from "./Button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="mb-4 rounded-full bg-muted/50 p-4 text-muted-foreground/40">
      {icon || <Inbox className="h-10 w-10" />}
    </div>
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    {description && (
      <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">{description}</p>
    )}
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" className="mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
)
