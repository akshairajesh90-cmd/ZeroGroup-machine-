import React from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { phone?: string; email?: string; user?: string };
}) {
  const prefilled = searchParams?.phone || searchParams?.email || searchParams?.user || "";

  return <ResetPasswordClient prefilledIdentifier={prefilled} />;
}
