// Node modules
var path = require('path');
var fetch = require('fetch');
var parse = require('./parse.js');
var async = require('async');
var fs = require('fs');

function getIt(options, done) {
  var uri = options.uri,
    cwd = options.cwd,
    concurrency = options.concurrency || DEFAULT_CONCURRENCY,
    playlistFilename = path.basename(uri.split('?')[0]);
  //start of the program, fetch master playlist
  fetch.fetchUrl(uri, function getPlaylist(err, meta, body) {
    if (err) {
      console.error('Error fetching url:', uri);
      return done(err);
    }
    if (body.toString().match(/#EXTINF/)) {
      //we were given no master playlist

      var mediaPlaylist = {
        targetDuration:0,
        uri:options.uri,
        mostRecentSegmentUri:undefined,
        bandwidth:1000,
        segments:[]
      },
      oldLength = 1;
      parse.parseMediaPlaylist(mediaPlaylist, doneParsing, path.dirname(options.uri), cwd);
    } else {

    var masterPlaylist = parse.parseMasterPlaylist(uri, body.toString()),
      mediaPlaylists = masterPlaylist.medPlaylists,
      oldLength = mediaPlaylists.length,
      masterManifestLines = masterPlaylist.manLines,
      i;
    playlistFilename = playlistFilename.split('?')[0];
    //save master playlist
    fs.writeFileSync(path.resolve(cwd, playlistFilename), masterPlaylist.manLines.join('\n'));
    // parse the mediaplaylists for segments and targetDuration
    for (i = 0; i < mediaPlaylists.length; i++) {
      parse.parseMediaPlaylist(masterPlaylist.medPlaylists[i], doneParsing, path.dirname(masterPlaylist.uri), cwd);
    }
    masterPlaylist.mediaPlaylists = [];
     var count = 0;
    }
    function doneParsing(playlist) {
     console.log('done parsing');
      if (mediaPlaylist) {
        console.log('seeting  up download of media playlist');
        setupDownload('media');
      } else {
        masterPlaylist.mediaPlaylists.push(playlist);

        // once we have gotten all of the data, setup downloading
        if(masterPlaylist.mediaPlaylists.length === oldLength) {
          setupDownload();
        }
      }
    }


    function setupDownload(type) {
      var pl,
        rootUri,
        newFunction,
        newerFunction,
        updateInterval,
        downloadInterval,
        i;
      if (type === 'media') {
        pl = [mediaPlaylist];
      } else {
        pl = masterPlaylist.mediaPlaylists;
      }
      // set update and download intervals
      for (i = 0; i < pl.length; i++) {
        if (pl[i].targetDuration === 0) {
          continue;
        }
        rootUri = path.dirname(pl[i].uri);
        updateFunction = pl[i].update.bind(pl[i]);
        downloadFunction = pl[i].download.bind(pl[i]);
        downloadFunction(rootUri, cwd, pl[i].bandwidth);
        if (!pl[i].endList) {
          //Only set update if we haven't found an endlist
          updateInterval = setInterval(updateFunction, pl[i].targetDuration * 1000, rootUri);
        }
        DownloadInterval = setInterval(downloadFunction,pl[i].targetDuration * 500, rootUri, cwd, pl[i].bandwidth, function() {console.log('shutting down');process.exit();});
      }

    }
  });
}
module.exports = getIt;
