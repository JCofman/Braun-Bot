const PDFJS = require("pdfjs-dist");
const request = require("request");
const cheerio = require("cheerio");
PDFJS.workerSrc = "//mozilla.github.io/pdf.js/build/pdf.worker.js";

module.exports.defaultReply = defaultReply;

var diningPlan = {
  period: "",
  dishes: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  }
};

var formatedDishes = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
};

function resetVariables() {
  formatedDishes = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  diningPlan = {
    period: "",
    dishes: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
  };
}

function doRequest(url) {
  return new Promise(function(resolve, reject) {
    request(url, function(error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}

const extractURL = async () => {
  return new Promise(function(resolve, reject) {
    request("https://www.braun-moebel.de/pages/restaurant-offenburg", function(
      error,
      response,
      html
    ) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);
        resolve(
          $("main")
            .find(".content-block-download")
            .children()
            .attr("href")
        );
      }
    });
  });
};
const loadAndParsePDF = async url => {
  const loadingTask = PDFJS.getDocument(url);
  return loadingTask.promise.then(
    function(pdf) {
      console.log("PDF loaded");

      var pages = [];

      for (var i = 0; i < pdf.numPages; i++) {
        pages.push(i);
      }

      let currentDay;
      var germanDayPattern = /^\d{2}[./-]\d{2}[./-]\d{4}$/;
      return Promise.all(
        pages.map(function(pageNumber) {
          return pdf.getPage(pageNumber + 1).then(function(page) {
            return page.getTextContent().then(function(textContent) {
              return textContent.items
                .map(function(item) {
                  if (isDate(item.str)) {
                    currentDay = parseDate(item.str).getDay();
                  } else {
                    switch (currentDay) {
                      //sunday
                      case 0:
                        diningPlan.dishes.sunday.push(item.str);
                        break;
                      case 1:
                        diningPlan.dishes.monday.push(item.str);
                        break;
                      case 2:
                        diningPlan.dishes.tuesday.push(item.str);
                        break;
                      case 3:
                        diningPlan.dishes.wednesday.push(item.str);
                        break;
                      case 4:
                        diningPlan.dishes.thursday.push(item.str);
                        break;
                      case 5:
                        diningPlan.dishes.friday.push(item.str);
                        break;
                      case 6:
                        diningPlan.dishes.saturday.push(item.str);
                        break;

                      default:
                        break;
                    }

                    return item.str;
                  }
                })
                .join(" ");
            });
          });
        })
      ).then(function(pages) {
        return pages.join("\r\n");
      });
    },
    function(reason) {
      // PDF loading error
      console.error(reason);
    }
  );
};
function isDate(str) {
  var parms = str.split(/[\.\-\/]/);
  var yyyy = parseInt(parms[2], 10);
  var mm = parseInt(parms[1], 10);
  var dd = parseInt(parms[0], 10);
  var date = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
  return (
    mm === date.getMonth() + 1 &&
    dd === date.getDate() &&
    yyyy === date.getFullYear()
  );
}
function parseDate(input) {
  var parts = input.match(/(\d+)/g);
  // note parts[1]-1
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

function formateDishes() {
  Object.keys(diningPlan.dishes).forEach((day, index) => {
    diningPlan.dishes[day].splice(-1, 1); // removes unneeded date.
    let singleDish = "";
    let dayDishes = [];
    diningPlan.dishes[day].map((partDishString, index) => {
      if (!partDishString.includes("€")) {
        singleDish += ` ${partDishString}`;
      } else {
        singleDish += ` ${partDishString}`;
        dayDishes.push(singleDish);
        singleDish = "";
      }
    });
    formatedDishes[day] = dayDishes;
  });
}

function generateMarkdown(day) {
  const currentDate = new Date();

  let markDown = "";
  if (day) {
    markDown += `
    *$Heute (${currentDate.toDateString()}) gibt es folgende Gerichte:*
    `;
    formatedDishes[day].map(dish => {
      markDown += `
      ${dish}
      `;
    });
  } else {
    Object.keys(formatedDishes).forEach((day, index) => {
      markDown += `
    *${day}*
    `;
      formatedDishes[day].map(dish => {
        markDown += `
      ${dish}
      `;
      });
    });
  }
  return markDown;
}
// currentDay 0-6
function getOppeningBraunDay(currentDay) {
  // return null on sunday since Braun is not open on sundays
  if (currentDay === 0) {
    return null;
  } else if (currentDay > 0 && currentDay <= 6) {
    const weekday = [];
    weekday[0] = "sunday";
    weekday[1] = "monday";
    weekday[2] = "tuesday";
    weekday[3] = "wednesday";
    weekday[4] = "thursday";
    weekday[5] = "friday";
    weekday[6] = "saturday";
    return weekday[currentDay];
  } else {
    return null;
  }
}
function defaultReply(res) {
  const currentDate = new Date();
  const currentDay = currentDate.getDay();
  const braunOppenedWeekday = getOppeningBraunDay(currentDay);
  if (braunOppenedWeekday) {
    let food = run(braunOppenedWeekday);
    res.reply("🌭🌮🌯 Okay ich schaue mal nach :) 🌭🌮🌯");

    const dishes = food.then(
      dishes => {
        res.reply(dishes);
        resetVariables();
      },
      function(reason) {
        res.reply(`🙈 Sorry da ist etwas schief gelaufen.`);
        // rejection
      }
    );
  } else {
    res.reply(`🔒 Die Braun-Kantine hat heute geschlossen. 🔒`);
  }
}
async function run(braunOppenedWeekday) {
  const flyerURL = await extractURL();
  const test = await loadAndParsePDF(`https://www.braun-moebel.de${flyerURL}`);
  formateDishes();
  const markdownDishes = generateMarkdown(braunOppenedWeekday);
  return markdownDishes;
}
