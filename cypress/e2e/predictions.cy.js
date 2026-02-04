describe("Create Predictions league and do some simple predictions.", () => {
  before(() => {
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/predictions1.ts",
    );
  });
  // Used to signup change username and password and login again
  it("invite", () => {
    // Signs in
    cy.visit("/signup");
    cy.get("#username").type("Predictions 1");
    cy.get("#password").type("password");
    cy.get(".center > .MuiButtonBase-root").click();
    // Creates league with alternate points for predictions
    cy.contains("Leagues").click();
    cy.get("#name").type("Sample League");
    cy.get("button").contains("Create League").click();
    cy.contains("Open league").click();
    cy.contains("Standings for Sample League");
    // Changes the settings for the points
    cy.get("#predictWinner").clear();
    cy.get("#predictWinner").type(2);
    cy.get("#predictDifference").clear();
    cy.get("#predictDifference").type(3);
    cy.get("#predictExact").clear();
    cy.get("#predictExact").type(5);
    cy.contains("Save admin settings").click();
    cy.contains("Predictions").click();
    cy.contains("RBL").should("not.exist");
    cy.contains("FCB - WOB").parent().children(":nth-child(2)").type("3");
    cy.contains("FCB - WOB").parent().children(":nth-child(3)").type("0");
    cy.contains("BVB - BSC").parent().children(":nth-child(2)").type("2");
    cy.contains("BVB - BSC").parent().children(":nth-child(3)").type("2");
    cy.contains("SGE - M05").parent().children(":nth-child(2)").type("4");
    cy.contains("SGE - M05").parent().children(":nth-child(3)").type("0");
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/predictions2.ts",
    );
    cy.contains("Standings").click();
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("10");
    cy.contains("Predictions").click();
    cy.contains("FCB - WOB")
      .parent()
      .children(":nth-child(3)")
      .contains("3 - 0");
    cy.contains("FCB - WOB")
      .parent()
      .children(":nth-child(5)")
      .contains("5 - 1");
    cy.contains("BVB - BSC")
      .parent()
      .children(":nth-child(3)")
      .contains("2 - 2");
    cy.contains("BVB - BSC")
      .parent()
      .children(":nth-child(5)")
      .contains("2 - 2");
    cy.contains("SGE - M05")
      .parent()
      .children(":nth-child(3)")
      .contains("4 - 0");
    cy.contains("SGE - M05")
      .parent()
      .children(":nth-child(5)")
      .contains("5 - 1");
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/predictions3.ts",
    );
    cy.contains("Standings").click();
    cy.get(".MuiPagination-ul > :nth-child(2) > .MuiButtonBase-root").click();
    cy.get("#predictions0").click();
    // Confirms that the historical predictions and game scores are stored directly
    cy.contains("FCB - WOB")
      .parent()
      .children(":nth-child(3)")
      .contains("3 - 0");
    cy.contains("FCB - WOB")
      .parent()
      .children(":nth-child(5)")
      .contains("5 - 1");
    cy.contains("BVB - BSC")
      .parent()
      .children(":nth-child(3)")
      .contains("2 - 2");
    cy.contains("BVB - BSC")
      .parent()
      .children(":nth-child(5)")
      .contains("2 - 2");
    cy.contains("SGE - M05")
      .parent()
      .children(":nth-child(3)")
      .contains("4 - 0");
    cy.contains("SGE - M05")
      .parent()
      .children(":nth-child(5)")
      .contains("5 - 1");
  });
});
