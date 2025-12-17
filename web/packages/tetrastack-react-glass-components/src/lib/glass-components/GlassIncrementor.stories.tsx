import type { Meta, StoryObj } from '@storybook/react-vite';
import type React from 'react';
import { useState } from 'react';
import { GlassIncrementor } from './GlassIncrementor';

function IncrementorExample(
  props: React.ComponentProps<typeof GlassIncrementor>,
) {
  const [value, setValue] = useState(props.value);

  return (
    <GlassIncrementor
      {...props}
      value={value}
      onChange={async (newValue) => setValue(newValue)}
    />
  );
}

const meta: Meta<typeof GlassIncrementor> = {
  title: 'Glass Components/GlassIncrementor',
  component: GlassIncrementor,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    showAddButton: {
      control: 'boolean',
    },
    min: {
      control: { type: 'number' },
    },
    max: {
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GlassIncrementor>;

export const Default: Story = {
  args: {
    value: 1,
    min: 0,
    max: 5,
    showAddButton: true,
  },
  render: (args) => <IncrementorExample {...args} />,
};

export const WithoutAddButton: Story = {
  args: {
    value: 3,
    min: 1,
    max: 7,
    showAddButton: false,
  },
  render: (args) => <IncrementorExample {...args} />,
};
