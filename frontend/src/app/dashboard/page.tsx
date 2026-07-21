"use client";

import dynamic from "next/dynamic";
import { WarRoomLoader } from "@/components/dashboard/war-room-loader";

/**
 * GSAP must stay out of the RSC/server vendor graph. Load the war room
 * client-only so Next never tries to open `.next/server/vendor-chunks/gsap.js`.
 */
const WarRoom = dynamic(
  () =>
    import("@/components/dashboard/war-room").then((m) => m.WarRoom),
  {
    ssr: false,
    loading: () => <WarRoomLoader />,
  },
);

export default function DashboardPage() {
  return <WarRoom />;
}
