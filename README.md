# LIVE-HLS-FETCHER (JS ONLY)

A simple CLI tool to fetch an entire hls manifest and it's segments and save it all locally.

## Installation

``` 
Download this repo, and run the example using node.
```

### Usage

**Example**
    
    var HlsFetcher = require('live-hls-fetcher');

	HlsFetcher({
		    uri: "http://api.new.livestream.com/accounts/15210385/events/4353996/videos/113444715.m3u8",
		    cwd: "destinationDirectory",
		    preferLowQuality: true,
	    }, 
	   function(){
    	   console.log("Download of chunk files complete");
	   }
	);
