import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FinanceTracker } from './pages/FinanceTracker';
import { SplitBill } from './pages/SplitBill';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
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
    element: (
      <ProtectedRoute>
        <SplitBill />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    Component: NotFound,
  },
]);