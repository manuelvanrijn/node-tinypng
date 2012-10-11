/*
 * tinypng
 * https://github.com/manuelvanrijn/node-tinypng
 *
 * Copyright (c) 2012 Manuel van Rijn
 * Licensed under the MIT license.
 */

var fs = require('fs');
var path = require('path');
var filesize = require('filesize');
var tinypng = require('./tinypng');

exports.process = function(inputs, settings) {
  var defaults = {
    verbose: false,
    overwrite_original: false,
    inputs: []
  };

  settings = settings || {};
  for (var key in defaults) {
    settings[key] = (typeof settings[key] !== 'undefined') ? settings[key] : defaults[key];
  }

  var log = function(msg) {
    if(settings.verbose) {
      console.log('[tinypng] ' + msg);
    }
  };

  var processLogHistory = {
    inputSize: 0,
    outputSize: 0,
    messages: []
  };
  var processLog = function(msg, tinyPngResult) {
    if(settings.verbose) {
      log(msg);
      return;
    }

    process.stdout.write('\u001B[2J\u001B[0;0f');

    processLogHistory.inputSize += tinyPngResult.inputSize;
    processLogHistory.outputSize += tinyPngResult.outputSize;
    processLogHistory.messages.push(msg);

    var percentage = Math.round(100 - (processLogHistory.outputSize / (processLogHistory.inputSize / 100)));
    var output = [
      '',
      '',
      'TinyPNG',
      '==========================================',
      'Total input size:    ' + filesize(processLogHistory.inputSize),
      'Total output size:   ' + filesize(processLogHistory.outputSize),
      'Total saved:         ' + filesize(processLogHistory.inputSize - processLogHistory.outputSize) + ' (' + percentage + '%)',
      '==========================================',
      ''
    ].join('\n');
    output = processLogHistory.messages.join('\n') + output;
    process.stdout.write(output);
  };

  var isValidTinyPngFile = function(file) {
    return file.match(/\.(png)/i) !== null;
  };

  var recursiveReadDir = function(directory) {
    var files = [];
    fs.readdirSync(directory).forEach(function(item) {
      var currentFile = path.join(directory, item);
      var stats = fs.statSync(currentFile);
      if (stats.isFile()) {
        if(isValidTinyPngFile(currentFile)) {
          files.push(currentFile);
        }
      }
      else if (stats.isDirectory()) {
        files = files.concat(recursiveReadDir(currentFile));
      }
    });
    return files;
  };

  // normalize inputs to array if single file is given
  if(typeof inputs === 'string')
    inputs = [inputs];

  // add input to file array
  var files = [];
  inputs.forEach(function(item) {
    item = path.resolve(item);
    var stats = fs.statSync(item);
    if (stats.isFile()) {
      if(isValidTinyPngFile(item)) {
        files.push(item);
      }
    }
    else if (stats.isDirectory()) {
      files = files.concat(recursiveReadDir(item));
    }
  });

  // Loop through all found files and compress them with TinyPng
  files.forEach(function(file) {
    tinypng.shrink(file, function(error, result) {
      var directory = path.dirname(result.sourceFile);
      var filename = path.basename(result.sourceFile);

      if(!error) {
        if(settings.overwrite_original !== true) {
          // make backup of the original file
          // "folder/file.png" becomes "folder/original_file.png"
          var target = path.join(directory, 'original_' + filename);
          log('moved: ' + result.sourceFile + ' to: ' + target);
          /*fs.unlink(target, function(err) {
            fs.rename(result.sourceFile, target);
            result.saveToDisk(result.sourceFile);
            console.log("file: " + filename + " new size: " + result.getOutputSize() + " old size: " + result.getInputSize() + " saved: " + result.getSavedPercentage()  + "%");
          });*/
        }
        else {
          result.saveToDisk(result.sourceFile);
        }

        processLog("file: " + path.basename(result.sourceFile) + " new size: " + result.getOutputSize() + " old size: " + result.getInputSize() + " saved: " + result.getSavedPercentage()  + "%", result);
      }
      else {
        log(result);
      }
    });
  });
};
