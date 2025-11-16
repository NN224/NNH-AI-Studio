import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css';
import { withThemeByClassName } from '@storybook/addon-themes';
import React from 'react';

import * as NextImage from 'next/image';
import * as NextLink from 'next/link';

const OriginalNextImage = NextImage.default;
const OriginalNextLink = NextLink.default;

Object.defineProperty(NextImage, 'default', {
  configurable: true,
  value: (props: any) => React.createElement(OriginalNextImage, { ...props, unoptimized: true }),
});

Object.defineProperty(NextLink, 'default', {
  configurable: true,
  value: (props: any) => React.createElement(OriginalNextLink, props),
});


const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;