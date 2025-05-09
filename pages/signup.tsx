import { Alert, AlertTitle, Button, TextField, useTheme } from "@mui/material";
import { GetStaticProps } from "next";
import { signIn } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import Menu from "../components/Menu";
import { Providers, getProviders } from "../types/providers";
import Link from "../components/Link";
import { TranslateContext } from "../Modules/context";
import { getData } from "./api/theme";
import { getProviderDetails } from "./signin";
import db from "#database";
interface Props {
  enabledProviders: Providers[];
  enablePasswordSignup: boolean;
}
export default function SignIn({
  enabledProviders,
  enablePasswordSignup,
}: Props) {
  const t = useContext(TranslateContext);
  const router = useRouter();
  const callbackUrl = router.query.callbackUrl as string;
  const error = router.query.error as string;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const providers = getProviderDetails(enabledProviders);
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  return (
    <>
      <Head>
        <title>{t("Login Page")}</title>
      </Head>
      <Menu />
      {error && (
        <Alert
          severity={error === "CredentialsSignin" ? "warning" : "error"}
          className="notification"
        >
          <AlertTitle>
            {error === "CredentialsSignin"
              ? t("Wrong Credentials")
              : error === "no_username"
                ? t("No Username or Password")
                : t("Failed to Sign in")}
          </AlertTitle>
          {error === "CredentialsSignin"
            ? t("Check that you entered the correct username and password. ")
            : error === "no_username"
              ? t(
                  "You need to give a username and a password when signing up. ",
                )
              : t("Try logging in again. ")}
        </Alert>
      )}
      <div className="center">
        <>
          <h2>{t("Sign Up Page")}</h2>
          {providers.map((e, idx) => (
            <Button
              startIcon={
                <Image
                  src={dark ? e.logoDark : e.logo}
                  height={20}
                  width={20}
                  alt=""
                />
              }
              key={idx}
              variant="contained"
              color="primary"
              sx={{
                background: dark ? e.bgDark : e.bg,
                "&:hover": {
                  background: dark ? e.bgDark : e.bg,
                },
                color: dark ? e.textDark : e.text,
                margin: 1,
              }}
              onClick={() => signIn(e.name, { callbackUrl })}
            >
              {t("Sign up with {provider}", { provider: e.name })}
            </Button>
          ))}
        </>
        {enablePasswordSignup && (
          <>
            <p>
              {t(
                "It is recommended against using password authorization unless strictly necessary. ",
              )}
            </p>
            <TextField
              label={t("Username")}
              type="text"
              id="username"
              variant="outlined"
              onChange={(e) => {
                setUsername(e.target.value);
              }}
              value={username}
            />
            <TextField
              label={t("Password")}
              type="password"
              id="password"
              variant="outlined"
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              value={password}
            />
            <Button
              variant="contained"
              sx={{ margin: 2 }}
              onClick={() =>
                signIn("Sign-Up", { callbackUrl, username, password })
              }
            >
              {t("Sign Up")}
            </Button>
          </>
        )}
        <p>
          <Link href="privacy">
            {t("Note that by signing up you agree to the privacy policy. ")}
          </Link>
        </p>
      </div>
    </>
  );
}
// Gets the list of providers
export const getStaticProps: GetStaticProps = async (ctx) => {
  const props: Props = {
    enabledProviders: getProviders(),
    enablePasswordSignup:
      getProviders().length === 0 ||
      (await db
        .selectFrom("data")
        .selectAll()
        .where("value1", "=", "configEnablePasswordSignup")
        .where("value2", "=", "1")
        .executeTakeFirst()) !== undefined,
  };
  return {
    props: {
      ...props,
      t: await getData(ctx),
    },
  };
};
