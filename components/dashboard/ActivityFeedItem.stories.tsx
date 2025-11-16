import type { Meta, StoryObj } from '@storybook/react';
import { Star, Send, HelpCircle } from 'lucide-react';
import ActivityFeedItem from './ActivityFeedItem';

const meta: Meta<typeof ActivityFeedItem> = {
  title: 'Dashboard/ActivityFeedItem',
  component: ActivityFeedItem,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
    timestamp: { control: 'text' },
    icon: { control: false },
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ActivityFeedItem>;

export const NewReview: Story = {
  args: {
    icon: <Star className="h-5 w-5 text-yellow-500" />,
    message: (
      <>
        You received a new <strong>5-star review</strong>.
      </>
    ),
    timestamp: '5 minutes ago',
    isLoading: false,
  },
};

export const PostPublished: Story = {
  args: {
    icon: <Send className="h-5 w-5 text-blue-500" />,
    message: (
      <>
        A new post titled "<strong>Summer Sale!</strong>" was published.
      </>
    ),
    timestamp: '1 hour ago',
    isLoading: false,
  },
};

export const NewQuestion: Story = {
  args: {
    icon: <HelpCircle className="h-5 w-5 text-green-500" />,
    message: (
      <>
        A customer asked a new question about "<strong>opening hours</strong>".
      </>
    ),
    timestamp: '3 hours ago',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    icon: <></>,
    message: '',
    timestamp: '',
    isLoading: true,
  },
};
