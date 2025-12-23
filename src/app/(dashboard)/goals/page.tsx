'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, TrendingUp, Calculator, Landmark, Loader2 } from 'lucide-react';
import { useAllGoalProgress } from '@/hooks';
import {
  GoalCard,
  GoalFormDialog,
  ProjectionChart,
  RetirementCalculator,
  CompoundInterestCalculator,
} from '@/components/goals';
import type { Goal } from '@/types';

export default function GoalsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState('goals');

  const { progress, isLoading } = useAllGoalProgress();

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingGoal(null);
    }
  };

  const activeGoals = progress.filter((p) => p.goal.status === 'active');
  const achievedGoals = progress.filter((p) => p.goal.status === 'achieved');
  const pausedGoals = progress.filter((p) => p.goal.status === 'paused');

  return (
    <>
      <Header title="Goals & Projections" />
      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="goals" className="gap-2">
                <Target className="h-4 w-4" />
                Goals
              </TabsTrigger>
              <TabsTrigger value="projections" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Projections
              </TabsTrigger>
              <TabsTrigger value="retirement" className="gap-2">
                <Landmark className="h-4 w-4" />
                Retirement
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-2">
                <Calculator className="h-4 w-4" />
                Calculator
              </TabsTrigger>
            </TabsList>

            {activeTab === 'goals' && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            )}
          </div>

          {/* Goals Tab */}
          <TabsContent value="goals" className="mt-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            ) : progress.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No goals yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first financial goal to start tracking progress
                  </p>
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Active Goals */}
                {activeGoals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Active Goals</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activeGoals.map((progress) => (
                        <GoalCard key={progress.goal.id} progress={progress} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Paused Goals */}
                {pausedGoals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-muted-foreground">Paused Goals</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pausedGoals.map((progress) => (
                        <GoalCard key={progress.goal.id} progress={progress} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Achieved Goals */}
                {achievedGoals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-green-600">Achieved Goals</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {achievedGoals.map((progress) => (
                        <GoalCard key={progress.goal.id} progress={progress} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Projections Tab */}
          <TabsContent value="projections" className="mt-6">
            <ProjectionChart />
          </TabsContent>

          {/* Retirement Tab */}
          <TabsContent value="retirement" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Australian Retirement Planning</CardTitle>
                  <CardDescription>
                    Calculate your retirement readiness based on superannuation and investment
                    holdings. Factors in 15% super earnings tax and preservation age rules.
                  </CardDescription>
                </CardHeader>
              </Card>
              <RetirementCalculator />
            </div>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compound Interest Calculator</CardTitle>
                  <CardDescription>
                    See how your money can grow over time with regular contributions and compound
                    returns. Great for planning savings goals and understanding long-term growth.
                  </CardDescription>
                </CardHeader>
              </Card>
              <CompoundInterestCalculator />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <GoalFormDialog open={isFormOpen} onOpenChange={handleCloseForm} goal={editingGoal} />
    </>
  );
}
