import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/client/jobs")({
  component: () => <Outlet />,
});