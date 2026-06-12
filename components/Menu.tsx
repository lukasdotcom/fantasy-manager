import Login from "./Login";
import {
  Icon,
  MenuItem,
  Container,
  Menu,
  MenuList,
  Typography,
  IconButton,
  Toolbar,
  Box,
  AppBar,
} from "@mui/material";
import { MouseEvent, MouseEventHandler, useContext, useState } from "react";
import Link from "./Link";
import { useSession } from "next-auth/react";
import { TranslateContext } from "../Modules/context";
interface MenuItemsInterface {
  pages: { name: string; link: string }[];
  handleCloseNavMenu: MouseEventHandler;
}
// Returns all the menu items
function MenuItems({ pages, handleCloseNavMenu }: MenuItemsInterface) {
  return (
    <>
      {pages.map((page) => (
        <Link styled={false} href={page.link} key={page.name}>
          <MenuItem onClick={handleCloseNavMenu}>
            <Typography sx={{ textAlign: "center" }}>{page.name}</Typography>
          </MenuItem>
        </Link>
      ))}
    </>
  );
}
interface MainInterface {
  league?: number;
}
// Used to create a menu
const Layout = ({ league }: MainInterface) => {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };
  const { data: session } = useSession();
  if (!league && session) {
    league = session.user.favoriteLeague
      ? session.user.favoriteLeague
      : undefined;
  }
  const t = useContext(TranslateContext);
  const pages = [{ name: t("Home"), link: "/" }];
  pages.push({ name: t("Download"), link: `/download` });
  // Checks if the player is logged in
  if (session || league) {
    if (session?.user.admin) {
      pages.push({ name: "Admin", link: "/admin" });
    }
    pages.push({ name: t("Leagues"), link: "/leagues" });
  }
  // Checks if the player should see the league links
  if (league) {
    pages.push({ name: t("Standings"), link: `/${league}` });
    pages.push({
      name: t("Predictions"),
      link: `/${league}/${session?.user.id}/predictions`,
    });
    pages.push({ name: t("Squad"), link: `/${league}/squad` });
    pages.push({ name: t("Transfers"), link: `/${league}/transfer` });
  }
  const MenuItemsLarge = (
    <MenuItems pages={pages} handleCloseNavMenu={handleCloseNavMenu} />
  );
  const MenuItemsSmall = (
    <>
      <IconButton size="large" onClick={handleOpenNavMenu} color="inherit">
        {" "}
        <Icon>menu</Icon>
      </IconButton>
      <Menu
        id="menu-appbar"
        anchorEl={anchorElNav}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        open={Boolean(anchorElNav)}
        onClose={handleCloseNavMenu}
        sx={{
          display: { sm: "block", lg: "none" },
        }}
      >
        {MenuItemsLarge}
      </Menu>
    </>
  );
  const MenuCount = pages.length;
  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Icon>sports_soccer</Icon>
          <Box
            sx={{
              flexGrow: 1,
              display: {
                xs: "flex",
                sm: MenuCount > 5 ? "flex" : "none",
                md: MenuCount > 7 ? "flex" : "none",
                lg: MenuCount > 10 ? "flex" : "none",
                xl: "none",
              },
            }}
          >
            {MenuItemsSmall}
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              display: {
                xs: "none",
                sm: MenuCount > 5 ? "none" : "flex",
                md: MenuCount > 7 ? "none" : "flex",
                lg: MenuCount > 10 ? "none" : "flex",
                xl: "flex",
              },
            }}
          >
            <MenuList sx={{ display: "flex", flexDirection: "row", p: 0 }}>
              {MenuItemsLarge}
            </MenuList>
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Login />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Layout;
