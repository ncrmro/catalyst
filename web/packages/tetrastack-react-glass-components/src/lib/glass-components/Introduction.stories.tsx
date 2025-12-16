import type { Meta } from '@storybook/react-vite';
import { GlassCard } from './GlassCard';

const meta: Meta = {
  title: 'Glass Components/Introduction',
  parameters: {
    layout: 'padded',
    controls: { hideNoControlsWarning: true },
  },
};

export default meta;

export const Welcome = {
  render: () => (
    <div className="prose max-w-none">
      <h1>Glass Components Design System</h1>
      <p className="text-lg text-on-surface-variant">
        A minimal, framework-agnostic React component library featuring
        glass-morphism effects.
      </p>

      <div className="my-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <GlassCard>
          <h3 className="text-lg font-bold mb-2">Framework Agnostic</h3>
          <p>
            Works in Next.js, Remix, Vite, or any React environment. Zero
            framework dependencies.
          </p>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-bold mb-2">Glass Effect</h3>
          <p>
            Built-in glass-morphism using backdrop-filter and semi-transparent
            layers.
          </p>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-bold mb-2">Composability</h3>
          <p>
            Built on small, reusable primitives like GlassSurface and GlassCard.
          </p>
        </GlassCard>
      </div>

      <h2>Key Components</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-bold">Application Layouts</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong>ApplicationLayout</strong>: The main shell for your app,
              featuring a sticky glass header.
            </li>
            <li>
              <strong>ApplicationLayoutNav</strong>: A pill-shaped navigation
              toggle for the header.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold">Surfaces & Containers</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong>GlassCard</strong>: The standard container for content,
              extending GlassSurface with padding and rounded corners.
            </li>
            <li>
              <strong>GlassSurface</strong>: The low-level primitive for
              creating glass effects.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold">Inputs & Actions</h3>
          <ul className="list-disc pl-5">
            <li>
              <strong>GlassButton</strong>: Buttons with glass styling and
              various variants.
            </li>
          </ul>
        </div>
      </div>
    </div>
  ),
};
