const cheerio = require("cheerio");
const { writeFile } = require("node:fs/promises");

const SIDOR = [
  "https://www.allabolag.se/bransch-s%C3%B6k?q=Arkitekter",
  "https://www.allabolag.se/bransch-s%C3%B6k?q=Arkitekter&page=2",
  "https://www.allabolag.se/bransch-s%C3%B6k?q=Arkitekter&page=3",
  "https://www.allabolag.se/bransch-s%C3%B6k?q=Arkitekter&page=4",
  "https://www.allabolag.se/bransch-s%C3%B6k?q=Arkitekter&page=5",
];

const VÄNTETID = 500;

// Lämna tom för att inte använda proxy.
const PROXY_URL = "";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/140.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9," +
    "image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",

  // Be servern och eventuella mellanhänder att inte använda cache.
  "Cache-Control": "no-cache, no-store, max-age=0",
  Pragma: "no-cache",
};

function vänta(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function städaText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function hämtaFältText($, element, etikett = "") {
  if (!element.length) {
    return "";
  }

  const kopia = element.clone();

  // Ikonerna innehåller ingen text vi behöver.
  kopia.find("svg").remove();

  let text = städaText(kopia.text());

  if (etikett && text.startsWith(etikett)) {
    text = städaText(text.slice(etikett.length));
  }

  return text;
}

function csvFält(värde) {
  const text = String(värde ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function läsFöretagFrånHtml(html) {
  const $ = cheerio.load(html);
  const företag = [];

  $(".SearchResultCard-card").each((index, kort) => {
    const $kort = $(kort);

    const name = städaText(
      $kort
        .find(".addax-cs_hl_hit_company_name_click")
        .first()
        .text()
    );

    const egenskaper = $kort.find(
      ".SearchResultCard-iconDataContainer .CardHeader-propertyList"
    );

    const orgElement = egenskaper
      .filter((index, element) => {
        return städaText($(element).text()).startsWith("Org.nr");
      })
      .first();

    const phoneElement = $kort
      .find(".CardHeader-phone")
      .first();

    const addressElement = egenskaper
      .filter((index, element) => {
        const text = städaText($(element).text());

        return (
          text !== "" &&
          !text.startsWith("Org.nr") &&
          !text.startsWith("Telefon")
        );
      })
      .first();

    företag.push({
      name,
      orgnr: hämtaFältText($, orgElement, "Org.nr"),
      phone: hämtaFältText($, phoneElement, "Telefon"),
      address: hämtaFältText($, addressElement),
    });
  });

  return företag;
}

async function skapaProxyDispatcher() {
  if (!PROXY_URL) {
    return undefined;
  }

  // Den här delen körs endast om PROXY_URL får ett värde.
  const { ProxyAgent } = await import("undici");
  return new ProxyAgent(PROXY_URL);
}

async function hämtaSida(url, dispatcher) {
  const inställningar = {
    method: "GET",
    headers: HEADERS,

    // Node använder normalt ingen webbläsarcache, men detta gör
    // avsikten uttrycklig.
    cache: "no-store",
  };

  if (dispatcher) {
    inställningar.dispatcher = dispatcher;
  }

  const response = await fetch(url, inställningar);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

async function main() {
  const allaFöretag = [];
  const dispatcher = await skapaProxyDispatcher();

  for (let index = 0; index < SIDOR.length; index++) {
    const sidnummer = index + 1;
    const url = SIDOR[index];

    console.log(`Hämtar sida ${sidnummer}: ${url}`);

    try {
      const html = await hämtaSida(url, dispatcher);
      const företagPåSidan = läsFöretagFrånHtml(html);

      allaFöretag.push(...företagPåSidan);

      console.log(
        `Sida ${sidnummer} gav ${företagPåSidan.length} objekt.`
      );
    } catch (error) {
      console.error(
        `Fel på sida ${sidnummer}: ${error.message}`
      );
    }

    // Vänta mellan sidorna, men inte efter den sista.
    if (index < SIDOR.length - 1) {
      await vänta(VÄNTETID);
    }
  }

  const rader = [
    ["name", "orgnr", "phone", "address"],
    ...allaFöretag.map((företag) => [
      företag.name,
      företag.orgnr,
      företag.phone,
      företag.address,
    ]),
  ];

  const csv =
    "\uFEFF" +
    rader
      .map((rad) => rad.map(csvFält).join(","))
      .join("\r\n") +
    "\r\n";

  await writeFile("foretag.csv", csv, "utf8");

  console.log(
    `Klart! Totalt ${allaFöretag.length} företag sparades i foretag.csv.`
  );
}

main().catch((error) => {
  console.error(`Oväntat fel: ${error.message}`);
  process.exitCode = 1;
});