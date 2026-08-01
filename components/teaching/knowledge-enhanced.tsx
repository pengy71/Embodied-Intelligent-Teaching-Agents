"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStudentAssistant } from "@/lib/teaching/use-student-assistant";
import Link from "next/link";
import { Sparkles, RefreshCw, BookOpen, Target, ChevronRight } from "lucide-react";

export function KnowledgeEnhanced() {
  const { data, isLoading, error, revalidate } = useStudentAssistant();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading knowledge base data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently hide if knowledge base is not available
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Knowledge-based recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Knowledge-Based Recommendations
              </CardTitle>
              <CardDescription>Based on {data.knowledgeStats.totalPoints} knowledge points</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={revalidate}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.reason}</p>
                  <Badge variant={rec.priority === "high" ? "default" : "secondary"} className="mt-1.5 text-xs">
                    {rec.priority === "high" ? "High Priority" : "Recommended"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Knowledge progress overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{data.knowledgeStats.masteredPoints}/{data.knowledgeStats.totalPoints}</p>
              <p className="text-xs text-muted-foreground">Knowledge Points Mastered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <Target className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{data.knowledgeStats.weakPoints}</p>
              <p className="text-xs text-muted-foreground">Weak Points</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{data.learningPath.length}</p>
              <p className="text-xs text-muted-foreground">Course Chapters</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today suggestions */}
      {data.todaySuggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Knowledge-Based Plan</CardTitle>
            <CardDescription>AI-generated based on your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.todaySuggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.reason} ~ {s.estimatedTime}min</p>
                  </div>
                  <Badge variant={s.type === "new" ? "default" : "secondary"} className="text-xs">
                    {s.type === "new" ? "New" : "Review"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
