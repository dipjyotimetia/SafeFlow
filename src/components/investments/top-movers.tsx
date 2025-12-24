'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHoldings } from '@/hooks';
import { formatAUD } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Building2, Bitcoin, Landmark } from 'lucide-react';
import type { Holding, HoldingType } from '@/types';

const TYPE_ICONS: Record<HoldingType, React.ReactNode> = {
  etf: <BarChart3 className="h-3 w-3" />,
  stock: <Building2 className="h-3 w-3" />,
  crypto: <Bitcoin className="h-3 w-3" />,
  'managed-fund': <Landmark className="h-3 w-3" />,
};

interface MoverData {
  holding: Holding;
  gainLoss: number;
  gainLossPercent: number;
}

function MoverItem({
  data,
  type,
}: {
  data: MoverData;
  type: 'gainer' | 'loser';
}) {
  const isPositive = type === 'gainer';

  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            'p-1.5 rounded-full',
            isPositive
              ? 'bg-green-100 text-success dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-destructive dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">
              {data.holding.symbol}
            </span>
            <span className="text-muted-foreground">
              {TYPE_ICONS[data.holding.type]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {data.holding.name}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            isPositive ? 'text-success' : 'text-destructive'
          )}
        >
          {isPositive ? '+' : ''}
          {formatAUD(data.gainLoss)}
        </p>
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 py-0',
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {isPositive ? '+' : ''}
          {data.gainLossPercent.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function TopMovers() {
  const { holdings, isLoading } = useHoldings();

  const { gainers, losers } = useMemo(() => {
    const movers: MoverData[] = holdings
      .filter((h) => h.currentValue !== undefined && h.costBasis > 0)
      .map((h) => {
        const gainLoss = (h.currentValue || 0) - h.costBasis;
        const gainLossPercent =
          h.costBasis > 0 ? (gainLoss / h.costBasis) * 100 : 0;
        return {
          holding: h,
          gainLoss,
          gainLossPercent,
        };
      });

    // Sort by gain/loss amount (absolute value for better ranking)
    const sortedByValue = [...movers].sort((a, b) => b.gainLoss - a.gainLoss);

    // Top 3 gainers (positive gain/loss, sorted by value)
    const gainers = sortedByValue
      .filter((m) => m.gainLoss > 0)
      .slice(0, 3);

    // Top 3 losers (negative gain/loss, sorted by most negative)
    const losers = sortedByValue
      .filter((m) => m.gainLoss < 0)
      .reverse()
      .slice(0, 3);

    return { gainers, losers };
  }, [holdings]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Movers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Movers</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="Add holdings to see top movers" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Movers</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="gainers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="gainers" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              Gainers
              {gainers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {gainers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="losers" className="text-xs gap-1">
              <TrendingDown className="h-3 w-3" />
              Losers
              {losers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {losers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="gainers" className="mt-3">
            {gainers.length > 0 ? (
              <div>
                {gainers.map((data) => (
                  <MoverItem
                    key={data.holding.id}
                    data={data}
                    type="gainer"
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No gains yet" />
            )}
          </TabsContent>
          <TabsContent value="losers" className="mt-3">
            {losers.length > 0 ? (
              <div>
                {losers.map((data) => (
                  <MoverItem key={data.holding.id} data={data} type="loser" />
                ))}
              </div>
            ) : (
              <EmptyState message="No losses - great job!" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
