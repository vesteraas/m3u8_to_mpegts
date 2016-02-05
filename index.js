var path = require('path');
var fetch = require('fetch');
var parse = require('./parse.js');
var Decrypter = require('./decrypter.js');
var async = require('async');

function getIt(options, done) {
  var uri = options.uri,
    cwd = options.cwd,
    concurrency = options.concurrency || DEFAULT_CONCURRENCY,
    playlistFilename = path.basename(uri);

  //start of the program, fetch master playlist
  fetch.fetchUrl(uri, function getPlaylist(err, meta, body) {
    if (err) {
      console.error('Error fetching url:', uri);
      return done(err);
    }
    //we now have the master playlist
    var masterPlaylist = parse.parseMasterPlaylist(uri, body.toString()),
      mediaPlaylists = masterPlaylist.medPlaylists,
      oldLength = mediaPlaylists.length,
      masterManifestLines = masterPlaylist.manLines,
      i;

    // parse the mediaplaylists for segments and targetDuration
    for (i = 0; i < mediaPlaylists.length; i++) {
      parse.parseMediaPlaylist(masterPlaylist.medPlaylists[i], doneParsing, path.dirname(masterPlaylist.uri));
    }
    masterPlaylist.mediaPlaylists = [];

    function doneParsing(playlist) {
      masterPlaylist.mediaPlaylists.push(playlist);
      // once we have gotten all of the data, setup downloading
      if(masterPlaylist.mediaPlaylists.length === oldLength) {
        setupDownload()
      }
    }

    function setupDownload() {
      var pl = masterPlaylist.mediaPlaylists,
        rootUri,
        newFunction,
        newerFunction,
        i;

      // set update intervals
      for (i = 0; i < pl.length; i++) {
        rootUri = path.dirname(pl[i].uri);
        newFunction = pl[i].update.bind(pl[i]);
        setInterval(newFunction, pl[i].targetDuration * 1000, rootUri);
      }

      // set download invertals
      for (i = 0; i < pl.length; i++) {
        rootUri = path.dirname(pl[i].uri);
        newerFunction = pl[i].download.bind(pl[i]);
        newerFunction(rootUri, cwd);
        setInterval(newerFunction,pl[i].targetDuration * 500, rootUri, cwd);
      }
    }
  });
}
module.exports = getIt;
