import ReactDOM from "react-dom/client";
import "@frontend/index.css";
import App from "@frontend/App.jsx";
import { AuthProvider } from "@frontend/context/AuthContext.jsx";

import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<HelmetProvider>
			<BrowserRouter>
				<AuthProvider>
					<App />
				</AuthProvider>
			</BrowserRouter>
		</HelmetProvider>
	</React.StrictMode>,
);
