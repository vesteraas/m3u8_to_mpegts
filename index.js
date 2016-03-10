// Node modules
var path = require('path');
var fetch = require('fetch');
var parse = require('./parse.js');
var fs = require('fs');
var readline = require('readline');
var keypress = require('keypress');


function getIt(options, done) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var uri = options.uri,
    cwd = options.cwd,
    playlistFilename = path.basename(uri.split('?')[0]);

  fetch.fetchUrl(uri, function getPlaylist(err, meta, body) {
    var mediaPlaylist,
      oldLength,
      masterPlaylist,
      mediaPlaylists,
      masterManifestLines,
      i;

    if (err) {
      console.error('Error fetching url:', uri);
      return done(err);
    }

    // Check for no master playlist
    if (body.toString().match(/#EXTINF/)) {
      mediaPlaylist = {
        targetDuration:0,
        uri:options.uri,
        mostRecentSegmentUri:undefined,
        bandwidth:1000,
        segments:[]
      };
      oldLength = 1;
      parse.parseMediaPlaylist(mediaPlaylist, doneParsing, path.dirname(options.uri), cwd);
    } else {
      masterPlaylist = parse.parseMasterPlaylist(uri, body.toString());
      mediaPlaylists = masterPlaylist.medPlaylists;
      oldLength = mediaPlaylists.length;
      masterManifestLines = masterPlaylist.manLines;
      playlistFilename = playlistFilename.split('?')[0];

      //save master playlist
      fs.writeFileSync(path.resolve(cwd, playlistFilename), masterPlaylist.manLines.join('\n'));
      // parse the mediaplaylists for segments and targetDuration
      for (i = 0; i < mediaPlaylists.length; i++) {
        parse.parseMediaPlaylist(masterPlaylist.medPlaylists[i], doneParsing, path.dirname(masterPlaylist.uri), cwd);
      }
      masterPlaylist.mediaPlaylists = [];
    }

    function doneParsing(playlist) {

      function redrawScreen() {
        process.stdout.write('\033[2J');
        process.stdout.write('\rSelect Rendition(s):\n\n');
        for (var i = 0; i < lines.length; i++) {
          if (currentLine == i) {
            rl.write('-->   ');
          } else {
            rl.write('      ');
          }
          if (selected[i] == 1) {
            rl.write('*');
          } else {
            rl.write(' ');
          }
          rl.write(lines[i] + '\n')
        }
      }

      if (mediaPlaylist) {
        setupDownload('media');
      } else {
        masterPlaylist.mediaPlaylists.push(playlist);
        // once we have gotten all of the data, setup downloading
        if(masterPlaylist.mediaPlaylists.length === oldLength) {
          var playlists = [];
          for (var i = 0; i < masterPlaylist.mediaPlaylists.length; i++) {
            playlists.push('Bandwidth: ' + masterPlaylist.mediaPlaylists[i].bandwidth);
          }

          var lines = ['All'];
          var currentLine = 0; //starts at all
          var selected = [0];
          for (var i = 0; i < playlists.length; i++) {
            selected.push(0);
          }

          for (var i = 0; i < playlists.length; i++) {
            lines.push(playlists[i]);
          }
          lines.push('Download Selected');

          process.stdout.write('\033[2J');
          process.stdout.write('\rSelect Rendition(s):\n\n');
          for (var i = 0; i < lines.length; i++) {
            if (i == 0) {
              rl.write('-->    ' + lines[i] + '\n');
            } else {
              rl.write('       ' + lines[i] + '\n');
            }
          }

          process.stdin.on('keypress', function (ch, key) {
            if (key && key.name == 'return') {
              if (currentLine == 0) {
                process.stdout.write('\033[2J');
                setupDownload();
              } else if (selected[currentLine] == 0) {
                selected[currentLine] = 1;
              } else if (selected[currentLine] == 1) {
                selected[currentLine] = 0;
              } else if (currentLine == playlists.length + 1) {
                //remove playlists
                selected.shift();
                var tempPlaylist = [];
                for (var i = 0; i < selected.length; i++) {
                  if (selected[i] == 1) {
                    tempPlaylist.push(masterPlaylist.mediaPlaylists[i]);
                  }
                }
                masterPlaylist.mediaPlaylists = tempPlaylist;
                setupDownload();
                return;

              }
            }
            if (key && key.name == 'up') {
              if (currentLine !== 0) {
                currentLine--;
              }
            } else if (key && key.name == 'down') {
              if (currentLine !== playlists.length + 1) {
                currentLine++;
              }
            }
            redrawScreen();
          });
        }
      }
    }
    var playlistsFinished = 0;
    function finishedDownloadingSegment(playlist) {
      playlist.download(path.dirname(playlist.uri), cwd, playlist.bandwidth, function() {
        playlistsFinished++;
        console.log('playlists finished: ', playlistsFinished);
        if (mediaPlaylist) {
          console.log('shutting down');
          process.exit();
        } else if (playlistsFinished == masterPlaylist.mediaPlaylists.length) {
          console.log('shutting down');
          process.exit();
        }
        }, finishedDownloadingSegment);


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
        downloadFunction(rootUri, cwd, pl[i].bandwidth, function() {console.log('shutting down');process.exit();}, finishedDownloadingSegment);
        if (!pl[i].endList) {
          //Only set update if we haven't found an endlist
          updateInterval = setInterval(updateFunction, pl[i].targetDuration * 1000, rootUri);
        }
        //downloadInterval = setInterval(downloadFunction,pl[i].targetDuration * 1000, rootUri, cwd, pl[i].bandwidth, function() {console.log('shutting down');process.exit();});
      }
    }


  });
}



// function getItTwo(options, done) {
//   var uri = options.uri,
//     cwd = options.cwd,
//     playlistFilename = path.basename(uri.split('?')[0]);

//   //start of the program, fetch master playlist
//   fetch.fetchUrl(uri, function getPlaylist(err, meta, body) {
//     var mediaPlaylist,
//       oldLength,
//       masterPlaylist,
//       mediaPlaylists,
//       masterManifestLines,
//       i;

//     if (err) {
//       console.error('Error fetching url:', uri);
//       return done(err);
//     }
//     // Check for no master playlist
//     if (body.toString().match(/#EXTINF/)) {
//       mediaPlaylist = {
//         targetDuration:0,
//         uri:options.uri,
//         mostRecentSegmentUri:undefined,
//         bandwidth:1000,
//         segments:[]
//       };
//       oldLength = 1;
//       parse.parseMediaPlaylist(mediaPlaylist, doneParsing, path.dirname(options.uri), cwd);
//     } else {
//       masterPlaylist = parse.parseMasterPlaylist(uri, body.toString());
//       mediaPlaylists = masterPlaylist.medPlaylists;
//       oldLength = mediaPlaylists.length;
//       masterManifestLines = masterPlaylist.manLines;
//       playlistFilename = playlistFilename.split('?')[0];

//       //save master playlist
//       fs.writeFileSync(path.resolve(cwd, playlistFilename), masterPlaylist.manLines.join('\n'));
//       // parse the mediaplaylists for segments and targetDuration
//       for (i = 0; i < mediaPlaylists.length; i++) {
//         parse.parseMediaPlaylist(masterPlaylist.medPlaylists[i], doneParsing, path.dirname(masterPlaylist.uri), cwd);
//       }
//       masterPlaylist.mediaPlaylists = [];
//     }

//     function doneParsing(playlist) {
//       if (mediaPlaylist) {
//         setupDownload('media');
//       } else {
//         masterPlaylist.mediaPlaylists.push(playlist);
//         // once we have gotten all of the data, setup downloading
//         if(masterPlaylist.mediaPlaylists.length === oldLength) {
//           setupDownload();
//         }
//       }
//     }

//     function finishedDownloadingSegment(playlist) {
//       playlist.download(path.dirname(playlist.uri), cwd, playlist.bandwidth, function() {console.log('shutting down');process.exit();}, finishedDownloadingSegment);
//     }



//     function setupDownload(type) {
//       var pl,
//         rootUri,
//         newFunction,
//         newerFunction,
//         updateInterval,
//         downloadInterval,
//         i;



//       if (type === 'media') {
//         pl = [mediaPlaylist];
//       } else {
//         pl = masterPlaylist.mediaPlaylists;
//       }

//       // set update and download intervals
//       for (i = 0; i < pl.length; i++) {
//         if (pl[i].targetDuration === 0) {
//           continue;
//         }
//         rootUri = path.dirname(pl[i].uri);
//         updateFunction = pl[i].update.bind(pl[i]);
//         downloadFunction = pl[i].download.bind(pl[i]);
//         downloadFunction(rootUri, cwd, pl[i].bandwidth, function() {console.log('shutting down');process.exit();}, finishedDownloadingSegment);
//         if (!pl[i].endList) {
//           //Only set update if we haven't found an endlist
//           updateInterval = setInterval(updateFunction, pl[i].targetDuration * 1000, rootUri);
//         }
//         //downloadInterval = setInterval(downloadFunction,pl[i].targetDuration * 1000, rootUri, cwd, pl[i].bandwidth, function() {console.log('shutting down');process.exit();});
//       }
//     }


//   });
// }
module.exports = getIt;
