// Node modules
var path = require('path');
var mkdirp = require('mkdirp');
var fetch = require('fetch');
var Decrypter = require('./decrypter.js');
var fs = require('fs');
var pad = require('pkcs7').pad;
// Constants
var IV;
var keyURI;
var begunEncryption = false;
var duplicateFileCount = 0;

//downloads the first segment encountered that hasn't already been downloaded.
function download(rootUri, cwd, bandwidth, shutDown, finishedDownloadingSegment) {
  var i,
    seg,
    filename,
    playlist = this;
  for (i = 0; i < this.segments.length; i++) {
    seg = this.segments[i];
    console.log("seg encrypted: ", seg.encrypted);
    console.log(seg.mediaSequenceNumber);
    if (!seg.downloaded) {
      if (!seg.line.match(/^https?:\/\//i)) {
        seg.line = rootUri + '/' + seg.line;
      }
      seg.downloaded = true;
      filename = path.basename(seg.line);
      console.log('Start fetching');
      cwd = cwd + '/' + 'bandwidth-' + bandwidth + '/';

      if (seg.encrypted) {
        // Fetch the key
        fetch.fetchUrl(seg.keyURI, function (err, meta, keyBody) {
          var key_bytes;
          if (err) {
            return done(err);
          }
          // Convert it to an Uint32Array
          key_bytes = new Uint32Array([
            keyBody.readUInt32BE(0),
            keyBody.readUInt32BE(4),
            keyBody.readUInt32BE(8),
            keyBody.readUInt32BE(12)
          ]);
          // Fetch segment data
          fetch.fetchUrl(seg.line, function (error, meta, segmentBody) {
            if (error) {
              return done(error);
            }
            if (meta.status === 404) {
              return;
            }
            // Convert it to an Uint8Array
            var segmentData = new Uint8Array(segmentBody),
              decryptedSegment;

            // Use key, iv, and segment data to decrypt segment into Uint8Array
            decryptedSegment = new Decrypter(segmentData, key_bytes, seg.IV, function (err, data) {
            // Save Uint8Array to disk
              if (filename.match(/\?/)) {
                filename = filename.match(/^.+\..+\?/)[0];
                filename = filename.substring(0, filename.length - 1);
              }
              if (fs.existsSync(path.resolve(cwd, filename))) {
                filename = filename.split('.')[0] + seg.mediaSequenceNumber + '.' + filename.split('.')[1];
              }
              fs.writeFile(path.resolve(cwd, filename), new Buffer(data), function () { console.log("Finished fetching");finishedDownloadingSegment(playlist);});
              return;
            });

          });
        });
      } else {
        return streamToDisk(seg, filename, cwd, bandwidth, finishedDownloadingSegment, playlist);
      }
      return;
    }
    if (i === this.segments.length - 1 && this.endList) {
      shutDown();
    }
  }
}

function streamToDisk (resource, filename, cwd, bandwidth, finishedDownloadingSegment, playlist) {
  // Fetch it to CWD (streaming)
  var segmentStream = new fetch.FetchStream(resource.line),
    outputStream;

  //handle duplicate filenames & remove query parameters
  if (filename.match(/\?/)) {
    filename = filename.match(/^.+\..+\?/)[0];
    filename = filename.substring(0, filename.length - 1);
  }
  if (fs.existsSync(path.resolve(cwd, filename))) {
    filename = filename.split('.')[0] + duplicateFileCount + '.' + filename.split('.')[1];
    duplicateFileCount += 1;
  }
  if (!filename.match(/.+ts$/i)) {
    filename = "segment" + duplicateFileCount + ".ts";
    duplicateFileCount += 1;
  }
  outputStream = fs.createWriteStream(path.resolve(cwd, filename));
  segmentStream.pipe(outputStream);

  segmentStream.on('error', function (err) {
    console.error('Fetching of url:', resource.line);
    //return done(err);
  });
  segmentStream.on('end', function () {
    console.log('Finished fetching', resource.line);
    console.log(finishedDownloadingSegment);
    finishedDownloadingSegment(playlist);
    //return done();
  });
}

module.exports = download;
