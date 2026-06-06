import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Logo({ className = "w-5 h-5 text-primary", ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Beautiful droplet shape silhouette */}
      <path d="M12 2L18.36 8.36c3.12 3.12 3.12 8.19 0 11.31A7.95 7.95 0 0 1 12 22a7.95 7.95 0 0 1-5.66-2.33c-3.12-3.12-3.12-8.19 0-11.31L12 2z" />
      {/* Two interlocking chain links inside the droplet */}
      <path d="M10 14.5a2.12 2.12 0 0 1 0-3l2-2a2.12 2.12 0 0 1 3 3l-.5.5" />
      <path d="M14 9.5a2.12 2.12 0 0 1 0 3l-2 2a2.12 2.12 0 0 1-3-3l.5-.5" />
    </svg>
  );
}
