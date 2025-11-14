import { render, screen } from '@/tests/setup/test-utils';
import { DashboardStatsCard } from '@/components/dashboard/dashboard-stats-card';
import { TrendingUp, TrendingDown } from 'lucide-react';

describe('DashboardStatsCard', () => {
  const defaultProps = {
    title: 'Total Reviews',
    value: '1,234',
    icon: TrendingUp,
    trend: 12.5,
    description: 'vs last month',
  };

  it('should render with all props', () => {
    render(<DashboardStatsCard {...defaultProps} />);

    expect(screen.getByText('Total Reviews')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('should render with negative trend', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        trend={-8.3}
        icon={TrendingDown}
      />
    );

    expect(screen.getByText('-8.3%')).toBeInTheDocument();
    // Check for red/negative color class
    const trendElement = screen.getByText('-8.3%');
    expect(trendElement).toHaveClass('text-red-600');
  });

  it('should render without trend', () => {
    const { trend, ...propsWithoutTrend } = defaultProps;
    render(<DashboardStatsCard {...propsWithoutTrend} />);

    expect(screen.getByText('Total Reviews')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<DashboardStatsCard {...defaultProps} loading />);

    // Should show skeleton loaders
    expect(screen.getByTestId('stats-card-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        error="Failed to load data"
      />
    );

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(
      <DashboardStatsCard
        {...defaultProps}
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button');
    card.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DashboardStatsCard
        {...defaultProps}
        className="custom-class"
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('should format large numbers correctly', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        value="1,234,567"
      />
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('should handle zero trend', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        trend={0}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    // Should have neutral color
    const trendElement = screen.getByText('0%');
    expect(trendElement).toHaveClass('text-gray-600');
  });

  it('should render with custom icon color', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        iconColor="text-blue-500"
      />
    );

    const iconContainer = screen.getByTestId('stats-card-icon');
    expect(iconContainer).toHaveClass('text-blue-500');
  });

  it('should support internationalization', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        title="nav.reviews"
      />,
      { locale: 'ar' }
    );

    // The mock returns the key, but in real app it would be translated
    expect(screen.getByText('nav.reviews')).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    const handleClick = jest.fn();
    render(
      <DashboardStatsCard
        {...defaultProps}
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button');
    
    // Should be focusable
    card.focus();
    expect(document.activeElement).toBe(card);

    // Should handle Enter key
    card.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(handleClick).toHaveBeenCalled();
  });

  it('should have proper ARIA labels', () => {
    render(
      <DashboardStatsCard
        {...defaultProps}
        ariaLabel="View total reviews details"
      />
    );

    const card = screen.getByRole('button', { name: 'View total reviews details' });
    expect(card).toBeInTheDocument();
  });

  describe('responsive behavior', () => {
    it('should adjust layout on small screens', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<DashboardStatsCard {...defaultProps} />);
      
      // Check for mobile-specific classes
      expect(container.firstChild).toHaveClass('p-4');
    });

    it('should show full layout on large screens', () => {
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));

      const { container } = render(<DashboardStatsCard {...defaultProps} />);
      
      // Check for desktop-specific classes
      expect(container.firstChild).toHaveClass('p-6');
    });
  });
});
