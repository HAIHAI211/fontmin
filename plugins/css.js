/**
 * @file css
 * @author junmer
 */

/* eslint-env node */
var _ = require("lodash");
var fs = require("fs");
var path = require("path");
var isTtf = require("is-ttf");
var through = require("through2");
var replaceExt = require("replace-ext");
var b2a = require("b3b").b2a;

/**
 * tpl
 *
 * @type {string}
 */
var tpl = fs
  .readFileSync(path.resolve(__dirname, "../lib/font-face.tpl"))
  .toString("utf-8");

var simpleTpl = fs
  .readFileSync(path.resolve(__dirname, "../lib/font-face-simple.tpl"))
  .toString("utf-8");

/**
 * renderCss
 *
 * @type {function}
 */
var renderCss = _.template(tpl);
var renderSimpleCss = _.template(simpleTpl)

/**
 * listUnicode
 *
 * @param  {Array} unicode unicode
 * @return {string}         unicode string
 */
function listUnicode(unicode) {
  return unicode
    .map(function (u) {
      return "\\" + u.toString(16);
    })
    .join(",");
}

/**
 * get glyf list from ttf obj
 *
 * @param {ttfObject} ttf ttfObject
 * @return {Object} icon obj
 */
function getGlyfList(ttf) {
  var glyfList = [];

  // exclude empty glyf
  var filtered = ttf.glyf.filter(function (g) {
    return (
      g.name !== ".notdef" &&
      g.name !== ".null" &&
      g.name !== "nonmarkingreturn" &&
      g.unicode &&
      g.unicode.length
    );
  });

  // format glyf info
  filtered.forEach(function (g) {
    glyfList.push({
      code: "&#x" + g.unicode[0].toString(16) + ";",
      codeName: listUnicode(g.unicode),
      name: g.name || "uni" + g.unicode[0].toString(16),
    });
  });

  return {
    glyfList: glyfList,
  };
}

/**
 * get font family name
 *
 * @param {Object} fontInfo font info object
 * @param {ttfObject} ttf ttfObject
 * @param {Object} opts opts
 * @return {string} font family name
 */
function getFontFamily(fontInfo, ttf, opts) {
  var fontFamily = opts.fontFamily;
  // Call transform function
  if (typeof fontFamily === "function") {
    fontFamily = fontFamily(_.cloneDeep(fontInfo), ttf);
  }
  return fontFamily || ttf.name.fontFamily || fontInfo.fontFile;
}

/**
 * Transform font family name
 * @callback FontFamilyTransform
 * @param {Object} font info object
 * @param {ttfObject} ttf ttfObject
 * @return {string} font family name
 */
// function(fontInfo, ttfObject) { return "Font Name"; }

/**
 * css fontmin plugin
 *
 * @param {Object} opts opts
 * @param {boolean=} opts.glyph     generate class for each glyph. default = false
 * @param {boolean=} opts.base64    inject base64
 * @param {string=} opts.iconPrefix icon prefix
 * @param {string=} opts.filename  set filename
 * @param {(string|FontFamilyTransform)=} opts.fontFamily fontFamily
 * @return {Object} stream.Transform instance
 * @api public
 */
module.exports = function (opts) {
  opts = opts || {};

  return through.ctor(
    {
      objectMode: true,
    },
    function (file, enc, cb) {
      // check null
      if (file.isNull()) {
        cb(null, file);
        return;
      }

      // check stream
      if (file.isStream()) {
        cb(new Error("Streaming is not supported"));
        return;
      }

      // check ttf
      if (!isTtf(file.contents)) {
        cb(null, file);
        return;
      }

      // clone
      this.push(file.clone(false));
      console.log('origin file.path', file.path)
      file.path = replaceExt(file.path, ".css");
      console.log('new file.path', file.path)
      console.log('new dirname', path.dirname(file.path))
      var fontFile = opts.filename || path.basename(file.path, ".css");
      console.log("opts.filename: ", opts.filename);
      console.log("file.path", file.path);
      console.log(
        "path.basename(file.path, '.css')",
        path.basename(file.path, ".css")
      );
      console.log("fontFile", fontFile);
      var cssFileName = opts.cssFileName || fontFile
      var newFilePath = path.dirname(file.path) + "/" + cssFileName + ".css"
      file.path = newFilePath
      // font data
      var fontInfo = {
        fontFile: fontFile,
        fontPath: "",
        base64: "",
        glyph: false,
        iconPrefix: "icon",
        local: false,
      };
      console.log('fontInfo', fontInfo)
      console.log('opts', opts)
      // opts
      _.extend(fontInfo, opts);

      console.log('fontInfo', fontInfo)
      console.log('opts', opts)



      // ttf obj
      var ttfObject = file.ttfObject || {
        name: {},
      };

      // glyph
      if (opts.glyph && ttfObject.glyf) {
        _.extend(fontInfo, getGlyfList(ttfObject));
      }

      // font family
      fontInfo.fontFamily = getFontFamily(fontInfo, ttfObject, opts);

      // rewrite font family as filename
      if (opts.asFileName) {
        fontInfo.fontFamily = fontFile;
      }

      // base64
      if (opts.base64) {
        fontInfo.base64 =
          "" +
          "data:application/x-font-ttf;charset=utf-8;base64," +
          b2a(file.contents);
      }

      // local
      if (fontInfo.local === true) {
        fontInfo.local = fontInfo.fontFamily;
      }

      // render
      var output = _.attempt(function (data) {
        console.log('使用simple模板？', opts.simple)
        return Buffer.from(opts.simple ? renderSimpleCss(data) : renderCss(data));
      }, fontInfo);

      console.log("file", file);
      console.log("output", output);

      if (_.isError(output)) {
        console.log('route1')
        cb(output, file);
      } else {
        file.contents = output;
        console.log('route2')
        cb(null, file);
      }
    }
  );
};
