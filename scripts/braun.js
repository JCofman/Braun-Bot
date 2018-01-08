const PDFJS = require("pdfjs-dist");
const request = require("request");
const cheerio = require("cheerio");
const { defaultReply } = require("./braun-script");

module.exports = function(robot) {
  robot.respond(/was gibts/i, function(res) {
    defaultReply(res);
  });
  robot.respond(/food/i, function(res) {
    defaultReply(res);
  });
  robot.respond(/hunger/i, function(res) {
    defaultReply(res);
  });
};
