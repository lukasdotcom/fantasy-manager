import db from "#/Modules/database";
import getLocales from "#/locales/getLocales";
import { ThemeOptions } from "@mui/material";
import {
  GetServerSidePropsContext,
  GetStaticPropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.status(200).json(await getTheme());
}

/**
+ * Retrieves the theme from the database.
+ *
+ * @return {Promise<{dark: ThemeOptions, light: ThemeOptions}>} The theme options.
+ */
export const getTheme = async (): Promise<{
  dark: ThemeOptions;
  light: ThemeOptions;
}> => {
  const theme: { dark: ThemeOptions; light: ThemeOptions } = {
    dark: {
      palette: {
        mode: "dark",
      },
    },
    light: {
      palette: {
        mode: "light",
      },
    },
  };
  try {
    theme.dark = await db
      .selectFrom("data")
      .select("value2")
      .where("value1", "=", "configThemeDark")
      .execute()
      .then((res) => (res.length > 0 ? JSON.parse(res[0].value2) : theme.dark));
  } catch {
    console.error("Failed to parse dark theme");
  }
  try {
    theme.light = await db
      .selectFrom("data")
      .select("value2")
      .where("value1", "=", "configThemeLight")
      .execute()
      .then((res) =>
        res.length > 0 ? JSON.parse(res[0].value2) : theme.light,
      );
  } catch {
    console.error("Failed to parse light theme");
  }
  return theme;
};

/**
 * Retrieves all data that should be in pregenerated pages for _app.tsx.
 *
 * @param {string | undefined} locale - The locale to retrieve data for.
 * @return {Promise<{ theme: {dark: ThemeOptions, light: ThemeOptions}; t: Record<string, string> | null }>} - A promise that resolves to an object containing the theme and locales data.
 */
export const getData = async (
  context: GetStaticPropsContext | GetServerSidePropsContext,
): Promise<{
  theme: { dark: ThemeOptions; light: ThemeOptions } | null;
  translate: Record<string, string> | null;
}> => {
  // Checks to see if this is a GetServerSidePropsContext
  if (Object.keys(context).includes("req")) {
    // Telling typescript that this is now a GetServerSidePropsContext
    const context2 = context as GetServerSidePropsContext;
    // Dirty way to check if this is rendered on the server
    if (context2.resolvedUrl !== context2.req.url) {
      return {
        theme: null,
        translate: null,
      };
    }
  }
  return {
    theme: await getTheme(),
    translate: await getLocales(context.locale),
  };
};
