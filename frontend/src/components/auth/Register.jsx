import { useState, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import setAuthToken from "../../utils/setAuthToken";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { AlertCircle } from "lucide-react";
import useAnalytics from "../../utils/useAnalytics";

const Register = () => {
  const { trackToolUsage } = useAnalytics();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const { username, email, password, password2 } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    trackToolUsage("Register", "web");
    setError(null);

    if (password !== password2) {
      setError("Passwords do not match");
      setLoading(false);
    } else {
      try {
        const newUser = { username, email, password };
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const res = await axios.post(`${baseUrl}/api/auth/register`, newUser);

        const decoded = jwtDecode(res.data.token);
        dispatch({
          type: "LOGIN",
          payload: { token: res.data.token, user: decoded.user },
        });

        localStorage.setItem("token", res.data.token);
        setAuthToken(res.data.token);
        navigate("/");
      } catch (err) {
        console.error(err);
        const data = err.response?.data;
        if (data?.errors && Array.isArray(data.errors)) {
          setError(data.errors.map((e) => e.msg).join(", "));
        } else {
          setError(data?.msg || "Server Error");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)] bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div
                className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md flex items-center gap-2 text-sm"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                autoComplete="username"
                required
                value={username}
                onChange={onChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={onChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••"
                autoComplete="new-password"
                required
                value={password}
                onChange={onChange}
                minLength="6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Confirm Password</Label>
              <Input
                id="password2"
                name="password2"
                type="password"
                placeholder="••••••"
                autoComplete="new-password"
                required
                value={password2}
                onChange={onChange}
                minLength="6"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Login here
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;
