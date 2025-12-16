import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassCard } from './GlassCard';

const meta: Meta<typeof GlassCard> = {
  title: 'Glass Components/GlassCard',
  component: GlassCard,
  tags: ['autodocs'],
  argTypes: {
    padded: {
      control: 'boolean',
    },
    intensity: {
      control: { type: 'select' },
      options: ['light', 'medium', 'strong'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary', 'tertiary', 'error'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof GlassCard>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-bold mb-2">Card Title</h3>
        <p>This is a standard glass card with default settings.</p>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    padded: false,
    children: (
      <div className="p-0">
        <img
          src="https://placehold.co/600x200"
          alt="Placeholder"
          className="w-full h-32 object-cover"
        />
        <div className="p-4">
          <h3 className="text-lg font-bold mb-2">Card with Image</h3>
          <p>Padding disabled on card to allow full-bleed image.</p>
        </div>
      </div>
    ),
  },
};
