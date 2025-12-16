import type { Meta, StoryObj } from '@storybook/react-vite';
import { ApplicationLayout } from './ApplicationLayout';
import { ApplicationLayoutNav } from './ApplicationLayoutNav';
import { GlassCard } from './GlassCard';

const meta: Meta<typeof ApplicationLayout> = {
  title: 'Glass Components/ApplicationLayout',
  component: ApplicationLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ApplicationLayout>;

const navOptions = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'settings', label: 'Settings' },
  { value: 'profile', label: 'Profile' },
];

export const Default: Story = {
  args: {
    header: 'My Application',
    nav: (
      <ApplicationLayoutNav
        options={navOptions}
        activeValue="dashboard"
        onSelect={(val) => console.log('Selected:', val)}
      />
    ),
    children: (
      <div className="space-y-6">
        <GlassCard>
          <h2 className="text-xl font-bold mb-4">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold">128</div>
              <div className="text-sm opacity-70">Total Users</div>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
              <div className="text-2xl font-bold">45</div>
              <div className="text-sm opacity-70">Active Now</div>
            </div>
            <div className="p-4 bg-tertiary/10 rounded-lg">
              <div className="text-2xl font-bold">$12.4k</div>
              <div className="text-sm opacity-70">Revenue</div>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="font-bold mb-2">Recent Activity</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between p-2 hover:bg-white/5 rounded">
                <span>User login</span>
                <span className="opacity-50">2m ago</span>
              </li>
              <li className="flex justify-between p-2 hover:bg-white/5 rounded">
                <span>New order</span>
                <span className="opacity-50">15m ago</span>
              </li>
              <li className="flex justify-between p-2 hover:bg-white/5 rounded">
                <span>System update</span>
                <span className="opacity-50">1h ago</span>
              </li>
            </ul>
          </GlassCard>

          <GlassCard>
            <h3 className="font-bold mb-2">Notifications</h3>
            <p className="text-sm text-on-surface-variant">
              No new notifications.
            </p>
          </GlassCard>
        </div>
      </div>
    ),
  },
};
