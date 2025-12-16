import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApplicationLayoutNav } from './ApplicationLayoutNav';

const meta: Meta<typeof ApplicationLayoutNav> = {
  title: 'Glass Components/ApplicationLayoutNav',
  component: ApplicationLayoutNav,
  tags: ['autodocs'],
  argTypes: {
    activeValue: { control: 'text' },
    onSelect: { action: 'selected' },
  },
};

export default meta;
type Story = StoryObj<typeof ApplicationLayoutNav>;

const defaultOptions = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'users', label: 'Users' },
  { value: 'settings', label: 'Settings' },
];

export const Default: Story = {
  args: {
    options: defaultOptions,
    activeValue: 'dashboard',
  },
};

export const WithLinks: Story = {
  args: {
    options: [
      { value: 'home', label: 'Home', href: '/' },
      { value: 'about', label: 'About', href: '/about' },
      { value: 'contact', label: 'Contact', href: '/contact' },
    ],
    activeValue: 'home',
  },
};

export const MixedMode: Story = {
  args: {
    options: [
      { value: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { value: 'profile', label: 'Profile' }, // Button
      { value: 'logout', label: 'Logout' }, // Button
    ],
    activeValue: 'dashboard',
  },
};
