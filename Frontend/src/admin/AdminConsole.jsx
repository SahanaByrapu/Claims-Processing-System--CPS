function AdminConsole() {
  return (
    <div>

      <h2 className="text-2xl font-bold mb-4">
        Admin Console
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <div className="bg-white p-4 shadow">
          User Management
        </div>

        <div className="bg-white p-4 shadow">
          Role & Permissions
        </div>

        <div className="bg-white p-4 shadow">
          System Configurations
        </div>

        <div className="bg-white p-4 shadow">
          Audit Logs
        </div>

      </div>

    </div>
  );
}

export default AdminConsole;