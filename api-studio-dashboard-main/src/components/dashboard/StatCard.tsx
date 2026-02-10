import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  trend?: {
    direction: "up" | "down" | "neutral";
    text: string;
  };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = "secondary",
  trend,
  onClick,
  className = "",
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`border-border bg-card/70 backdrop-blur-sm transition-all duration-200 ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5" : ""
      } ${className}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            {title}
          </span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {value}
          </div>

          {badgeText && (
            <Badge variant={badgeVariant} className="text-[10px] font-bold px-2 py-0.5">
              {badgeText}
            </Badge>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={`font-semibold ${
                  trend.direction === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : trend.direction === "down"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {trend.text}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

