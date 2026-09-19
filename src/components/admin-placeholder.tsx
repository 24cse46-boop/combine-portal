import { Panel } from "@/components/ui";

export function AdminPagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-xl font-semibold mb-1">{title}</h1>
      <p className="text-sm text-ink-muted mb-8">{description}</p>
      <Panel className="p-8 text-center">
        <p className="text-sm text-ink-muted">Built out in {phase}. Route and admin-only access are wired now.</p>
      </Panel>
    </div>
  );
}
