/*
 * tinypng
 * https://github.com/manuelvanrijn/node-tinypng
 *
 * Copyright (c) 2012 Manuel van Rijn
 * Licensed under the MIT license.
 */

var fs = require('fs');
var filesize = require('filesize');
var request = require('request');

exports.shrink = function(file, callback) {
  if(!fs.existsSync(file)) {
    callback(true, 'no such file or directory: ' + file);
    return;
  }
  fs.createReadStream(file).pipe(request.post({
    url: 'http://tinypng.org/api/shrink',
    json: true
  }, function(error, response, json) {
    if (!error && response.statusCode == 200) {
      callback(false, new TinyPngResult(json, file));
    }
    else {
      callback(true, 'something went wrong shrink the following file\n file:  "' + file + '"\n error: "' + json.message + '"');
    }
  }));
};

function TinyPngResult(json, sourceFile) {
  this.inputSize = json.input.size;
  this.outputSize = json.output.size;
  this.outputUrl = json.output.url;
  this.sourceFile = sourceFile;

  this.getInputSize = function() {
    return filesize(this.inputSize);
  };

  this.getOutputSize = function() {
    return filesize(this.outputSize);
  };

  this.getSavedPercentage = function() {
    return Math.round(100 - (this.outputSize / (this.inputSize / 100)));
  };

  this.saveToDisk = function(target) {
    request(this.outputUrl).pipe(fs.createWriteStream(target));
  };
}
