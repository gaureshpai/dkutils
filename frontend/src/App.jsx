import Base64TextConverter from "@frontend/components/Base64TextConverter.jsx";
import Footer from "@frontend/components/Footer.jsx";
import ImageFlipper from "@frontend/components/ImageFlipper.jsx";
import ImageToBase64Converter from "@frontend/components/ImageToBase64Converter.jsx";
import Navbar from "@frontend/components/Navbar.jsx";
import Login from "@frontend/components/auth/Login.jsx";
import Register from "@frontend/components/auth/Register.jsx";
import { ThemeProvider } from "@frontend/components/theme-provider";
import { AuthContext } from "@frontend/context/AuthContext.jsx";
import HomePage from "@frontend/pages/HomePage.jsx";
import ImageToolsPage from "@frontend/pages/ImageToolsPage.jsx";
import PdfToolsPage from "@frontend/pages/PdfToolsPage.jsx";
import TextToolsPage from "@frontend/pages/TextToolsPage.jsx";
import WebToolsPage from "@frontend/pages/WebToolsPage.jsx";
import { useContext, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

/**
 * PrivateRoute conditionally renders its children when the user is authenticated
 * and redirects to "/login" when not authenticated.
 * @param {{ children }} children - React nodes to render when authenticated.
 * @returns {JSX.Element} A JSX.Element that either renders children or a Navigate to "/login".
 */
const PrivateRoute = ({ children }) => {
	const { state } = useContext(AuthContext);
	const navigate = useNavigate();

	useEffect(() => {
		if (state.isInitialized && !state.isAuthenticated) {
			navigate("/login");
		}
	}, [state.isInitialized, state.isAuthenticated, navigate]);

	if (!state.isInitialized) {
		return null;
	}

	return state.isAuthenticated ? children : null;
};

/**
 * Renders the app shell with theme, global layout, routing, and UI containers.
 * @returns {JSX.Element} The root React element containing the ThemeProvider, navbar, route tree, footer, and toast container.
 */
function App() {

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