import React, { createContext, useReducer, useEffect } from "react";
import PropTypes from "prop-types";
import setAuthToken from "../utils/setAuthToken";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

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
    default:
      return state;
  }
};

const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    user: null,
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
          return;
        }

        setAuthToken(token);
        dispatch({ type: "LOGIN", payload: { token, user: decoded.user } });
      } catch (error) {
        // Invalid token, remove it
        localStorage.removeItem("token");
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
