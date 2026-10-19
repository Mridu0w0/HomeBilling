// src/components/Providers.jsx
"use client";

import { useRouter } from "next/navigation";
import { RouterProvider } from "@heroui/react";
import { AuthProvider } from "@/context/AuthContext";

export function Providers({ children }) {
  const router = useRouter();

  return (
    <RouterProvider navigate={router.push}>
      <AuthProvider>{children}</AuthProvider>
    </RouterProvider>
  );
}
