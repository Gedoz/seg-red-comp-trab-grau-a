// const { exec } = require("child_process");
const fetch = require("node-fetch");
const dns = require("dns");
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

// sublist3r, binaryedge
const SEARCH_ENGINE = "binaryedge";
const BINARYEDGE_X_KEY = "7e7d3177-b0cb-468c-aed5-11c89add1920";
const DOMAIN = "ftec.com.br";

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
  exec(
    `sublist3r -d ${DOMAIN} -o ${DOMAIN.replace(".", "")}.txt`,
    (error, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        const response = stderr.split(
          `[-] Enumerating subdomains now for ${DOMAIN}`
        );
        console.log(response[1]);
        return;
      }
    }
  );
}

if (SEARCH_ENGINE === "binaryedge") {
  getDomainsByBinaryedge();
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

  saveFile(fileData);

  for (const [index, address] of filteredAdresses.entries()) {
    const nmap = await scanNampOnAddress(address);
    console.log(nmap);
  }
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
  const { stdout, stderr } = await exec(`nmap -v ${address}`);
  process.stdout.write("\n");
  clearInterval(interval);
  seconds = 1;
  if (stderr) {
    return stderr;
  }

  return stdout;
}

// função para salvar o arquivo no assets/domains.txt
function saveFile(data) {
  try {
    fs.writeFile("assets/domains.txt", data, function (err) {
      if (err) throw err;
    });
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
