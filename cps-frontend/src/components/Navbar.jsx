function Navbar() {
  return (
    <div className="bg-white shadow p-4 flex justify-between">

        
      <div>
             <h1 className="font-bold text-lg">
                Insurance Claims Platform
            </h1>
    </div>

    {/* Role */}
    <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded text-sm">
     user role
    </span>

     {/* Username */}
    <span className="font-medium">
      user.name
    </span>


    </div>
  );
}




export default Navbar; 