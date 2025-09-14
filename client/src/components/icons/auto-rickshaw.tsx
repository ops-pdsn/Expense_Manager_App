import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

export function AutoRickshaw({ className, size = 16, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 9.5c0-2.485 2.015-4.5 4.5-4.5H15a3 3 0 0 1 3 3v2.5h-3.5a4 4 0 0 0-3.2 1.6L9.5 14H7.5A4.5 4.5 0 0 1 3 9.5Z" />
      <path d="M21 13h-4.5a2.5 2.5 0 0 0-2.05 1.07L12.5 17H10" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
      <path d="M7.5 5v4.5H15" />
    </svg>
  );
}

export default AutoRickshaw;
