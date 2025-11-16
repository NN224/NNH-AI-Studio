import type { Meta, StoryObj } from '@storybook/react';
import { PerformanceChart } from './PerformanceChart';

const meta: Meta<typeof PerformanceChart> = {
  title: 'Charts/PerformanceChart',
  component: PerformanceChart,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    dataKey: { control: 'text' },
    xAxisKey: { control: 'text' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PerformanceChart>;

const sampleData = [
  { name: 'Day 1', value: 30 },
  { name: 'Day 2', value: 45 },
  { name: 'Day 3', value: 28 },
  { name: 'Day 4', value: 50 },
  { name: 'Day 5', value: 65 },
  { name: 'Day 6', value: 55 },
  { name: 'Day 7', value: 72 },
];

export const Default: Story = {
  args: {
    title: 'Weekly Performance',
    data: sampleData,
    dataKey: 'value',
    xAxisKey: 'name',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    title: 'Weekly Performance',
    data: [],
    dataKey: 'value',
    xAxisKey: 'name',
    isLoading: true,
  },
};
