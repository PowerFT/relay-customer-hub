import { Button } from "@/components/ui/button";
import { MessageSquare, MailOpen, MessagesSquare, CheckCircle2 } from "lucide-react";

const cards = [
  { title: "Total Messages", value: "1,847", icon: MessageSquare, gradient: "gradient-blue" },
  { title: "Unread", value: "42", icon: MailOpen, gradient: "gradient-pink" },
  { title: "Active Conversations", value: "186", icon: MessagesSquare, gradient: "gradient-orange" },
  { title: "Resolved Today", value: "73", icon: CheckCircle2, gradient: "gradient-purple" },
];

const channels = [
  { name: "WhatsApp", className: "bg-c-whatsapp" },
  { name: "Messenger", className: "bg-c-messenger" },
  { name: "Instagram", className: "bg-c-instagram" },
  { name: "TikTok", className: "bg-c-tiktok" },
  { name: "LinkedIn", className: "bg-c-linkedin" },
  { name: "Webchat", className: "bg-c-webchat" },
  { name: "Email", className: "bg-c-email" },
  { name: "SMS", className: "bg-c-sms" },
];

export default function DesignCheck() {
  return (
    <div className="p-10 flex flex-col gap-10 max-w-6xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Design tokens — Row 3 verify</h1>
        <p className="mt-1 text-sm text-text-secondary">
          If gradients, channel colors, and the primary button all render with the right hues, the @theme port is healthy.
        </p>
      </header>

      <section className="flex gap-3 items-center">
        <Button>Primary action</Button>
        <Button variant="outline">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <span className="text-sm text-text-secondary ml-4">→ primary should be brand teal #068B78</span>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">Stat-card gradients</h2>
        <div className="grid grid-cols-4 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className={`${c.gradient} rounded-2xl p-5 text-white shadow-md min-h-40 flex flex-col`}>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium opacity-90">{c.title}</span>
                  <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold mt-2 tracking-tight">{c.value}</div>
                <div className="h-[3px] bg-white/30 mt-auto rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-white/70" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">Channel colors</h2>
        <div className="flex flex-wrap gap-3">
          {channels.map((ch) => (
            <div key={ch.name} className="flex items-center gap-2">
              <span className={`${ch.className} w-6 h-6 rounded-md shadow-sm`} />
              <span className="text-sm">{ch.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">Surfaces &amp; text</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-canvas border border-border rounded-xl p-4">
            <div className="text-xs text-text-secondary">canvas</div>
            <div className="text-text-primary">Primary text on canvas</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-xs text-text-secondary">surface</div>
            <div className="text-text-primary">Primary text on surface</div>
          </div>
          <div className="bg-sidebar-bg rounded-xl p-4">
            <div className="text-xs text-sidebar-text">sidebar-bg</div>
            <div className="text-sidebar-text-active">Sidebar active text</div>
          </div>
        </div>
      </section>

      <section className="flex gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-success/15 text-success">success</span>
        <span className="px-2 py-1 rounded-full bg-warning/15 text-warning">warning</span>
        <span className="px-2 py-1 rounded-full bg-danger/15 text-danger">danger</span>
        <span className="px-2 py-1 rounded-full bg-unread-badge text-white">unread</span>
      </section>
    </div>
  );
}
