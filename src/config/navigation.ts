import {
  Boxes,
  ClipboardList,
  Gauge,
  RefreshCcw,
  ScanSearch,
  Settings,
} from "lucide-react";

export const mainNavigation = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/audit", label: "Audit", icon: ClipboardList },
  { href: "/sync", label: "Sync", icon: RefreshCcw },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const familyLinks = [
  { href: "/products?family=inductors", label: "Inductors" },
  { href: "/products?family=common_mode_chokes", label: "Common Mode Chokes" },
  { href: "/products?family=transformers", label: "Transformers" },
  { href: "/products?family=lan_magnetics", label: "LAN Magnetics" },
  { href: "/products?family=connectors", label: "Connectors" },
  { href: "/products?family=other", label: "Other", icon: ScanSearch },
];
