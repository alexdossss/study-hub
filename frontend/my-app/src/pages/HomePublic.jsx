import React from "react";
import { useNavigate } from "react-router-dom";

function HomePublic() {
  const navigate = useNavigate();

  const toggleView = () => {
    navigate("/home");
  };

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const username = userInfo.user?.username || "User";

  return (
    <div>
      <h2>Welcome to StudyHub Public View {username}</h2>
      <p>This is the public version of the homepage.</p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/public-notes')}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          View Public Notes
        </button>

        <button 
          onClick={() => navigate('/spaces')}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Spaces
        </button>

        <button 
          onClick={toggleView}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Switch to Private View
        </button>
        
        <button 
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default HomePublic;