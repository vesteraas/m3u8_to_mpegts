# LIVE-HLS-FETCHER (JS ONLY)

A simple CLI tool to fetch an entire hls manifest and it's segments and save it all locally.

## Installation

``` 
npm install m3u8_to_mpegts
```

### Usage
Then on your main file you run this

**Example**
    
    var tsFetcher = require('m3u8_to_mpegts');

	tsFetcher({
		    uri: "http://api.new.livestream.com/accounts/15210385/events/4353996/videos/113444715.m3u8",
		    cwd: "destinationDirectory",
		    preferLowQuality: true,
	    }, 
	   function(){
    	   console.log("Download of chunk files complete");
	   }
	);



Special thanks to:

 [Tenacex](https://github.com/tenacex) for making it live

and 

[imbcmdth](https://github.com/imbcmdth) for creating hls-fetcher.

