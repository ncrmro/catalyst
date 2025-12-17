import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Glass Components/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

const demoItems = [
  { label: 'Home', href: '/', isHome: true },
  { label: 'Recipes', href: '/recipes' },
  { label: 'Pasta Carbonara' },
];

export const Default: Story = {
  args: {
    items: demoItems,
  },
};

export const WithoutHomeIcon: Story = {
  args: {
    items: demoItems,
    showHomeIcon: false,
  },
};
