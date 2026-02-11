
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div className="flex h-screen">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        
        {/* Top Navbar */}
        <Navbar />

        {/* Page Content */}
        <div className="p-6 bg-gray-100 flex-1 overflow-auto">
          <Outlet />
        </div>

      </div>
    </div>
  );
}

export default MainLayout;
