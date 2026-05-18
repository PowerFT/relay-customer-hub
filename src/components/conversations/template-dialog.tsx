"use client";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOCK_TEMPLATES = [
  {
    id: "tmpl_followup",
    name: "Follow-up check-in",
    body: "Hi {{first_name}}, checking in on your recent order — anything we can help with?",
  },
  {
    id: "tmpl_appointment",
    name: "Appointment reminder",
    body: "Hi {{first_name}}, a quick reminder about your appointment on {{date}}. Reply YES to confirm.",
  },
];

export function TemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a WhatsApp template</DialogTitle>
          <DialogDescription>
            Outside the 24-hour window, you must use a pre-approved template to
            start a new conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 my-2">
          {MOCK_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                toast("Coming soon", {
                  description: "Template send wires up in a future iteration.",
                });
                onOpenChange(false);
              }}
              className="text-left border border-border rounded-lg p-3 hover:bg-canvas"
            >
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-text-secondary mt-1 line-clamp-2">
                {t.body}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <p className="text-xs text-text-tertiary">
            Template send not yet implemented — MVP stub.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
