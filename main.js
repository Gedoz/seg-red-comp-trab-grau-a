// const { exec } = require("child_process");
const fetch = require("node-fetch");
const dns = require("dns");
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

// sublist3r, binaryedge, subscraper, assetfinder
const SEARCH_ENGINE = "assetfinder";
const BINARYEDGE_X_KEY = "7e7d3177-b0cb-468c-aed5-11c89add1920";
const DOMAIN = "terra.com.br";

class DomainProps {
  domain = "";
  address = "";
  port = "";
  service = "";
}

let adresses = [];

console.log("Starting script...\n");
console.log(`Listing domains with ${DOMAIN} ...\n`);

if (SEARCH_ENGINE === "sublist3r") {
  getDomainsBySublist3r();
}

if (SEARCH_ENGINE === "binaryedge") {
  getDomainsByBinaryedge();
}

if (SEARCH_ENGINE === "subscraper") {
  getDomainsBySubscraper();
}

if (SEARCH_ENGINE === "assetfinder") {
  getDomainsByAssetfinder();
}

async function getDomainsByAssetfinder() {
  const { stderr, stdout } = await exec(`assetfinder -subs-only ${DOMAIN}`);
  if (stderr) {
    console.log(stderr);
    return;
  }
  if (stdout) {
    console.log(stdout);
    saveFile("domains", stdout);
  }
}

async function getDomainsBySublist3r() {
  const { stderr, stdout } = await exec(
    `sublist3r -d ${DOMAIN} -o ./assets/sublist3r_report.txt`
  );
  if (stderr) {
    console.error(stderr);
    return;
  }

  console.log(stdout);
  const fileText = await readFile("./assets/sublist3r_report.txt");
  const domains = fileText?.split("\n");

  if (!domains?.length) {
    console.warn("Nenhum resultado encontrado!");
    return;
  }

  getAddressFromHostnames(domains);
}

async function getDomainsBySubscraper() {
  const { stderr, stdout } = await exec(
    `subscraper ${DOMAIN} -r ./assets/subscraper_report.txt`
  );

  if (stderr) {
    console.log("error: ", stderr);
    return;
  }

  console.log(stdout);
  const fileText = await readFile("./assets/subscraper_report.txt");
  const domains = fileText?.split("\n");

  if (!domains?.length) {
    console.warn("Nenhum resultado encontrado!");
    return;
  }

  getAddressFromHostnames(domains);
}

async function getDomainsByBinaryedge() {
  domains = [];
  const response = await fetch(
    `https://api.binaryedge.io/v2/query/domains/subdomain/${DOMAIN}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Key": BINARYEDGE_X_KEY,
      },
    }
  );
  const json = await response?.json();
  if (json?.status === 400) {
    console.error(json?.message);
    return;
  }

  if (!json?.events?.length) {
    console.warn("Nenhum resultado encontrado!");
    return;
  }

  domains = json.events;
  getAddressFromHostnames(json.events);
}

async function getAddressFromHostnames(domains) {
  adresses = [];
  let _domains = [];

  for (const [index, domain] of domains.entries()) {
    const address = await onLookup(domain);
    _domains.push({
      ...new DomainProps(),
      address,
      domain,
    });
    if (address) {
      adresses.push(address);
    }
  }

  const filteredAdresses = [...new Set(adresses)];

  const fileData = _domains
    .map((item) => `${item?.domain} - ${item?.address}`)
    .join("\n");

  saveFile("domains", fileData);
  let fileAdvancedData = [];

  for (const [index, address] of filteredAdresses.entries()) {
    const nmap = await scanNampOnAddress(address);
    console.log(nmap);
    let advancedInfos = [];

    if (nmap.split("\n")[5]) {
      let count = nmap.split("\n").length;

      while (count != 4) {
        let advancedInfo = nmap.split("\n")[count];
        if (advancedInfo != undefined || advancedInfo != null) {
          if (advancedInfo.includes("/")) {
            advancedInfos = [...advancedInfos, advancedInfo];
          }
        }
        count--;
      }
    }
    fileAdvancedData = [
      ...fileAdvancedData,
      `${domains[index]} - ${address} - ${advancedInfos.join(" - ")}`,
    ];
  }

  saveFile("advancedInfos", fileAdvancedData.join("\n"));
}

async function onLookup(domain) {
  return new Promise((resolve) => {
    dns.lookup(domain, (err, address) => resolve(address));
  });
}

async function scanNampOnAddress(address) {
  let seconds = 1;
  const interval = setInterval(() => {
    seconds++;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`Buscando portas do ip ${address}... ${seconds}s`);
  }, 1000);
  const { stdout, stderr } = await exec(`nmap -n ${address}`);
  process.stdout.write("\n");
  clearInterval(interval);
  seconds = 1;
  if (stderr) {
    return stderr;
  }

  return stdout;
}

// função para salvar os arquivos em txt
function saveFile(name, data) {
  try {
    fs.writeFile(`assets/${name}.txt`, data, function (err) {
      if (err) throw err;
    });
  } catch (error) {
    throw new Error(error);
  }
}

async function readFile(path) {
  try {
    const response = await fs.readFileSync(path, { encoding: "utf-8" });
    return response;
  } catch (error) {
    throw new Error(error);
  }
}

/*
  This script is used to enumerate subdomains of a domain.
  It uses the sublist3r tool to do so.

  To run this script, you need to install sublist3r and node js.

  To start:
  node main.js
*/
