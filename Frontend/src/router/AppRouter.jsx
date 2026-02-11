import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import ClaimsPortal from "../pages/claims/ClaimsPortal";
import AdjusterDashboard from "../adjuster/AdjusterDashboard";
import FraudAnalytics from "../fraud/FraudAnalytics";
import AdminConsole from "../admin/AdminConsole";


function AppRouter() {
  return (
    <BrowserRouter>

      <Routes>

        <Route element={<MainLayout />}>

          <Route path="/" element={<ClaimsPortal />} />
          <Route path="/claims" element={<ClaimsPortal />} /> 
          <Route path="/adjuster" element={<AdjusterDashboard />} />
          <Route path="/fraud" element={<FraudAnalytics />} />
          <Route path="/admin" element={<AdminConsole />} />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default AppRouter;