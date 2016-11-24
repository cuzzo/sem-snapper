#! /usr/bin/env node

var Nightmare = require("nightmare");
var Mustache = require("mustache");
var fs = require("fs");
var co = require("co");

function load_dimensions() {
  return JSON.parse(fs.readFileSync("./dimensions.json", "utf8"));
}

function load_pages() {
  var pages = fs
    .readFileSync("./requests.txt", "utf8")
    .split("\n")
    .filter(function(p) { return p.trim() !== "" });

  host = pages.shift();
  return pages.map(function(p) { return host + p });
}

function generate_view() {
  var dimensions = load_dimensions();
  var template = fs.readFileSync("./index.mustache.html", "utf8");

  var view = Object
    .keys(dimensions)
    .reduce(function(acc, viewport) {
      acc.sections.push({
        title: viewport,
        images: fs.readdirSync("./screenshots/" + viewport).map(function(image) {
            return "screenshots/" + viewport + "/" + image;
          })
      });
      return acc;
    }, {"sections": []});

  console.log(Mustache.render(template, view));
}

var snap_viewport = function*(viewport, dimensions) {
  var nightmare = Nightmare()
    .viewport(...dimensions);

  var promises = load_pages()
    .map(function(page) {
      var fname = page.split("/").pop().split("?").pop().split("=").pop();
      return nightmare
        .cookies.clear()
        .goto(page)
        .wait(3000)
        .screenshot("./screenshots/" + viewport + "/" + fname + ".jpg")
    });

  yield nightmare.end();

  return promises;
}

var main = function*() {
  var dimensions = load_dimensions();

  var promises = Object
    .keys(dimensions)
    .map(function(viewport) {
      return co(snap_viewport(viewport, dimensions[viewport]));
    });

  yield promises;
}

co(main())
  .then(generate_view)
  .catch(console.error);
