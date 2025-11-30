// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";
import { PlusCircle } from "lucide-react";
import QuickActionButton from "./QuickActionButton";

const meta: Meta<typeof QuickActionButton> = {
  title: "Dashboard/QuickActionButton",
  component: QuickActionButton,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    icon: { control: false },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof QuickActionButton>;

export const Default: Story = {
  args: {
    icon: <PlusCircle className="h-5 w-5" />,
    label: "Add New Post",
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    icon: <PlusCircle className="h-5 w-5" />,
    label: "Add New Post",
    disabled: true,
  },
};
