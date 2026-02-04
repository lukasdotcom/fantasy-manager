describe("Download Bundesliga data as JSON and CSV", () => {
  const LEAGUE = "Bundesliga";

  const EXPECTED_JSON_FIELDS = [
    "uid",
    "name",
    "nameAscii",
    "club",
    "pictureUrl",
    "value",
    "sale_price",
    "position",
    "forecast",
    "total_points",
    "average_points",
    "last_match",
    "exists",
    "league",
  ];

  const EXPECTED_CSV_HEADERS = [
    "Playeruid",
    "Name",
    "Ascii Name",
    "Club",
    "Picture Url",
    "Value",
    "Sale Price",
    "Position",
    "Forecast",
    "Total Points",
    "Average Points",
    "Last Match Points",
    "Exists",
    "League",
  ];

  before(() => {
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/download1.ts",
    );
  });

  it("downloads JSON and verifies format", () => {
    cy.visit("http://localhost:3000");
    cy.request({
      method: "GET",
      url: `/api/download`,
      qs: { type: "json", league: LEAGUE },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("application/json");
      expect(response.headers["content-disposition"]).to.include(
        "filename=players.json",
      );

      const data = response.body;
      expect(data).to.be.an("array");
      expect(data.length).to.be.greaterThan(0);

      data.forEach((player, index) => {
        expect(player, `Player at index ${index}`).to.be.an("object");
        EXPECTED_JSON_FIELDS.forEach((field) => {
          expect(
            player,
            `Player at index ${index} should have field '${field}'`,
          ).to.have.property(field);
        });
        expect(player.league).to.eq(LEAGUE);
        expect(player.uid).to.be.a("string");
        expect(player.name).to.be.a("string");
        expect(player.club).to.be.a("string");
        expect(player.value).to.be.a("number");
        expect(player.total_points).to.be.a("number");
        expect(player.average_points).to.be.a("number");
        expect(player.pictureUrl).to.include(
          encodeURIComponent("/api/picture/"),
        );
      });
    });
  });

  it("downloads CSV and verifies format", () => {
    cy.visit("http://localhost:3000");
    cy.request({
      method: "GET",
      url: `/api/download`,
      qs: { type: "csv", league: LEAGUE },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("application/csv");
      expect(response.headers["content-disposition"]).to.include(".csv");

      const csvText = response.body;
      expect(csvText).to.be.a("string");
      expect(csvText.length).to.be.greaterThan(0);

      const lines = csvText.trim().split("\n");
      expect(lines.length).to.be.greaterThan(
        1,
        "CSV should have header + data",
      );

      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);

      EXPECTED_CSV_HEADERS.forEach((expectedHeader) => {
        expect(
          headers,
          `CSV should contain header '${expectedHeader}'`,
        ).to.include(expectedHeader);
      });
    });
  });

  it("verifies JSON and CSV contain consistent data", () => {
    cy.request({
      method: "GET",
      url: `/api/download`,
      qs: { type: "json", league: LEAGUE },
    }).then((jsonResponse) => {
      cy.request({
        method: "GET",
        url: `/api/download`,
        qs: { type: "csv", league: LEAGUE },
      }).then((csvResponse) => {
        const jsonData = jsonResponse.body;
        const csvLines = csvResponse.body.trim().split("\n");
        const csvHeaders = parseCSVLine(csvLines[0]);
        const csvRows = csvLines.slice(1).map((line) => parseCSVLine(line));

        expect(jsonData.length).to.eq(
          csvRows.length,
          "JSON and CSV should have same number of players",
        );

        const uidIndex = csvHeaders.indexOf("Playeruid");
        const nameIndex = csvHeaders.indexOf("Name");
        expect(uidIndex).to.be.greaterThan(-1);
        expect(nameIndex).to.be.greaterThan(-1);

        jsonData.forEach((player, index) => {
          const csvRow = csvRows[index];
          expect(csvRow[uidIndex]).to.eq(player.uid);
          expect(csvRow[nameIndex]).to.eq(player.name);
        });
      });
    });
  });
});

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "," && !inQuotes) || char === "\r") {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
