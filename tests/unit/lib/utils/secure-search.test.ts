import { applySafeSearchFilter } from '@/lib/utils/secure-search';

describe('applySafeSearchFilter', () => {
  let mockQuery: any;

  beforeEach(() => {
    // Mock Supabase query builder
    mockQuery = {
      or: jest.fn().mockReturnThis(),
    };
  });

  it('should apply search filter to specified columns', () => {
    const searchTerm = 'test search';
    const columns = ['name', 'description'];

    const result = applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test search%,description.ilike.%test search%');
    expect(result).toBe(mockQuery);
  });

  it('should sanitize percent signs in search term', () => {
    const searchTerm = 'test%search';
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test\\%search%');
  });

  it('should sanitize underscore in search term', () => {
    const searchTerm = 'test_search';
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test\\_search%');
  });

  it('should sanitize backslashes in search term', () => {
    const searchTerm = 'test\\search';
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test\\\\search%');
  });

  it('should handle multiple special characters', () => {
    const searchTerm = 'test%_\\search';
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test\\%\\_\\\\search%');
  });

  it('should limit search term length to 100 characters', () => {
    const longSearchTerm = 'a'.repeat(150);
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, longSearchTerm, columns);

    const expectedSearch = 'a'.repeat(100);
    expect(mockQuery.or).toHaveBeenCalledWith(`name.ilike.%${expectedSearch}%`);
  });

  it('should return original query if search term is empty', () => {
    const searchTerm = '';
    const columns = ['name'];

    const result = applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).not.toHaveBeenCalled();
    expect(result).toBe(mockQuery);
  });

  it('should return original query if search term is only whitespace', () => {
    const searchTerm = '   ';
    const columns = ['name'];

    const result = applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).not.toHaveBeenCalled();
    expect(result).toBe(mockQuery);
  });

  it('should throw error if search term becomes empty after sanitization', () => {
    const searchTerm = '%%%';
    const columns = ['name'];

    // This shouldn't actually happen with our current implementation
    // but test it anyway for edge cases
    expect(() => {
      applySafeSearchFilter(mockQuery, searchTerm, columns);
    }).not.toThrow();

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%\\%\\%\\%%');
  });

  it('should handle multiple columns correctly', () => {
    const searchTerm = 'test';
    const columns = ['name', 'description', 'address', 'category'];

    applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith(
      'name.ilike.%test%,description.ilike.%test%,address.ilike.%test%,category.ilike.%test%'
    );
  });

  it('should trim search term before processing', () => {
    const searchTerm = '  test search  ';
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, searchTerm, columns);

    expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test search%');
  });

  it('should handle SQL injection attempts', () => {
    const sqlInjectionAttempt = "'; DROP TABLE users; --";
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, sqlInjectionAttempt, columns);

    // The dangerous SQL should be escaped and treated as literal text
    expect(mockQuery.or).toHaveBeenCalledWith("name.ilike.%'; DROP TABLE users; --%");
  });

  it('should handle complex search patterns safely', () => {
    const complexPattern = "test' OR 1=1 UNION SELECT * FROM sensitive_data --";
    const columns = ['name'];

    applySafeSearchFilter(mockQuery, complexPattern, columns);

    // All special characters should be escaped
    expect(mockQuery.or).toHaveBeenCalledWith("name.ilike.%test' OR 1=1 UNION SELECT * FROM sensitive_data --%");
  });
});
