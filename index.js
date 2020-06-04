const axios = require("axios");
const cheerio = require("cheerio");
const Entities = require("html-entities").AllHtmlEntities;
const urlEncode = require("urlencode");
// const fs = require("fs");

const entities = new Entities();
const baseUrl = "https://api.smmdb.net";
// const baseUrl = "http://localhost:3030";
const downloadBaseUrl = "https://tinfoil.media/MarioMaker/Download";

async function main() {
  console.log("Downloading Tinfoil HTML...");
  const response = await axios.get("https://tinfoil.io/MarioMaker");
  const tinfoil = response.data;
  console.log("Downloading Tinfoil HTML complete");
  // const tinfoil = fs.readFileSync("../../Downloads/tinfoil.html");
  const $ = cheerio.load(tinfoil);
  const tr = $("table tr");

  for (let i = 0; i < tr.get().length; i++) {
    try {
      const courseTr = tr.get(i);
      const courseA = $(courseTr).find("a[href]");
      let courseDif = $($(courseTr).find("td").get(3)).html();
      if (courseDif && courseDif.trim()) {
        courseDif = courseDif.trim().replace(/ /g, "").toLowerCase();
      }
      const name = entities.decode(String($(courseA).html()));
      let courseId = $(courseA).attr("href").replace(/\\"/g, "").split("/");
      courseId = courseId[courseId.length - 1];
      const searchUrl = `${baseUrl}/courses2?title=${urlEncode(
        name
      )}&title_exact=true&title_case_sensitive=true`;
      const res = await axios.get(searchUrl);
      if (res.data.length === 0) {
        console.info(
          `Found new course: ${name}, ID: ${courseId}, Difficulty: ${courseDif}`
        );
        const courseRes = await axios.get(`${downloadBaseUrl}/${courseId}`, {
          responseType: "arraybuffer",
        });
        let putUrl = `${baseUrl}/courses2`;
        if (courseDif) {
          putUrl += `?difficulty=${courseDif}`;
        }
        const res = await axios.put(putUrl, courseRes.data, {
          headers: {
            Authorization: `APIKEY ${process.env.ACCOUNT_ID} ${process.env.APIKEY}`,
          },
        });
        if (res.data.failed.length > 0) {
          console.info("Course failed uploading:", searchUrl);
          console.info("Reason:", res.data.failed);
        }
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
