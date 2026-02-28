"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BloomBatchDetail } from "@/types/bloom";

interface UnderstandingTabProps {
  data: BloomBatchDetail;
}

type UnderstandingSection = "understanding" | "reasoning" | "motivation";

interface SidebarOption {
  id: UnderstandingSection;
  label: string;
  content: string | null;
}

export function UnderstandingTab({ data }: UnderstandingTabProps) {
  const { understanding } = data;
  const [activeSection, setActiveSection] =
    useState<UnderstandingSection>("understanding");

  if (!understanding) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No understanding data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const sidebarOptions: SidebarOption[] = [
    {
      id: "understanding",
      label: "Understanding",
      content: understanding.understanding,
    },
    {
      id: "reasoning",
      label: "Understanding Reasoning",
      content: understanding.understanding_reasoning,
    },
    {
      id: "motivation",
      label: "Scientific Motivation",
      content: understanding.scientific_motivation,
    },
  ];

  const activeContent =
    sidebarOptions.find((opt) => opt.id === activeSection)?.content ||
    "No content available";

  return (
    <div className="flex gap-4 h-full">
      <Card className="w-64 shrink-0">
        <CardContent className="px-4">
          <nav className="space-y-1">
            {sidebarOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveSection(option.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeSection === option.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardContent className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown rehypePlugins={[rehypeRaw]}>{activeContent}</Markdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
