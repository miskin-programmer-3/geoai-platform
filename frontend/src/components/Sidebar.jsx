import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  CloudSun,
  Activity,
  Users,
  User,
  LogIn,
  UserPlus,
  Map,
  Building
} from "lucide-react";

import Logo from "./Logo";
import "./Sidebar.css";

const menuItems = [
  {
    to: "/",
    label: "Boshqaruv paneli",
    icon: LayoutDashboard
  },
  {
    to: "/weather",
    label: "Ob-havo",
    icon: CloudSun
  },
  {
    to: "/seismic",
    label: "Zilzila monitoringi",
    icon: Activity
  },
  {
    to: "/building-risk",
    label: "Bino xavfi",
    icon: Building
  },
  {
    to: "/population",
    label: "Aholi statistikasi",
    icon: Users
  },
  {
    to: "/profile",
    label: "Profil",
    icon: User
  },
  {
    to: "/login",
    label: "Kirish",
    icon: LogIn
  },
  {
    to: "/register",
    label: "Ro'yxatdan o'tish",
    icon: UserPlus
  },
  {
    to: "/map",
    label: "Xarita",
    icon: Map
  }
];

function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <Logo />
      </div>

      <nav
        className="sidebar-nav"
        aria-label="Asosiy menyu"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
              end={item.to === "/"}
              key={item.to}
              to={item.to}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
