import { Link } from "react-router";
import { BrandLogo } from "./BrandLogo";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f8f7] flex flex-col" style={{ fontFamily: "Inter, Arial, sans-serif" }}>
      <header className="bg-white border-b border-[#e5e7eb] px-6 h-16 flex items-center">
        <Link to="/" className="no-underline" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
          <BrandLogo className="block h-8 w-auto" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <section className="w-full max-w-md">
          <div className="mb-6">
            <span className="text-[#ff7759] block mb-3" style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              {eyebrow}
            </span>
            <h1
              className="text-[#17171c] m-0"
              style={{
                fontFamily: "'Space Grotesk', Inter, sans-serif",
                fontSize: "clamp(32px, 5vw, 44px)",
                fontWeight: 600,
                letterSpacing: "-1px",
                lineHeight: 1.05,
              }}
            >
              {title}
            </h1>
            <p className="text-[#75758a] mt-4 mb-0" style={{ fontSize: "15px", lineHeight: 1.6 }}>
              {subtitle}
            </p>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">{children}</div>
        </section>
      </main>
    </div>
  );
}

