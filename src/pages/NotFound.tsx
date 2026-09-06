import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold">Page not found</p>
      <Link to="/" className="text-sm text-mode-safe underline">
        Back to Home
      </Link>
    </div>
  );
}
