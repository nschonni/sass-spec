var assert = require('assert'),
    fs = require('fs'),
    exists = fs.existsSync,
    path = require('path'),
    join = require('path').join,
    read = fs.readFileSync,
    sass = require('node-sass'),
    readYaml = require('read-yaml'),
    objectMerge = require('object-merge'),
    glob = require('glob'),
    version = 3.4;

var normalize = function(str) {
  return str.replace(/\s+/g, '').replace('{', '{\n').replace(';', ';\n');
};

var specPath = join(__dirname, 'spec')
var inputs = glob.sync(specPath + "/**/input.*");

var initialize = function(folder, options) {
  var testCase = {};
  testCase.folder = folder;
  testCase.name = path.basename(folder);
  testCase.inputPath = join(folder, 'input.scss');
  testCase.expectedPath = join(folder, 'expected_output.css');
  testCase.errorPath = join(folder, 'error');
  testCase.statusPath = join(folder, 'status');
  testCase.optionsPath = join(folder, 'options.yml');
  if (exists(testCase.optionsPath)) {
    options = objectMerge(options, readYaml.sync(testCase.optionsPath));
  }
  testCase.includePaths = [
    folder,
    join(folder, 'sub')
  ]
  testCase.options = options;
  testCase.result = false;

  // Probe filesystem once and cache the results
  testCase.shouldFail = exists(testCase.statusPath) && !fs.statSync(testCase.statusPath).isDirectory();
  testCase.verifyStderr = exists(testCase.errorPath) && !fs.statSync(testCase.errorPath).isDirectory();
  return testCase;
}

describe('spec', function() {
  inputs.forEach(function(input) {
    var folder = path.dirname(input)
    var options = {};
    var optionsPath = folder;
    while (optionsPath != specPath) {
      var optionsFile = join(optionsPath, 'options.yml');

      if (exists(optionsFile)) {
        options = objectMerge(options, readYaml.sync(optionsFile));
      }
      optionsPath = path.join(optionsPath, '..')
    }

    var test = initialize(folder, options);

    var isTodo = test.options[':todo'] != null && test.options[':todo'].indexOf('libsass') != -1;
    var isWarningTodo = test.options[':warning_todo'] != null && test.options[':warning_todo'].indexOf('libsass') != -1;
    var minVersion = parseFloat(test.options[':start_version']) || 0;
    var maxVersion = parseFloat(test.options[':end_version']) || 99;

    it(test.folder, function(done) {
      if (isTodo || isWarningTodo) {
        this.skip("Test marked with TODO");
      } else if (version < minVersion) {
        this.skip("Tests marked for newer Sass versions only");
      } else if (version > maxVersion) {
        this.skip("Tests marked for older Sass versions only");
      } else {
        var expected = normalize(read(test.expectedPath, 'utf8'));
        sass.render({
            file: test.inputPath,
            includePaths: test.includePaths
          }, function(error, result) {
            if (test.verifyStatus) {
              assert(error);
            }
            if (test.verifyStderr) {
              assert(error);
            }
            if (expected) {
              assert.equal(normalize(result.css.toString()), expected);
            }
            done();
        });
      }
    });
  });
});
