import { jwtDecode } from "jwt-decode";
import { useContext, useEffect, useState } from "react";
import "@frontend/App.css";
import Navbar from "@frontend/components/Navbar.jsx";
import { AuthContext } from "@frontend/context/AuthContext.jsx";
import setAuthToken from "@frontend/utils/setAuthToken";
import { Route, Routes, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

// Components
import Base64TextConverter from "@frontend/components/Base64TextConverter.jsx";
import ImageFlipper from "@frontend/components/ImageFlipper.jsx";
import ImageToBase64Converter from "@frontend/components/ImageToBase64Converter.jsx";
import Login from "@frontend/components/auth/Login.jsx";
import Register from "@frontend/components/auth/Register.jsx";

import Footer from "@frontend/components/Footer.jsx";
// Pages
import HomePage from "@frontend/pages/HomePage.jsx";
import ImageToolsPage from "@frontend/pages/ImageToolsPage.jsx";
import PdfToolsPage from "@frontend/pages/PdfToolsPage.jsx";
import TextToolsPage from "@frontend/pages/TextToolsPage.jsx";
import WebToolsPage from "@frontend/pages/WebToolsPage.jsx";

import { ThemeProvider } from "@frontend/components/theme-provider";

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

/**
 * Renders the themed application shell with routes, global UI, and authentication initialization.
 *
 * On mount, reads a JWT from localStorage and initializes authentication: if a token is present and decodes with an unexpired `exp`, the token is applied and a `LOGIN` action with `{ token, user }` is dispatched; if the token is expired or cannot be decoded, the token and auth header are cleared and a `LOGOUT` action is dispatched.
 * @returns {JSX.Element} The root React element containing the theme provider, navbar, routes, footer, and toast container.
 */
function App() {
	const { dispatch } = useContext(AuthContext);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (token) {
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
				<main className="grow">
					<Routes>
						<Route path="/" element={<HomePage />} />
						<Route path="/register" element={<Register />} />
						<Route path="/login" element={<Login />} />
						<Route path="/images" element={<ImageToolsPage />} />
						<Route path="/pdfs" element={<PdfToolsPage />} />
						<Route path="/text" element={<TextToolsPage />} />
						<Route path="/web" element={<WebToolsPage />} />

						<Route path="/text/base64-converter" element={<Base64TextConverter />} />
						<Route path="/images/flipper" element={<ImageFlipper />} />
						<Route path="/images/image-to-base64" element={<ImageToBase64Converter />} />

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
