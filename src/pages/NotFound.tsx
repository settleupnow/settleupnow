import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="type-display mb-4">404</h1>
        <p className="type-body-small mb-4">Oops! Page not found</p>
        <a href="/" className="text-primary type-ui-label hover:underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;