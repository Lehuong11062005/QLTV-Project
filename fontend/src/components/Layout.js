import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  // Config: Matches the width in Sidebar.css
  const sidebarWidth = "260px"; 

  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh", 
      backgroundColor: "#f8fafc" // Light gray background for whole app
    }}>
      
      {/* Sidebar is fixed via CSS */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div style={{ 
        flex: 1, 
        marginLeft: sidebarWidth, // Pushes content to right
        display: "flex", 
        flexDirection: "column",
        width: `calc(100% - ${sidebarWidth})` // Ensures proper width
      }}>
        
        {/* Navbar stays at top */}
        <Navbar />
        
        {/* Page Content */}
        <main style={{ 
          padding: "30px", 
          flex: 1,
          overflowX: "hidden" 
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}