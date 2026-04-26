# Testing Patterns

> "Как тестировать frontend" — паттерны для тестов.

---

## Unit Tests

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { OrderCard } from './OrderCard';

describe('OrderCard', () => {
  it('renders order status', () => {
    render(<OrderCard order={mockOrder} />);
    
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<OrderCard order={null} isLoading />);
    
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
```

---

## Integration Tests

### API Integration

```typescript
import { server } from '../mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());

describe('Orders API', () => {
  it('fetches orders', async () => {
    const { getByText } = render(<OrdersPage />);
    
    await waitFor(() => {
      expect(getByText('Order 1')).toBeInTheDocument();
    });
  });
});
```

---

## Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useOrders } from './useOrders';

describe('useOrders', () => {
  it('fetches orders', async () => {
    const { result } = renderHook(() => useOrders());
    
    await waitFor(() => {
      expect(result.current.data).toHaveLength(10);
    });
  });
});
```

---

## Mocking

### MSW for API

```typescript
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

const worker = setupWorker(
  http.get('/api/orders', () => {
    return HttpResponse.json([
      { id: '1', status: 'pending' },
    ]);
  })
);
```

### Jest Mocks

```typescript
jest.mock('../lib/api', () => ({
  getOrders: jest.fn().mockResolvedValue([]),
}));
```

---

## Test Utilities

### Custom render

```typescript
import { AllTheProviders, render } from '../test-utils';

const customRender = (ui: ReactElement) => {
  return render(ui, { wrapper: AllTheProviders });
};

// Использование
customRender(<MyComponent />);
```

---

## Best Practices

1. **AAA** — Arrange, Act, Assert
2. **Name describes behavior** — `it('fetches orders')`, not `it('works')`
3. **Test happy path + edges** — успех + граничные случаи
4. **Mock external** — внешние зависимости
5. **Component vs Integration** — юнит для логики, интеграция для API