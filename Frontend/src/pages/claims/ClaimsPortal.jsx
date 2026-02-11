function ClaimsPortal() {
  return (
    <div>

      <h2 className="text-2xl font-bold mb-4">
        Claims Portal
      </h2>

      {/* Claim Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white p-4 shadow">
          Total Claims: 1,245
        </div>

        <div className="bg-white p-4 shadow">
          Approved: 820
        </div>

        <div className="bg-white p-4 shadow">
          Pending: 300
        </div>

        <div className="bg-white p-4 shadow">
          Rejected: 125
        </div>

      </div>

      {/* Claims Table */}
      <div className="bg-white p-4 shadow">
        Claims Table Placeholder
      </div>

    </div>
  );
}

export default ClaimsPortal;