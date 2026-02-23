function FraudAnalytics() {
  return (
    <div>

      <h2 className="text-2xl font-bold mb-4">
        Fraud Analytics
      </h2>

      {/* Risk Score Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-red-100 p-4 shadow">
          High Risk Claims: 32
        </div>

        <div className="bg-yellow-100 p-4 shadow">
          Medium Risk: 76
        </div>

        <div className="bg-green-100 p-4 shadow">
          Low Risk: 400
        </div>

      </div>

      {/* Charts */}
      <div className="bg-white p-4 shadow">
        Fraud Detection Charts
      </div>

    </div>
  );
}

export default FraudAnalytics;