import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FinanceTracker } from './pages/FinanceTracker';
import { SplitBill } from './pages/SplitBill';
import { BudgetPlanner } from './pages/BudgetPlanner';
import { SharedBill } from './pages/SharedBill';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/MainLayout';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: '/',
        Component: Dashboard,
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
    ],
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/s/:id',
    element: <SharedBill />,
  },
]);