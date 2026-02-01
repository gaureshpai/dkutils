import { useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import "./App.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext.jsx";
import setAuthToken from "./utils/setAuthToken";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar.jsx";

// Components
import Base64TextConverter from "./components/Base64TextConverter.jsx";
import ImageFlipper from "./components/ImageFlipper.jsx";
import ImageToBase64Converter from "./components/ImageToBase64Converter.jsx";
import Register from "./components/auth/Register.jsx";
import Login from "./components/auth/Login.jsx";

// Pages
import HomePage from "./pages/HomePage.jsx";
import ImageToolsPage from "./pages/ImageToolsPage.jsx";
import PdfToolsPage from "./pages/PdfToolsPage.jsx";
import TextToolsPage from "./pages/TextToolsPage.jsx";
import WebToolsPage from "./pages/WebToolsPage.jsx";
import Footer from "./components/Footer.jsx";

import { ThemeProvider } from "./components/theme-provider";

const PrivateRoute = ({ children }) => {
  const { state } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.isAuthenticated) {
      navigate("/login");
    }
  }, [state.isAuthenticated, navigate]);

  return state.isAuthenticated ? children : null;
};

function App() {
  const { dispatch } = useContext(AuthContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && token !== "") {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          setAuthToken(null);
          localStorage.removeItem("token");
          dispatch({ type: "LOGOUT" });
        } else {
          setAuthToken(token);
          dispatch({ type: "LOGIN", payload: { token, user: decoded.user } });
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        setAuthToken(null);
        localStorage.removeItem("token");
        dispatch({ type: "LOGOUT" });
      }
    }
  }, [dispatch]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="bg-background min-h-screen flex flex-col font-sans antialiased text-foreground">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/images" element={<ImageToolsPage />} />
            <Route path="/pdfs" element={<PdfToolsPage />} />
            <Route path="/text" element={<TextToolsPage />} />
            <Route path="/web" element={<WebToolsPage />} />

            <Route
              path="/text/base64-converter"
              element={<Base64TextConverter />}
            />
            <Route path="/images/flipper" element={<ImageFlipper />} />
            <Route
              path="/images/image-to-base64"
              element={<ImageToBase64Converter />}
            />

            <Route
              path="/protected-example"
              element={
                <PrivateRoute>
                  <div>This is a protected page!</div>
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
        <ToastContainer />
      </div>
    </ThemeProvider>
  );
}

export default App;
