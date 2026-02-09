"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart3, Plus, X } from "lucide-react";
import { createPoll } from "@/app/actions/polls";

export function CreatePollForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => (i === index ? value : o)));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const result = await createPoll(eventId, question, options);

    if (result.success) {
      setOpen(false);
      setQuestion("");
      setOptions(["", ""]);
    } else {
      setError(result.error ?? "Failed to create poll");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="mr-2 h-4 w-4" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Which restaurant?"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Options (2–6)</Label>
            {options.map((option, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button variant="ghost" size="sm" onClick={addOption}>
                <Plus className="mr-2 h-4 w-4" />
                Add option
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Poll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
