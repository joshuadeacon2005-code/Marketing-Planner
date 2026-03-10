import { cn } from "@/lib/utils";

const statusColors = {
  success: "bg-status-success/10 text-status-success border-status-success/20",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
  error: "bg-status-error/10 text-status-error border-status-error/20",
  info: "bg-status-info/10 text-status-info border-status-info/20",
};

interface StatusBadgeProps {
  status: keyof typeof statusColors;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border",
        statusColors[status],
        className
      )}
    >
      {children}
    </span>
  );
}

export function getStatusVariant(status: string): keyof typeof statusColors {
  const statusMap: Record<string, keyof typeof statusColors> = {
    PENDING: "warning",
    IN_DESIGN: "info",
    FINAL: "success",
    DRAFT: "warning",
    APPROVED: "success",
    POSTED: "success",
    PLANNING: "warning",
    DESIGNING: "info",
    QA: "info",
    SCHEDULED: "success",
    SENT: "success",
    CONFIRMED: "success",
    COMPLETED: "success",
    CANCELLED: "error",
    BACKLOG: "warning",
    TODO: "warning",
    IN_PROGRESS: "info",
    REVIEW: "info",
    DONE: "success",
    LOW: "info",
    MEDIUM: "warning",
    HIGH: "error",
    URGENT: "error",
  };
  return statusMap[status] || "info";
}
