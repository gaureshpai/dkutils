import axios from "axios";

const setAuthToken = (token) => {
	if (token) {
		axios.defaults.headers.common["x-auth-token"] = token;
	} else {
		axios.defaults.headers.common["x-auth-token"] = undefined;
	}
};

export default setAuthToken;
