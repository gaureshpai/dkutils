import setAuthToken from "@frontend/utils/setAuthToken";
import { jwtDecode } from "jwt-decode";
import PropTypes from "prop-types";
import { createContext, useEffect, useReducer } from "react";

const AuthContext = createContext();

/**
 * Reducer for the authentication state.
 * @param {object} state The current state.
 * @param {object} action The action to perform on the state.
 * @returns {object} The new state after applying the action.
 */
const authReducer = (state, action) => {
	switch (action.type) {
		case "LOGIN":
			localStorage.setItem("token", action.payload.token);
			setAuthToken(action.payload.token);
			return { ...state, isAuthenticated: true, user: action.payload.user };
		case "LOGOUT":
			localStorage.removeItem("token");
			setAuthToken(null);
			return { ...state, isAuthenticated: false, user: null };
		case "SET_INITIALIZED":
			return { ...state, isInitialized: true };
		default:
			return state;
	}
};

/**
 * Provides authentication context to descendants and synchronizes the current authentication state with the document root and localStorage.
 * @param {JSX.Element} children - React nodes to render inside the provider.
 * @returns {JSX.Element} A Context Provider that supplies `{ state, dispatch }` to its children.
 */
const AuthProvider = ({ children }) => {
	const [state, dispatch] = useReducer(authReducer, {
		isAuthenticated: false,
		user: null,
		isInitialized: false,
	});

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (token) {
			try {
				const decoded = jwtDecode(token);
				const currentTime = Date.now() / 1000;

				// Check if token is expired
				if (decoded.exp && decoded.exp < currentTime) {
					localStorage.removeItem("token");
					setAuthToken(null);
					dispatch({ type: "SET_INITIALIZED" });
					return;
				}

				setAuthToken(token);
				dispatch({ type: "LOGIN", payload: { token, user: decoded.user } });
			} catch (error) {
				// Invalid token, remove it
				localStorage.removeItem("token");
				setAuthToken(null);
			}
		}
		dispatch({ type: "SET_INITIALIZED" });
	}, []);

	return <AuthContext.Provider value={{ state, dispatch }}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider };

AuthProvider.propTypes = {
	children: PropTypes.node.isRequired,
};
