"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  TrendingUp,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import { formatAUD } from "@/lib/utils/currency";
import { formatTimeframe } from "@/lib/utils/projections";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/types";
import { useGoalStore } from "@/stores/goal.store";
import { toast } from "sonner";

interface GoalCardProps {
  progress: GoalProgress;
  onEdit?: (goal: GoalProgress["goal"]) => void;
}

const goalTypeIcons: Record<string, typeof Target> = {
  "net-worth": TrendingUp,
  retirement: Target,
  savings: Target,
  investment: TrendingUp,
  "debt-free": Target,
  "emergency-fund": Target,
  custom: Target,
};

const goalTypeLabels: Record<string, string> = {
  "net-worth": "Net Worth",
  retirement: "Retirement",
  savings: "Savings",
  investment: "Investment",
  "debt-free": "Debt Free",
  "emergency-fund": "Emergency Fund",
  custom: "Custom",
};

export function GoalCard({ progress, onEdit }: GoalCardProps) {
  const {
    goal,
    currentAmount,
    progressPercent,
    remainingAmount,
    monthsToTarget,
    onTrack,
  } = progress;
  const { achieveGoal, pauseGoal, resumeGoal, deleteGoal } = useGoalStore();

  const Icon = goalTypeIcons[goal.type] || Target;
  const progressClamped = Math.min(100, Math.max(0, progressPercent));

  const handleAchieve = async () => {
    await achieveGoal(goal.id);
    toast.success("Goal marked as achieved!");
  };

  const handlePause = async () => {
    await pauseGoal(goal.id);
    toast.success("Goal paused");
  };

  const handleResume = async () => {
    await resumeGoal(goal.id);
    toast.success("Goal resumed");
  };

  const handleDelete = async () => {
    await deleteGoal(goal.id);
    toast.success("Goal deleted");
  };

  return (
    <Card className={cn(!goal.isActive && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center h-8 w-8 rounded-lg"
              style={{
                backgroundColor: goal.color ? `${goal.color}20` : undefined,
              }}
            >
              <Icon className="h-4 w-4" style={{ color: goal.color }} />
            </div>
            <div>
              <CardTitle className="text-base">{goal.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {goalTypeLabels[goal.type]}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {goal.isActive && (
                <>
                  <DropdownMenuItem onClick={handleAchieve}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Achieved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePause}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Goal
                  </DropdownMenuItem>
                </>
              )}
              {!goal.isActive && (
                <DropdownMenuItem onClick={handleResume}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Goal
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold">
              {formatAUD(currentAmount)}
            </span>
            <span className="text-sm text-muted-foreground">
              of {formatAUD(goal.targetAmount)}
            </span>
          </div>
          <Progress
            value={progressClamped}
            className={cn("h-2", !onTrack && goal.targetDate && "bg-amber-200")}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercent.toFixed(1)}% complete</span>
            <span>{formatAUD(remainingAmount)} remaining</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2">
          {goal.targetDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Target: {format(goal.targetDate, "MMM yyyy")}</span>
            </div>
          )}
          {monthsToTarget !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                onTrack ? "text-success" : "text-amber-600",
              )}
            >
              {onTrack ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>{formatTimeframe(monthsToTarget)}</span>
            </div>
          )}
        </div>

        {/* Monthly Contribution Info */}
        {goal.monthlyContribution && goal.monthlyContribution > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Contributing {formatAUD(goal.monthlyContribution)}/month
            {goal.expectedReturnRate && goal.expectedReturnRate > 0 && (
              <span>
                {" "}
                at {(goal.expectedReturnRate * 100).toFixed(1)}% return
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
