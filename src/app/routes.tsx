import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FinanceTracker } from './pages/FinanceTracker';
import { SplitBill } from './pages/SplitBill';
import { BudgetPlanner } from './pages/BudgetPlanner';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/finance-tracker',
    element: (
      <ProtectedRoute>
        <FinanceTracker />
      </ProtectedRoute>
    ),
  },
  {
    path: '/split-bill',
    element: <SplitBill />,
  },
  {
    path: '/budget-planner',
    element: (
      <ProtectedRoute>
        <BudgetPlanner />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    Component: NotFound,
  },
]);