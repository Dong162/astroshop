import { Navigate } from "react-router-dom";
import { isAdminSessionValid } from "../lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAdminSessionValid()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
