import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassInput } from './GlassInput';

const meta: Meta<typeof GlassInput> = {
  title: 'Glass Components/GlassInput',
  component: GlassInput,
  tags: ['autodocs'],
  argTypes: {
    intensity: {
      control: { type: 'select' },
      options: ['light', 'medium', 'strong'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GlassInput>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const LightIntensity: Story = {
  args: {
    placeholder: 'Light intensity',
    intensity: 'light',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};
