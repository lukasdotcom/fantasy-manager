# FAQs

- Q: Why is the cypress test failing?
- A: If you made any major UI changes it may cause the test to fail. You may have to change the tests slightly(For help with making tests go to [How to Make Tests](#how-to-make-tests)). Otherwise there should be a video and a picture in the cypress/videos or cypress/screenshots directories. If you can not get the cypress test to pass just create a pull request, and I will look at it and get the test to pass.
- Q: Where are the types for the database?
- A: In the types/db.ts file
- Q: What do all the `#` in the imports mean?
- A: The `#` is a special character that tells the typescript compiler to look in the root of the project for the file. This is used to make the imports shorter and easier to read. There are also other shortcuts like `#Modules` which is the modules folder. To see a list of all the shortcuts look at the package.json file in the root of the project.

# Typescript

I am very slowly converting this project to typescript. I am almost done now there are very few js files left. If you create a new file make it typescript and if you want to you can convert js files to typescript.

# Todos before making a pull request

- [ ] Run `npm run format` to format everything with prettier.
- [ ] Run `npm run lint` and fix all errors and new warnings.
- [ ] Made sure that all database changes have a migration and you ran `npm run dbtypes`.
- [ ] Make sure to run the unit tests with `npm test`. This project uses vitest for more details look at [Vitest](#Vitest).
- [ ] Made sure to test your changes with [cypress](#cypress) by running `npm run start:test` and in another terminal `npm run cypress` and when it is done stopping the server with ctr-c. If this fails, and you don't know why look in the [cypress section](#cypress), or just create the pull request anyway and leave this unchecked.
- [ ] If you added any features it would be great if you tested them with cypress(Not required).
- [ ] If you added another league did you follow all the steps in the [leagues.md How to add another league](leagues.md#how-to-add-another-league).
- [ ] Did you make sure to have all text in the correct format as mentioned in [translating.md](TRANSLATING.MD#help)

# How to run development enviroment

There are 2 ways to run the development enviroment [Native](#native) and [Docker](#docker).

## Other Notes

- When a database migration is needed at it in the migration folder using kysely syntax and run `npm run dbtypes` to
  ensure the types are updated

## Native

**This is the reccommended way.**

1. Download this entire repository to your computer with

```bash
git clone https://github.com/lukasdotcom/fantasy-manager
```

2. [Install node v18 or greater](https://nodejs.org/en/) if you have not yet. To check you version run the command below which should give you some version number just make sure the major version is greater than or equal to 18. The recommended version is 20.

```bash
node -v
```

3. Now copy the contents of .env.sample which is in the development folder. Make a new file in the top folder in the repository called .env.local and paste the contents of .env.sample in there.
4. Now you should be able to run the command below to start up the development instance.

```bash
npm run dev
```

## Docker

1. Docker is unmaintained due to being unnecessary.

# Cypress

## How to Make Tests

1. First run `npm run start:test` to start a testing server.
2. Secondly run `npm run cypress:open` to open cypress itself.
3. The tests will be located in the cypress/e2e folder.
4. If you want to load custom data into the db on the player values and points put the data into the sample folder and load it like shown in the invite2.js file in the cypress/e2e direcotory.

# Vitest

Currently there are only unit tests for the backend. Frontend tests are done through cypress. You are welcome to create some though.
