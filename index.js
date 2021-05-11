const axios = require("axios");
const cheerio = require("cheerio");
const { decode } = require("html-entities");
const urlEncode = require("urlencode");
const fs = require("fs");

const baseUrl = "https://api.smmdb.net";
const downloadBaseUrl = "https://tinfoil.media/MarioMaker/Download";
const authHeader = {
  headers: {
    Authorization: `APIKEY ${process.env.ACCOUNT_ID} ${process.env.APIKEY}`,
  },
};

async function main(useCache = false) {
  console.log("Downloading Tinfoil HTML...");
  let tinfoil;
  if (useCache && fs.existsSync("tinfoil.html")) {
    tinfoil = fs.readFileSync("tinfoil.html");
    console.log("Using cached HTML file");
  } else {
    const response = await axios.get("https://tinfoil.io/MarioMaker");
    tinfoil = response.data;
    console.log("Downloading Tinfoil HTML complete");
  }
  if (useCache) {
    fs.writeFileSync("tinfoil.html", tinfoil);
  }
  const $ = cheerio.load(tinfoil);
  const tr = $("table tr");

  for (let i = 30000; i < tr.get().length; i++) {
    try {
      const courseTr = tr.get(i);
      const courseA = $(courseTr).find("a[href]");
      let courseDif = $($(courseTr).find("td").get(3)).html();
      if (courseDif && courseDif.trim()) {
        courseDif = courseDif.trim().replace(/ /g, "").toLowerCase();
      }
      const name = decode(String($(courseA).html()));
      let courseId = $(courseA).attr("href").replace(/\\"/g, "").split("/");
      courseId = courseId[courseId.length - 1];
      const searchUrl = `${baseUrl}/courses2?title=${urlEncode(
        name,
      )}&title_exact=true&title_case_sensitive=true`;
      const res = await axios.get(searchUrl);
      if (res.data.length === 0) {
        console.info(
          `Found new course: ${name}, ID: ${courseId}, Difficulty: ${courseDif}`,
        );
        const courseRes = await axios.get(`${downloadBaseUrl}/${courseId}`, {
          responseType: "arraybuffer",
        });
        let putUrl = `${baseUrl}/courses2`;
        if (courseDif) {
          putUrl += `?difficulty=${courseDif}`;
        }
        const res = await axios.put(putUrl, courseRes.data, authHeader);
        if (res.data.failed.length > 0) {
          console.info("Course failed uploading:", searchUrl);
          console.info("Reason:", res.data.failed);
        } else {
          console.info(
            `Uploaded new course: ${name}, ID: ${courseId}, Difficulty: ${courseDif}`,
          );
        }
      } else if (
        courseDif &&
        res.data.length === 1 &&
        res.data[0].difficulty == null &&
        res.data[0].owner === process.env.ACCOUNT_ID
      ) {
        console.info(
          `Setting difficulty for course: ${name}, ID: ${courseId}, Difficulty: ${courseDif}`,
        );
        const smmdbId = res.data[0].id;
        await axios.post(
          `${baseUrl}/courses2/meta/${smmdbId}`,
          {
            difficulty: courseDif,
          },
          authHeader,
        );
      }
    } catch (err) {
      if (err.response) {
        console.error(err.response.data);
      } else {
        console.error(err);
      }
    }
  }
}

main();
