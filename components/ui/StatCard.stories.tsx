// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import { DollarSign, TrendingDown, TrendingUp, User } from "lucide-react";
import StatCard from "./StatCard";

const meta: Meta<typeof StatCard> = {
  title: "UI/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    value: { control: "text" },
    change: { control: "text" },
    changeType: {
      control: "radio",
      options: ["positive", "negative", "neutral"],
    },
    icon: { control: false },
    isLoading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    title: "Total Revenue",
    value: "$45,231.89",
    icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    change: "+20.1% from last month",
    changeType: "neutral",
    isLoading: false,
  },
};

export const WithPositiveChange: Story = {
  args: {
    title: "Subscriptions",
    value: "+2350",
    icon: <User className="h-4 w-4 text-muted-foreground" />,
    change: "+180.1% from last month",
    changeType: "positive",
    isLoading: false,
  },
};

export const WithNegativeChange: Story = {
  args: {
    title: "Sales",
    value: "+12,234",
    icon: <TrendingDown className="h-4 w-4 text-muted-foreground" />,
    change: "-19% from last month",
    changeType: "negative",
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    title: "Active Users",
    value: "",
    icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
    change: "",
    isLoading: true,
  },
};
