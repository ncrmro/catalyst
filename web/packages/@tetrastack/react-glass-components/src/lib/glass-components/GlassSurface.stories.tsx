import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassSurface } from './GlassSurface';

const meta: Meta<typeof GlassSurface> = {
  title: 'Glass Components/GlassSurface',
  component: GlassSurface,
  tags: ['autodocs'],
  argTypes: {
    intensity: {
      control: { type: 'select' },
      options: ['light', 'medium', 'strong'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary', 'tertiary', 'error'],
    },
    glass: {
      control: 'boolean',
    },
    bordered: {
      control: 'boolean',
    },
    shadowed: {
      control: 'boolean',
    },
    as: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GlassSurface>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Default Surface</h3>
        <p>This is a standard glass surface with default settings.</p>
      </div>
    ),
  },
};

export const LightIntensity: Story = {
  args: {
    intensity: 'light',
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Light Intensity</h3>
        <p>A subtle glass effect with lower blur and opacity.</p>
      </div>
    ),
  },
};

export const StrongIntensity: Story = {
  args: {
    intensity: 'strong',
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Strong Intensity</h3>
        <p>A heavy glass effect with higher blur and opacity.</p>
      </div>
    ),
  },
};

export const PrimaryVariant: Story = {
  args: {
    variant: 'primary',
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2 text-primary">Primary Variant</h3>
        <p className="text-on-surface">Tinted with the primary brand color.</p>
      </div>
    ),
  },
};

export const SecondaryVariant: Story = {
  args: {
    variant: 'secondary',
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2 text-secondary">
          Secondary Variant
        </h3>
        <p className="text-on-surface">
          Tinted with the secondary brand color.
        </p>
      </div>
    ),
  },
};

export const NoGlass: Story = {
  args: {
    glass: false,
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Glass Disabled</h3>
        <p>
          Solid background color without backdrop filter, useful for performance
          or fallback.
        </p>
      </div>
    ),
  },
};

export const NoBorderNoShadow: Story = {
  args: {
    bordered: false,
    shadowed: false,
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Minimal</h3>
        <p>No border and no shadow.</p>
      </div>
    ),
  },
};
