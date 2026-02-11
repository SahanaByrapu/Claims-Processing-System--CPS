import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 bg-blue-900 text-white h-screen p-5 flex flex-col">

      {/* Header */}
      <h2 className="text-2xl font-bold mb-8 tracking-wide">
        Claims System
      </h2>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">

        <NavLink
          to="/claims"
          className={({ isActive }) =>
            `px-4 py-2 rounded hover:bg-blue-700 transition-colors ${
              isActive ? "bg-blue-800 font-semibold shadow-md" : ""
            }`
          }
        >
          Claims Portal
        </NavLink>

        <NavLink
          to="/adjuster"
          className={({ isActive }) =>
            `px-4 py-2 rounded hover:bg-blue-700 transition-colors ${
              isActive ? "bg-blue-800 font-semibold shadow-md" : ""
            }`
          }
        >
          Adjuster Dashboard
        </NavLink>

        <NavLink
          to="/fraud"
          className={({ isActive }) =>
            `px-4 py-2 rounded hover:bg-blue-700 transition-colors ${
              isActive ? "bg-blue-800 font-semibold shadow-md" : ""
            }`
          }
        >
          Fraud Analytics
        </NavLink>

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `px-4 py-2 rounded hover:bg-blue-700 transition-colors ${
              isActive ? "bg-blue-800 font-semibold shadow-md" : ""
            }`
          }
        >
          Admin Console
        </NavLink>

      </nav>

    </div>
  );
}

export default Sidebar;