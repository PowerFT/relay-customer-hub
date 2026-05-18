import { Construction } from "lucide-react";

export function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-10 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-3">
        <Construction size={28} />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary max-w-md">
        Under construction — outside MVP scope. Will land in a future iteration.
      </p>
    </div>
  );
}
