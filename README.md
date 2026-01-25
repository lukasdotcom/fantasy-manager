# Fantasy Manager

## Description

This is meant to be an open source self hosted way to play a fantasy manager for some leagues. If you want to try this out use my hosted version which is located [here](https://fantasy.lschaefer.xyz)![](https://uptime.lschaefer.xyz/api/badge/15/uptime/720?label=30&labelSuffix=d). For any questions feel free to post a question in the discussions tab.

## Features

1. Completely free and open source.
2. Many different leagues to use(Bundesliga, EPL, etc).
   1. You can even make your own custom plugin to support any league.
3. Unlimited users and unlimited leagues.
4. Customize starting money.
5. Customize starred player bonus.
6. Limit transfer amount(Note all users are allowed unlimited transfers while they have an empty squad).
7. Ability to allow players to be bought by multiple users in the same league.
8. Ranking tables for(Only in leagues):
   1. Top points for every matchday
   2. Top points in total
   3. Filter by origin (Fantasy, Prediction, or all)
9. Many ways to search through players:
   1. By price
   2. By total points
   3. By average points
   4. By the last match points(Requires the server to have been up for the last match day)
   5. By Club
   6. By Name
   7. By Position
10. Predict matches to earn more points for the league.
11. Customize points for predictions.
12. Download player data as json or csv
13. See all historical player data(As long as the server was up).
14. See historical squads for every league.
15. And all of these features in a Modern Responsive UI available in a light and dark theme.
16. Customize UI to look however you want.
17. Web admin panel for website administrator to change settings.

## Roadmap

If you would like to have a feature added you can request it in an issue or make it yourself and add a pull request.

## Screenshots

Here is a sample screenshot for more go to the [screenshots folder](public/screenshots/) which is in the public folder or to the [main page of my hosted version](https://fantasy.lschaefer.xyz)![](https://uptime.lschaefer.xyz/api/badge/15/uptime/720?label=30&labelSuffix=d).
![Screenshot of League page Dark Theme](public/screenshots/MainDark.png?raw=true)
![Screenshot of League Page Light Theme](public/screenshots/MainLight.png?raw=true)

## Production or Installation

There are 2 options to run this with and without docker. If you are unsure I would recommend docker it is easier. If you would like to install this without docker you can use the [Dockerless](#dockerless) version. After installing with either process follow the [post-installation guide](#post-installation)

### Sqlite

1. First download this file and edit the file to your preferences.

```
wget 'https://raw.githubusercontent.com/Lukasdotcom/fantasy-manager/main/docker/docker-compose.yaml'
```

2. Then run this.

```
docker-compose up
```

### Dockerless

Required Tools:

- [Nodejs](https://nodejs.org/en/download/) ≥ 18. v24.x is recommended, but all LTS node versions are supported.
- [Git](https://git-scm.com/downloads)

1. First clone this git repository

```
git clone -b stable https://github.com/lukasdotcom/fantasy-manager
```

2. Then copy the .env.sample file located in the docker folder. Edit the values like mentioned in the file and then put the contents into a file called .env.local in the root folder of the project
3. Run the command below and the webserver will be exposed on port 3000

```
npm run start
```

4. To update this just run the command below in the git repository. Then stop the website and start it up again.

```
git pull
```

## Post-Installation

1. You need to first of all login to the admin user. By default this should be the very first user to login. If your user is not the admin or you want to change the admin go to [admin](#admin-user) for help changing the admin user.
2. Then go into the admin panel for that user. (You should see it in the menu)
3. Enable all the plugins you want. Plugins are basically leagues and you can add custom ones, but all the official ones should be listed.

## Development

Read the contributing guidelines.

## Analytics

This service collects some simple analytics when you host this service that currently includes only the following information. This is collected daily and in aggregate so individual user data of your server is never sent to the analytics server. You may optout by setting ANALYTICS_OPT_OUT to optout.

1. serverID - This is a random id that is generated the first time the server boots.
2. version - The version of the server.
3. users - The number of users.
4. activeUsers - The number of users that were logged in on that day.
5. Then for every type of league (Bundesliga, EPL, etc) there are 2 pieces of data collected:
   1. Active Users - The number of Active Users in a league with that type.
   2. Users - The number of users in a league of this type.
6. The total number of users using dark or light theme.
7. From the active users the total of the dark and light theme.
8. The total number of users using a certain language.
9. From the active users the total of a certain language.

## Admin User

To change a user to the admin user follow these steps:

1. You need to figure out the userID of the user that you want to change. To do this go to the usermenu of the user and it should tell you the userID.
2. Then edit the enviromental variables for the server and change it to the userID you just found.
3. Then restart the server.
