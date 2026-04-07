import { Outlet } from 'react-router';
import { Footer } from './Footer';

export function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
