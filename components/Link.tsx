import MuiLink from "@mui/material/Link";
import NextLink from "next/link";
import { forwardRef, ReactElement } from "react";
interface Props {
  // The attributes for styling
  styled?: boolean;
  color?: string;
  underline?: "hover" | "none" | "always";
  href: string;
  children: ReactElement | string;
  disableNext?: boolean;
  // Some attributes that links can use
  rel?: string;
  target?: string;
  id?: string;
}
/**
 * Used to create a link.
 * @param {string} href - The link to where this goes. The only required attribute.
 * @param {boolean} styled - If this element should be styled or inherit the color.
 * @param {boolean} disableNext - You can set this to true if you want to disable the nextjs link stuff(for downloads). This is automatically done for external links
 */
const Home = forwardRef<HTMLAnchorElement, Props>(function Home(props, ref) {
  const { href, styled = true, children, disableNext, ...other } = props;
  // Checks if this is an external link
  const external =
    href.indexOf("http") === 0 || href.indexOf("mailto:") === 0 || disableNext;
  // Checks if the styling should be reset for the link
  if (styled === false) {
    other.color = "inherit";
    other.underline = "hover";
  }
  if (external) {
    return (
      <MuiLink href={href} ref={ref} {...other}>
        {children}
      </MuiLink>
    );
  } else {
    return (
      <NextLink ref={ref} href={href} legacyBehavior={true}>
        <MuiLink {...other} href={href} sx={{ cursor: "pointer" }}>
          {children}
        </MuiLink>
      </NextLink>
    );
  }
});
export default Home;
