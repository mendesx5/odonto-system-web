import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  ssr: false,
  component: IndexRedirect,
});

function IndexRedirect() {
  return <Navigate to={getToken() ? "/dashboard" : "/auth"} replace />;
}
