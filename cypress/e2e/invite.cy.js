describe("Invite User into league and change some league Settings and run through a matchday.", () => {
  before(() => {
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/invite1.ts",
    );
  });
  // Used to signup change username and password and login again
  it("invite", () => {
    let user1Money = 200;
    let user2Money = 100;
    let user1;
    let user2;
    let matchdays = [];
    // Signs in
    cy.visit("http://localhost:3000");
    cy.get("#login").click();
    cy.contains("Click here for creating an account").click();
    cy.get("#username").type("Invite 1");
    cy.get("#password").type("password");
    cy.get(".center > .MuiButtonBase-root").click();
    // Creates league with alternate starting amount
    cy.contains("Leagues").click();
    cy.getCookie("next-auth.session-token").then(
      (cookie) => (user1 = cookie.value),
    );
    cy.get("#startingMoney").clear();
    cy.get("#startingMoney").type(200);
    cy.get("#name").type("Sample League");
    cy.get("button").contains("Create League").click();
    cy.contains("Open league").click();
    cy.contains("Standings for Sample League");
    // Creates an anouncement
    cy.get("#announcementTitle").type("Super Aweosome Anouncement");
    cy.get("#announcementDescription").type(
      "Very great description for this announcement",
    );
    cy.contains("Add announcement").click();
    // Creates invites and deletes the randomly generated one
    cy.contains("Add invite").click();
    cy.get("#invite").clear();
    cy.get("#invite").type("invite1");
    cy.contains("Add invite").click();
    cy.contains("Link: localhost:3000/api/invite/")
      .parent()
      .contains("Delete")
      .click();
    cy.contains("Link: localhost:3000/api/invite/invite1");
    // Changes the default money amount and starred player multiplier
    cy.get("#startingMoney").clear();
    cy.get("#startingMoney").type(100);
    cy.get("#starredPercentage").clear();
    cy.get("#starredPercentage").type(180);
    // Makes sure that users have unlimited transfers when they have an empty squad
    cy.get("#transfers").clear();
    cy.get("#transfers").type(1);
    // Changes the name and checks if that worked
    cy.get("#leagueName").clear();
    cy.get("#leagueName").type("New Sample League");
    cy.contains("Standings for New Sample League");
    cy.contains("Save admin settings").click();
    // Signs into User 2 which will join the league through the invite
    cy.get("#logout").click();
    // Checks invalid invite
    cy.visit("http://localhost:3000/api/invite/invite2", {
      failOnStatusCode: false,
    });
    cy.visit(
      "http://localhost:3000/signup?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Finvite%2Finvite2",
    ); // This line is because cypress is weird and removes the callbackUrl from the url
    cy.get("#username").type("Invite 2");
    cy.get("#password").type("password");
    cy.get(".center > .MuiButtonBase-root").click();
    cy.contains("404");
    cy.get(".center").contains("404");
    cy.getCookie("next-auth.session-token").then(
      (cookie) => (user2 = cookie.value),
    );
    // Joins the league
    cy.visit("http://localhost:3000/api/invite/invite1");
    cy.contains("Admin Panel").should("not.exist");
    // Checks if the annoucement exists
    cy.contains("Very great description for this announcement");
    // Purchases Lewandoski for 25.8 million
    cy.contains("Transfer").click();
    cy.contains(`Money left: ${user2Money} M`);
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Buy")
      .click();
    cy.get("#amount").clear();
    cy.get("#amount").type("26");
    user2Money -= 25.8;
    cy.contains("Buy for").click();
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Edit purchase")
      .click();
    cy.get(".MuiTableBody-root > .MuiTableRow-root > :nth-child(3)").contains(
      "25.8 M",
    );
    cy.get("#close").click();
    cy.contains(`Money left: ${user2Money} M`);
    // Makes sure the next match indicator is right
    cy.contains("WOB in 0 D 2 H");
    // Switches to user 1
    cy.contains("Standings").click();
    cy.clearCookies().then(() =>
      cy.setCookie("next-auth.session-token", user1).then(() => {
        cy.reload();
      }),
    );
    // Gives other user admin rights
    cy.get("#admins").click();
    cy.get("#admins-option-1").click();
    cy.contains("Save admin settings").click();
    // Trys to outbid Lewandoski purchase
    cy.contains("Transfer").click();
    cy.contains(`Money left: ${user1Money} M`);
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Buy")
      .click();
    cy.get("#amount").clear();
    cy.get("#amount").type("26");
    user2Money -= 0.2;
    cy.contains("Buy for").click();
    cy.contains(`Money left: ${user1Money} M`);
    // Then actually outbids
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Buy")
      .click();
    cy.get("#amount").clear();
    cy.get("#amount").type("26.1");
    user2Money += 26;
    user1Money -= 26.1;
    cy.contains("Buy for").click();
    cy.contains(`Money left: ${user1Money} M`);
    // Then cancels the transaction
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Edit purchase")
      .click();
    cy.contains("Cancel purchase").click();
    user1Money += 25.8;
    user1Money = Math.floor(user1Money * 10) / 10;
    cy.contains(`Money left: ${user1Money} M`);
    // Then buys the player again
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Buy")
      .click();
    user1Money -= 25.8;
    user1Money = Math.ceil(user1Money * 10) / 10;
    cy.contains("Buy for").click();
    cy.contains(`Money left: ${user1Money} M`);
    cy.contains("Unlimited transfers left");
    cy.contains("Squad").click();
    cy.contains("Move to field").click();
    cy.contains("Star").click();
    cy.contains("Move to bench").click();
    // Makes sure the player can be moved back to the bench
    cy.contains("Move to field").click();
    cy.contains("Star").click();
    cy.contains("Buying");
    // Switches to user 2
    cy.contains("Standings").click();
    cy.clearCookies().then(() =>
      cy.setCookie("next-auth.session-token", user2).then(() => {
        cy.reload();
      }),
    );
    // Changes the amount of times a player can be in a squad and buys lewandowski
    cy.get("#duplicatePlayers").clear();
    cy.get("#duplicatePlayers").type(2);
    cy.contains("Save admin settings").click();
    cy.contains("Transfer").click();
    cy.contains("Unlimited transfers left");
    cy.contains(`Money left: ${user2Money}`);
    cy.contains("Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("Buy")
      .click();
    user2Money -= 25.8;
    cy.contains("Buy for").click();
    cy.contains(`Money left: ${user2Money}`);
    // Buys players until out of money
    cy.contains("Thomas").parent().parent().parent().contains("Buy").click();
    user2Money -= 21;
    cy.contains("Buy for").click();
    cy.contains("Nkunku").parent().parent().parent().contains("Buy").click();
    user2Money -= 20.1;
    cy.contains("Buy for").click();
    cy.contains("Haaland").parent().parent().parent().contains("Buy").click();
    user2Money -= 19.7;
    user2Money = Math.floor(user2Money * 10) / 10;
    cy.contains("Buy for").click();
    cy.contains(`Money left: ${user2Money}`);
    cy.contains("Kimmich")
      .parent()
      .parent()
      .parent()
      .contains("View transfers")
      .click();
    cy.contains("Buy for").should("not.exist");
    cy.get("#close").click();
    cy.contains(`Money left: ${user2Money}`);
    // Moves the squad slightly
    cy.intercept("/api/player/Bundesliga/87963521baf120631131").as(
      "loadNkunku",
    );
    cy.contains("Squad").click();
    cy.contains("Squad for");
    cy.contains("Christopher Nkunku")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .click();
    cy.contains("Buying");
    // Starts the matchday
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/invite2.ts",
    ).then(() => {
      cy.contains("Transfers").click();
    });
    cy.contains("Transfer Market closed");
    cy.contains("Transfer Market is closed");
    // Looks at the squad and moves some players around
    cy.contains("Squad").click();
    cy.get("#formation").click();
    cy.contains("5-4-1").click();
    cy.contains("Robert Lewandowski")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .click();
    cy.contains("Erling Haaland")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("Position is full");
    cy.get("#formation").click();
    cy.contains("4-4-2").click();
    cy.contains("Christopher Nkunku")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("Move to bench");
    // Moves Haaland to the field and stars him
    cy.intercept("/api/player/Bundesliga/a4e3b74d3b62fbd6376b").as(
      "loadPlayer",
    );
    cy.contains("Erling Haaland")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .click();
    // Makes sure that Haaland has loaded
    cy.wait("@loadPlayer").then(() =>
      cy
        .contains("Erling Haaland")
        .parent()
        .parent()
        .parent()
        .children(".playerButton")
        .contains("Star")
        .click(),
    );
    cy.contains("Erling Haaland").parent().parent().parent().contains("0");
    // Sims matchday until all players have played
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/invite3.ts",
    );
    // Checks that the user points are correct
    cy.contains("Standings").click();
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("44");
    cy.get(".MuiTableBody-root > :nth-child(2) > :nth-child(2)").contains("22");
    cy.get(".MuiPagination-ul > :nth-child(2)").click();
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("44");
    cy.get(".MuiTableBody-root > :nth-child(2) > :nth-child(2)").contains("22");
    // Moves a player to the bench
    cy.contains("Squad").click();
    cy.contains("Christopher Nkunku")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("Move to bench")
      .click();
    cy.contains("Standings").click();
    // Checks if the points got updated
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("34");
    cy.get(".MuiTableBody-root > :nth-child(2) > :nth-child(2)").contains("22");
    cy.get(".MuiPagination-ul > :nth-child(2)").click();
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("34");
    cy.get(".MuiTableBody-root > :nth-child(2) > :nth-child(2)").contains("22");
    // Checks if the historical viewer can see the playerdata
    cy.get("#fantasy0").click();
    cy.get(':nth-child(2) > [style="width: 70%;"] > :nth-child(1)').contains(
      "Robert Lewandowski",
    );
    // Checks Nkunku button
    cy.contains("Squad").click();
    cy.contains("Squad for");
    cy.contains("Christopher Nkunku")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("Player has already played");
    matchdays.push({ invite1: user1Money, invite2: user2Money });
    // Starts the transfer period and sells Lewandowski
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/invite4.ts",
    );
    cy.intercept("/api/player/Bundesliga/ef5112a9f971a1e40966").as(
      "loadRobert",
    );
    cy.contains("Transfer").click();
    cy.wait("@loadRobert").then(() =>
      cy
        .contains("Lewandowski")
        .parent()
        .parent()
        .parent()
        .contains("Sell")
        .click(),
    );
    user2Money += 25.8;
    cy.get(".MuiPaper-root > .MuiButton-root").click();
    cy.contains(`Money left: ${user2Money}`);
    cy.contains("Squad").click();
    // Goes to the squad and moves Lewandowski to the bench and makes sure lewandowski is hidden when showSelling is disabled
    cy.contains("Squad for");
    cy.contains("Robert Lewandowski")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("Move to bench")
      .click();
    cy.contains("Robert Lewandowski");
    cy.get("#showSelling").click();
    // Switches user and sets the duplicate players setting to 1
    cy.contains("Robert Lewandowski")
      .should("not.exist")
      .then(() => {
        cy.clearCookies().then(() =>
          cy.setCookie("next-auth.session-token", user1),
        );
      })
      .then(() => {
        cy.reload().then(() => {
          cy.contains("Standings").click();
        });
      });
    cy.get("#duplicatePlayers").clear();
    cy.get("#duplicatePlayers").type(1);
    cy.contains("Save admin settings").click();
    cy.contains("Squad").click();
    // Checks if this user has Lewandowski still and that he is starred
    cy.get('[alt="starred"]');
    cy.contains("Robert Lewandowski")
      .parent()
      .parent()
      .parent()
      .contains("12 X Star");
    cy.contains("Robert Lewandowski")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("Move to bench")
      .click();
    // Makes sure that Lewandowski has changed clubs
    cy.contains("VFB");
    // Purchases Mueller and checks if Nkunku is purchasable
    cy.contains("Transfer").click();
    cy.contains("Christopher Nkunku")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .contains("View transfers");
    cy.contains(`Money left: ${user1Money}`);
    // Sells Lewandowski for outrageous price knowing noone will take it
    cy.contains("Robert Lewandowski")
      .parent()
      .parent()
      .parent()
      .children(".playerButton")
      .children("button")
      .click();
    cy.get("#amount").clear();
    cy.get("#amount").type("40");
    cy.contains("Sell for min of 40").click();
    // Checks the standings
    cy.contains("Standings").click();
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("34");
    cy.get(".MuiTableBody-root > :nth-child(2) > :nth-child(2)").contains("22");
    // Goes to historical view and checks if the title is correct
    cy.get("#fantasy0").click();
    cy.contains("Invite 2's squad from New Sample League");
    cy.contains(`Money left: ${user2Money} M`);
    // Makes sure the team BVB they are playing is correct
    cy.contains("Next").parent().contains("BSC");
    // Looks at the historical data for one of the users
    cy.get(':nth-child(7) > [style="width: 70%;"] > :nth-child(1)').contains(
      "Robert Lewandowski",
    );
    cy.get('[alt="starred"]');
    cy.get(":nth-child(4) > .playerButton > p").contains("Selling for 25.8 M");
    cy.get(".MuiPagination-ul > :nth-child(2) > .MuiButtonBase-root").click();
    cy.contains("Invite 2's squad on matchday 1 from New Sample League");
    cy.contains(`Money left: ${matchdays[0].invite2} M`);
    cy.contains("Next").should("not.exist");
    cy.get('[alt="starred"]');
    cy.get(':nth-child(3) > [style="width: 70%;"] > :nth-child(1)').contains(
      "Robert Lewandowski",
    );
    cy.get(
      ":nth-child(2) > :nth-child(3) > [style='width: 70%;'] > :nth-child(1) > a >.MuiTypography-root",
    ).contains("Robert Lewandowski");
    cy.contains("19.7 M");
    matchdays.push({ invite1: user1Money, invite2: user2Money });
    // Simulates an empty matchday
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/invite5.ts",
    );
    // Adds a third user that joins late
    cy.clearCookies();
    cy.get("#logout").click();
    cy.visit("http://localhost:3000/api/invite/invite1");
    cy.contains("Click here for creating an account").click();
    cy.get("#username").type("Invite 3");
    cy.get("#password").type("password");
    cy.get(".center > .MuiButtonBase-root").click();
    cy.contains("Leagues").click();
    cy.visit("http://localhost:3000/api/invite/invite1");
    // Makes sure this user actually has points for matchday 2
    cy.get(".MuiPagination-ul > :nth-child(3)").click();
    cy.get(".MuiTableBody-root > :nth-child(3) > :nth-child(2)").contains("0");
    // Checks if the league settings part is shown
    cy.contains("Settings");
    // Has all players leave the league
    cy.contains("Leagues").click();
    cy.contains("Leave league").click();
    cy.get(".MuiDialogContent-root > .MuiFormControl-root").type(
      "New Sample League",
    );
    cy.get(".MuiDialogActions-root > .MuiButton-contained").click();
    cy.clearCookies().then(() =>
      cy.setCookie("next-auth.session-token", user2),
    );
    cy.reload();
    // Archives the league
    cy.contains("Open league").click();
    cy.contains(
      "Check this to archive the league when you press save.",
    ).click();
    cy.get("#confirmationArchive").type("New Sample League");
    cy.contains("Save admin settings").click();
    // Simulates an empty matchday
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/invite5.ts",
    );
    // Makes sure that the matchday does not exist
    cy.go("back").then(() => {
      cy.get(".MuiPagination-ul > :nth-child(4) > .MuiButtonBase-root")
        .contains("3")
        .should("not.exist");
    });
    cy.contains("Leagues").click();
    cy.contains("Leave league").click();
    cy.get(".MuiDialogContent-root > .MuiFormControl-root").type(
      "New Sample League",
    );
    cy.get(".MuiDialogActions-root > .MuiButton-contained").click();
    cy.clearCookies().then(() =>
      cy.setCookie("next-auth.session-token", user1),
    );
    cy.reload();
    cy.contains("Leave league").click();
    cy.get(".MuiDialogContent-root > .MuiFormControl-root").type(
      "New Sample League",
    );
    cy.get(".MuiDialogActions-root > .MuiButton-contained").click();
    cy.clearCookies().then(() => cy.get("#logout").click());
    cy.contains("Click here for creating an account").click();
    // Checks if the league is actually deleted
    cy.visit(
      "http://localhost:3000/signup?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fleagues",
    ); // This line is because cypress is weird and removes the callbackUrl from the url
    cy.get("#username").type("Invite 3");
    cy.get("#password").type("password");
    cy.get(".center > .MuiButtonBase-root").click();
    cy.contains(
      "Your favorited league will be available in the menu when you are not in a league. ",
    );
    cy.visit("http://localhost:3000/api/invite/invite1", {
      failOnStatusCode: false,
    });
    cy.get(".center").contains("404"); //*/
  });
});
