import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlassSelect } from './GlassSelect';

const meta: Meta<typeof GlassSelect> = {
  title: 'Glass Components/GlassSelect',
  component: GlassSelect,
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
type Story = StoryObj<typeof GlassSelect>;

export const Default: Story = {
  args: {
    children: (
      <>
        <option value="">Select an option</option>
        <option value="one">Option one</option>
        <option value="two">Option two</option>
      </>
    ),
  },
};

export const LightIntensity: Story = {
  args: {
    intensity: 'light',
    children: (
      <>
        <option value="">Select an option</option>
        <option value="one">Option one</option>
        <option value="two">Option two</option>
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <option value="">Disabled select</option>
        <option value="one">Option one</option>
      </>
    ),
  },
};
