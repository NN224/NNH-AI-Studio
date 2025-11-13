import { ComingSoon } from '@/components/common/coming-soon';

export default function WebhooksPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-4xl">
        <ComingSoon
          title="Webhook Automations"
          description="Event-driven triggers, AI filters, and low-code integrations are on the roadmap. Soon you'll connect NNH AI Studio to every workflow in minutes."
          icon="🔗"
        />
      </div>
    </div>
  );
}

