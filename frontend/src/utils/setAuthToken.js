import axios from "axios";

/**
 * Sets the authorization token in the axios request headers.
 * If the token is provided, sets it.
 * If the token is not provided, removes the existing token from the headers.
 * @param {string} token The token to set.
 */
const setAuthToken = (token) => {
	if (token) {
		axios.defaults.headers.common["x-auth-token"] = token;
	} else {
		axios.defaults.headers.common["x-auth-token"] = undefined;
	}
};

export default setAuthToken;
