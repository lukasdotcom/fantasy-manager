import NextAuth from "next-auth";
import db from "../../../Modules/database";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { hash, compareSync } from "bcrypt";
import { sql } from "kysely";

let ran = false;
const options = {
  pages: {
    signIn: "/signin",
    error: "signin",
  },
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // Used to sign in
      id: "Sign-In",
      name: "Sign-In",
      credentials: {
        username: { label: "Username", type: "username" },
        password: { label: "Password", type: "password" },
      },
      // Used to make sure that the credentails are correct
      authorize: async (credentials) => {
        // Goes through every user that has the email or username that was given and has password authentication enabled
        const users =
          await sql`SELECT * FROM users WHERE username=${credentials.username} AND password!=''`.execute(
            db,
          );
        const unthrottledUsers = users.rows.filter((e) => e.throttle > 0);
        let finished = false;
        let result = null;
        unthrottledUsers.forEach((e) => {
          // Loops through every available user until the password is correct
          if (!finished) {
            // Checks if the password is correct
            if (compareSync(credentials.password, e.password)) {
              finished = true;
              result = { name: e.id };
            } else {
              // Lowers the throttle by 1
              sql`UPDATE users SET throttle=throttle-1 WHERE id=${e.id}`.execute(
                db,
              );
            }
          }
        });
        // Checks if all the users are throttled
        if (unthrottledUsers.length === 0 && users.length > 0) {
          users.rows.forEach((e) => {
            console.log(`User id ${e.id} is locked`);
          });
          return "/error/locked";
        }
        return Promise.resolve(result);
      },
    }),
    CredentialsProvider({
      // Used to sign up
      id: "Sign-Up",
      name: "Sign-Up",
      credentials: {
        username: { label: "Username", type: "username" },
        password: { label: "Password", type: "password" },
      },
      // Used to make sure that the credentails are correct
      authorize: async (credentials) => {
        // Goes through every user that has the email or username that was given
        if (credentials.username == "" || credentials.password == "") {
          throw Error("no_username");
        }
        const bcrypt_rounds =
          parseInt(process.env.BCRYPT_ROUNDS) > 0
            ? parseInt(process.env.BCRYPT_ROUNDS)
            : 9;
        const password = await hash(credentials.password, bcrypt_rounds);
        await sql`INSERT INTO users (username, password) VALUES(${credentials.username}, ${password})`.execute(
          db,
        );
        const users =
          await sql`SELECT * FROM users WHERE (username=${credentials.username} AND password=${password})`.execute(
            db,
          );

        let result = null;
        if (users.rows.length > 0) {
          result = {
            name: users.rows[0].id,
          };
        }
        return Promise.resolve(result);
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      // Will make sure that if this was sign in with google only a verified user logs in.
      if (account.provider === "google" || account.provider === "github") {
        // Checks if the user has already registered and if no then the user is created
        const registered =
          await sql`SELECT * FROM users WHERE ${account.provider}=${profile.email}`
            .execute(db)
            .then((e) => e.rows.length > 0);
        if (!registered) {
          await sql`INSERT INTO users (${account.provider}, username, password) VALUES (${profile.email}, ${profile.name}, '')`.execute(
            db,
          );
        }
        if (account.provider === "google") return profile.email_verified;
        return true;
      }
      await sql`UPDATE users SET admin=1 WHERE id=${process.env.ADMIN}`.execute(
        db,
      );
      await sql`UPDATE users SET admin=0 WHERE id!=${process.env.ADMIN}`.execute(
        db,
      );
      return user;
    },
    async jwt({ token, account }) {
      // Makes sure that the id is in the name parameter
      if (account) {
        // Gets the id from the database
        if (account.provider === "google" || account.provider === "github") {
          token.name =
            await sql`SELECT id FROM users WHERE ${account.provider}=${token.email}`
              .execute(db)
              .then((res) => (res.rows.length > 0 ? res.rows[0].id : 0));
        }
      }
      return token;
    },
    // Uses the users id and then returns the data for the user
    async session({ session }) {
      if (session && session.user.name) {
        await sql`UPDATE users SET active=1 WHERE id=${session.user.name} AND active=0`.execute(
          db,
        );
        session.user =
          await sql`SELECT * FROM users WHERE id=${session.user.name}`
            .execute(db)
            .then((res) => (res.rows.length > 0 ? res.rows[0] : undefined));
        if (session.user !== undefined) {
          session.user.password = session.user.password !== "";
          session.user.active = session.user.active == 1;
          session.user.admin = session.user.admin == 1;
          return session;
        }
      }
      return null;
    },
  },
};

export default async function authenticate(req, res) {
  if (ran === false) {
    // Only adds sign in with github and google if they are setup by the server owner
    if (
      !(process.env.GITHUB_ID === undefined || process.env.GITHUB_ID === "") &&
      !(
        process.env.GITHUB_SECRET === undefined ||
        process.env.GITHUB_SECRET === ""
      )
    ) {
      options.providers = [
        GithubProvider({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
        }),
        ...options.providers,
      ];
    }
    if (
      !(process.env.GOOGLE_ID === undefined || process.env.GOOGLE_ID === "") &&
      !(
        process.env.GOOGLE_SECRET === undefined ||
        process.env.GOOGLE_SECRET === ""
      )
    ) {
      options.providers = [
        GoogleProvider({
          clientId: process.env.GOOGLE_ID,
          clientSecret: process.env.GOOGLE_SECRET,
          authorization: {
            params: {
              prompt: "consent",
              access_type: "offline",
              response_type: "code",
            },
          },
        }),
        ...options.providers,
      ];
    }
    ran = true;
  }
  await NextAuth(req, res, options);
}
export const authOptions = options;
