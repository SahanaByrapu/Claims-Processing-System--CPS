function AdjusterDashboard() {
  return (
    <div>

      <h2 className="text-2xl font-bold mb-4">
        Adjuster Dashboard
      </h2>

      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white p-4 shadow">
          Assigned Cases: 45
        </div>

        <div className="bg-white p-4 shadow">
          In Review: 12
        </div>

        <div className="bg-white p-4 shadow">
          Closed Today: 8
        </div>

      </div>

    </div>
  );
}

export default AdjusterDashboard;