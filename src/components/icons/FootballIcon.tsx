import { SVGProps } from "react";

const FootballIcon = ({ ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7.5 8 10.5l1.5 4.5h5L16 10.5z" />
    <path d="m12 2 0 5.5" />
    <path d="m21.5 9-5.5 1.5" />
    <path d="M19 19.5 14.5 15" />
    <path d="M5 19.5 9.5 15" />
    <path d="M2.5 9 8 10.5" />
  </svg>
);

export default FootballIcon;
