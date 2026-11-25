import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  href?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendPositive, href }: StatCardProps) {
  const card = (
    <div className="bg-card rounded-xl p-4 sm:p-6 border border-border hover:border-accent transition-colors h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-2">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-2 ${trendPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trendPositive ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="bg-primary/10 p-2 sm:p-3 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{card}</Link> : card;
}
