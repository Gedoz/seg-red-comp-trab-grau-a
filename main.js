const { exec } = require("child_process");
const fetch = require("node-fetch");
const dns = require("dns");
const nmap = require("node-nmap");
nmap.nmapLocation = "nmap"; //default

// sublist3r, binaryedge
const SEARCH_ENGINE = "binaryedge";
const BINARYEDGE_X_KEY = "7e7d3177-b0cb-468c-aed5-11c89add1920";
const DOMAIN = "ftec.com.br";

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

  getAddressFromHostnames(json.events);
}

function getAddressFromHostnames(domains) {
  domains?.forEach((domain, index) => {
    console.log(`${index + 1} => ${domain}`);
    dns.lookup(domain, (err, address) => {
      console.log(`${index + 1} => ${address}`);
      if (address) {
        let quickscan = new nmap.NmapScan(`${address} ${domain}`, "-sn");
        quickscan.on("complete", function (data) {
          console.log(data);
        });
        quickscan.on("error", function (error) {
          console.log(error);
        });
        quickscan.startScan();
      }
    });
  });
}

/*
  This script is used to enumerate subdomains of a domain.
  It uses the sublist3r tool to do so.

  To run this script, you need to install sublist3r and node js.

  To start:
  node main.js
*/
