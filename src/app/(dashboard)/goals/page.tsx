"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Target,
  TrendingUp,
  Calculator,
  Landmark,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useAllGoalProgress } from "@/hooks";
import { useFamilyStore } from "@/stores/family.store";
import {
  GoalCard,
  GoalFormDialog,
  ProjectionChart,
  RetirementCalculator,
  CompoundInterestCalculator,
  FICalculator,
} from "@/components/goals";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState("goals");
  const { selectedMemberId } = useFamilyStore();

  const { progress, isLoading } = useAllGoalProgress(
    selectedMemberId ?? undefined,
  );

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingGoal(null);
  };

  const activeGoals = progress.filter((p) => p.goal.isActive);
  const achievedGoals = progress.filter(
    (p) => !p.goal.isActive && p.progressPercent >= 100,
  );
  const pausedGoals = progress.filter(
    (p) => !p.goal.isActive && p.progressPercent < 100,
  );

  return (
    <>
      <Header title="Goals & Projections" />
      <div className="pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="card-trace fintech-surface relative overflow-hidden rounded-lg border border-border/80 animate-enter">
            <div className="p-6 md:p-8">
              <span className="eyebrow">// Goals &amp; projections</span>
              <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                Plan, project, retire
              </h1>
              <p className="mt-2 max-w-prose text-[13px] text-muted-foreground">
                Track financial goals, model long-term projections, plan
                retirement.
              </p>
            </div>
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <TabsList>
                <TabsTrigger value="goals" className="gap-2">
                  <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Goals
                </TabsTrigger>
                <TabsTrigger value="projections" className="gap-2">
                  <TrendingUp
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  Projections
                </TabsTrigger>
                <TabsTrigger value="retirement" className="gap-2">
                  <Landmark
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  Retirement
                </TabsTrigger>
                <TabsTrigger value="calculator" className="gap-2">
                  <Calculator
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  Calculator
                </TabsTrigger>
                <TabsTrigger value="fi-planner" className="gap-2">
                  <BarChart3
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                  />
                  FI Planner
                </TabsTrigger>
              </TabsList>

              {activeTab === "goals" && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  New Goal
                </Button>
              )}
            </div>

            <TabsContent value="goals" className="mt-5 space-y-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2
                    className="h-6 w-6 animate-spin text-primary"
                    strokeWidth={1.5}
                  />
                </div>
              ) : progress.length === 0 ? (
                <div className="rounded-lg border border-border/80 fintech-panel px-5 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/40">
                    <Target
                      className="h-5 w-5 text-[--text-subtle]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="font-display text-lg tracking-tight">
                    No goals yet
                  </p>
                  <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
                    Create your first financial goal to start tracking progress.
                  </p>
                  <Button
                    className="mt-5"
                    size="sm"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus
                      className="mr-1.5 h-3.5 w-3.5"
                      strokeWidth={1.5}
                    />
                    Create Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeGoals.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="eyebrow">Active goals</span>
                        <span className="hairline-v h-3" aria-hidden />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                          {activeGoals.length} record
                          {activeGoals.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {activeGoals.map((progress) => (
                          <GoalCard
                            key={progress.goal.id}
                            progress={progress}
                            onEdit={handleEdit}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {pausedGoals.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="eyebrow">Paused</span>
                        <span className="hairline-v h-3" aria-hidden />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                          {pausedGoals.length} record
                          {pausedGoals.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {pausedGoals.map((progress) => (
                          <GoalCard
                            key={progress.goal.id}
                            progress={progress}
                            onEdit={handleEdit}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {achievedGoals.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="eyebrow text-positive">
                          Achieved
                        </span>
                        <span className="hairline-v h-3" aria-hidden />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[--text-subtle]">
                          {achievedGoals.length} record
                          {achievedGoals.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {achievedGoals.map((progress) => (
                          <GoalCard
                            key={progress.goal.id}
                            progress={progress}
                            onEdit={handleEdit}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="projections" className="mt-5">
              <ProjectionChart />
            </TabsContent>

            <TabsContent value="retirement" className="mt-5 space-y-5">
              <section className="card-trace overflow-hidden rounded-lg border border-border/80 fintech-panel">
                <div className="border-b border-border px-5 py-3">
                  <span className="eyebrow">Australian Retirement Planning</span>
                </div>
                <p className="px-5 py-4 text-[13px] text-muted-foreground">
                  Calculate your retirement readiness based on superannuation
                  and investment holdings. Factors in 15% super earnings tax
                  and preservation age rules.
                </p>
              </section>
              <RetirementCalculator />
            </TabsContent>

            <TabsContent value="calculator" className="mt-5 space-y-5">
              <section className="card-trace overflow-hidden rounded-lg border border-border/80 fintech-panel">
                <div className="border-b border-border px-5 py-3">
                  <span className="eyebrow">Compound Interest Calculator</span>
                </div>
                <p className="px-5 py-4 text-[13px] text-muted-foreground">
                  Model how money grows over time with regular contributions
                  and compound returns. Useful for planning long-term savings
                  goals.
                </p>
              </section>
              <CompoundInterestCalculator />
            </TabsContent>

            <TabsContent value="fi-planner" className="mt-5 space-y-5">
              <section className="card-trace overflow-hidden rounded-lg border border-border/80 fintech-panel">
                <div className="border-b border-border px-5 py-3">
                  <span className="eyebrow">Australian Household · Financial Independence Planner</span>
                </div>
                <p className="px-5 py-4 text-[13px] text-muted-foreground">
                  Model your household income, expenses, and investment allocation
                  to project your path to financial independence. Includes
                  Australian tax calculations, expense breakdown, and wealth
                  projection charts.
                </p>
              </section>
              <FICalculator />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <GoalFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        goal={editingGoal}
      />
    </>
  );
}
