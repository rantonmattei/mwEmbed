/**
* embedPlayer is the base class for html5 video tag javascript abstraction library
* embedPlayer include a few subclasses:
*
* mediaPlayer Media player embed system ie: java, vlc or native.
* mediaElement Represents source media elements
* mw.PlayerControlBuilder Handles skinning of the player controls
*/

/**
 * Add the messages text:
 */

mw.includeAllModuleMessages();

( function( mw, $ ) {
	
	/** 
	 * Merge in the default video attributes supported by embedPlayer:
	 */
	mw.mergeConfig('EmbedPlayer.Attributes', {
		/*
		 * Base html element attributes:
		 */
	
		// id: Auto-populated if unset
		"id" : null,
	
		// Width: alternate to "style" to set player width
		"width" : null,
	
		// Height: alternative to "style" to set player height
		"height" : null,
	
		/*
		 * Base html5 video element attributes / states also see:
		 * http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html
		 */
	
		// Media src URI, can be relative or absolute URI
		"src" : null,
	
		// Poster attribute for displaying a place holder image before loading
		// or playing the video
		"poster" : null,
	
		// Autoplay if the media should start playing
		"autoplay" : false,
	
		// Loop attribute if the media should repeat on complete
		"loop" : false,
	
		// If the player controls should be displayed
		"controls" : true,
	
		// Video starts "paused"
		"paused" : true,
	
		// ReadyState an attribute informs clients of video loading state:
		// see: http://www.whatwg.org/specs/web-apps/current-work/#readystate
		"readyState" : 0,
	
		// Loading state of the video element
		"networkState" : 0,
	
		// Current playback position
		"currentTime" : 0,
	
		// Previous player set time
		// Lets javascript use $('#videoId').get(0).currentTime = newTime;
		"previousTime" : 0,
	
		// Previous player set volume
		// Lets javascript use $('#videoId').get(0).volume = newVolume;
		"previousVolume" : 1,
	
		// Initial player volume:
		"volume" : 0.75,
	
		// Caches the volume before a mute toggle
		"preMuteVolume" : 0.75,
	
		// Media duration: Value is populated via
		// custom data-durationhint attribute or via the media file once its played
		"duration" : null,
	
		// Mute state
		"muted" : false,
	
		/**
		 * Custom attributes for embedPlayer player: (not part of the html5
		 * video spec)
		 */
	
		// Default video aspect ratio
		'videoAspect' : '4:3',
	
		// Start time of the clip
		"start" : 0,
	
		// End time of the clip
		"end" : null,
	
		// If the player controls should be overlaid
		// ( Global default via config EmbedPlayer.OverlayControls in module
		// loader.js)
		"overlaycontrols" : true,
	
		// Attribute to use 'native' controls
		"usenativecontrols" : false,
	
		// If the player should include an attribution button:
		'attributionbutton' : true,
		
		// A player error state ( lets you propagate an error instead of a play button ) 
		// ( while keeping the full player api available )
		'data-playerError': null,
	
		// If serving an ogg_chop segment use this to offset the presentation time
		// ( for some plugins that use ogg page time rather than presentation time )
		"startOffset" : 0,
	
		// If the download link should be shown
		"download_link" : true,
	
		// Content type of the media
		"type" : null
	} );
	
	
	
	/*
	 * embeds all players that match the rewrite player tags config Passes off
	 * request to the embedPlayer selector:
	 * 
	 * @param {Object} attributes Attributes to apply to embed players @param
	 * {Function} callback Function to call once embedding is done
	 */
	$.embedPlayers = function( attributes, callback) {
		$( mw.getConfig( 'EmbedPlayer.RewriteSelector' ) ).embedPlayer( attributes, callback );
	};
	
	/**
	 * Selector based embedPlayer jQuery binding
	 * 
	 * Rewrites all tags via a given selector
	 * 
	 * @param {object=}
	 *            attributes Optional embedPlayer attributes for the given video
	 *            interface. Attributes Object can include any key value pair
	 *            that would otherwise be an attribute in the html element.
	 * 
	 * also see: mw.getConfig( 'EmbedPlayer.Attributes' )
	 * 
	 * @param {Function=}
	 *            callback Optional Function to be called once video interfaces
	 *            are ready
	 * 
	 */
	$.fn.embedPlayer = function( attributes, callback ) {
		mw.log( 'EmbedPlayer:: fn.embedPlayer' );
		if( this.selector ){
			var playerSelect = this.selector;
		} else {
			var playerSelect = this;
		}
	
		// Define attributes if unset
		if( !attributes ) {
			attributes = {};
		}
	
		// Handle optional include of attributes argument:
		if( typeof attributes == 'function' ){
			callback = attributes;
			attributes = {};
		}
	
		$( playerSelect ).each( function( index, playerElement) {
			// make sure the playerElement has an id:
			if( !$( playerElement ).attr('id') ){
				$( playerElement ).attr( "id", 'mwe_v' + ( index ) );
			}
	
			// If we are dynamically embedding on a "div" check if we can
			// add a poster image behind the loader:
			if( playerElement.nodeName.toLowerCase() == 'div'
				&& ( attributes.poster || $(playerElement).attr( 'poster' ) ) ){
				var posterSrc = ( attributes.poster ) ? attributes.poster : $(playerElement).attr( 'poster' );
	
				// Set image size:
				var width = $( playerElement ).width();
				var height = $( playerElement ).height();
				if( !width ){
					var width = ( attributes.width )? attributes.width : '100%';
				}
				if( !height ){
					var height = ( attributes.height )? attributes.height : '100%';
				}
	
				mw.log('EmbedPlayer:: set loading background: ' + posterSrc);
				$( playerElement ).append(
					$( '<img />' )
					.attr( 'src', posterSrc)
					.css({
						'position' : 'absolute',
						'width' : width,
						'height' : height
					})
				);
			}
		});
	
		// Create the Global Embed Player Manager ( if not already created )
		if( ! mw.playerManager ) {
			mw.log( "EmbedPlayer::Create the player manager:" );
			mw.playerManager = new EmbedPlayerManager();
			// Run the global hooks that mw.playerManager is ready
			mw.log( 'EmbedPlayer::trigger: EmbedPlayerManagerReady');
			$( mw ).trigger( 'EmbedPlayerManagerReady' );
		}
		// Make sure we have user preference setup ( for setting preferences on
		// video selection )
		mw.setupUserConfig( function() {
	
			var addedToPlayerManager = false;
			mw.log("EmbedPlayer:: do: " + $( playerSelect ).length + ' players ');
	
			// Add each selected element to the player manager:
			$( playerSelect ).each( function( index, playerElement) {
				// Make sure the video tag was not generated by our library:
				if( $( playerElement ).hasClass( 'nativeEmbedPlayerPid' ) ){
					$('#loadingSpinner_' + $( playerElement ).attr('id') ).hide();
					mw.log( 'EmbedPlayer::$.embedPlayer skip embedPlayer gennerated video: ' + playerElement );
				} else {
					addedToPlayerManager = true;
					// Add the player
					mw.playerManager.addPlayerElement( playerElement, attributes );
				}
			} );
			if( addedToPlayerManager ){
				if( callback ){
					mw.playerManager.addCallback( callback );
				}
			} else {
				// Run the callback directly if no players were added to the
				if( callback ){
					callback();
				}
			}
	
		});
	};


/**
 * EmbedPlayerManager
 * 
 * Manages calls to embed video interfaces
 */
var EmbedPlayerManager = function( ) {
	// Create a Player Manage
	return this.init( );
};
EmbedPlayerManager.prototype = {

	// Functions to run after the video interface is ready
	callbackFunctions : [],

	playerElementQueue: [],

	/**
	 * Constructor initializes callbackFunctions and playerList
	 */
	init: function( ) {
		this.callbackFunctions = [];
		this.playerList = [];
	},

	/**
	 * Get the list of players
	 */
	getPlayerList: function( ) {
		return this.playerList;
	},

	/**
	 * Adds a player element for the embedPlayer to rewrite
	 * 
	 * uses embedPlayer interface on audio / video elements uses mvPlayList
	 * interface on playlist elements
	 * 
	 * Once a player interface is established the following chain of functions
	 * are called;
	 * 
	 * _this.checkPlayerSources() 
	 * _this.setupSourcePlayer()
	 * _this.inheritEmbedPlayer() 
	 * _this.selectedPlayer.load() 
	 * _this.showPlayer()
	 * 
	 * @param {Element}
	 *            playerElement DOM element to be swapped
	 * @param {Object}
	 *            [Optional] attributes Extra attributes to apply to the player
	 *            interface
	 */
	addPlayerElement: function( playerElement, attributes ) {
		var _this = this;
		if ( !playerElement.id || playerElement.id == '' ) {
			// give the playerElement an id:
			playerElement.id = 'vid' + ( this.playerList.length + 1 );
		}
		mw.log('EmbedPlayerManager: addElement:: ' + playerElement.id );

		// Add the element id to playerList
		this.playerList.push( playerElement.id );

		// Check for player attributes such as skins or plugins attributes
		// that add to the request set
		var playerDependencyRequest = [];

		// Merge in any custom attributes
		$.extend( playerElement, attributes );

		// Update the list of dependent libraries for the player
		// ( allows modules to add to the player dependency list )
		mw.embedPlayerUpdateLibraryRequest( playerElement, playerDependencyRequest );

		// Load any skins we need then swap in the interface
		mw.load( playerDependencyRequest, function() {
			// debugger;
			var waitForMeta = true;

			// Be sure to "stop" the target ( Firefox 3x keeps playing
			// the video even though its been removed from the DOM )
			try{
				if( playerElement.pause && typeof playerElement.pause == 'function' ){
					playerElement.pause();
				}
			} catch( e ){
				// element will be removed from dom anyway ( don't worry about
				// pause )
			}

			// Allow modules to override the wait for metadata flag:
			$( mw ).trigger( 'checkPlayerWaitForMetaData', playerElement );

			// Update the waitForMeta object if set to boolean false:
			waitForMeta = ( playerElement.waitForMeta === false )? false : true;


			// Confirm we want to wait for meta data ( if not already set to
			// false by module )
			if( waitForMeta ){
				waitForMeta = _this.waitForMetaCheck( playerElement );
			}

			var ranPlayerSwapFlag = false;

			// Local callback to runPlayer swap once playerElement has metadata
			function runPlayerSwap() {
				// Don't run player swap twice
				if( ranPlayerSwapFlag ){
					return ;
				}
				ranPlayerSwapFlag = true;
				mw.log("EmbedPlayer::runPlayerSwap::" + $( playerElement ).attr('id') );

				var playerInterface = new mw.EmbedPlayer( playerElement , attributes);
				var swapPlayer = _this.swapEmbedPlayerElement( playerElement, playerInterface );

				// Trigger the newEmbedPlayerEvent for embedPlayer interface
				mw.log("EmbedPlayer::addPlayerElement :trigger newEmbedPlayerEvent:" + playerInterface.id );
				$( mw ).trigger ( 'newEmbedPlayerEvent', $( '#' + playerInterface.id ).get(0) );


				//
				// Allow modules to block player build out
				//
				// this is needed in cases where you need to do an asynchronous
				// player interface setup. like iframes asynchronous announcing its ready for
				// bindings that can affect player setup.
				mw.log("EmbedPlayer::addPlayerElement :trigger startPlayerBuildOut:" + playerInterface.id );
				$( '#' + playerInterface.id ).triggerQueueCallback( 'startPlayerBuildOut', function(){
					// Issue the checkPlayerSources call to the new player
					// interface: make sure to use the element that is in the
					// DOM:
					$( '#' + playerInterface.id ).get(0).checkPlayerSources();
				});
			}

			if( waitForMeta && mw.getConfig('EmbedPlayer.WaitForMeta' ) ) {
				mw.log('EmbedPlayer::WaitForMeta ( video missing height (' +
						$( playerElement ).attr('height') + '), width (' +
						$( playerElement ).attr('width') + ') or duration: ' +
						$( playerElement ).attr('duration')
				);
				$( playerElement ).bind("loadedmetadata", runPlayerSwap );

				// Time-out of 5 seconds ( maybe still playable but no timely
				// metadata )
				setTimeout( runPlayerSwap, 5000 );
				return ;
			} else {
				runPlayerSwap();
				return ;
			}
		});
	},

	/**
	 * Check for bogus resolutions of the media asset that has not loaded.
	 * 
	 * @return true if the resolution is "likely" to be updated by waiting for
	 *         metadata false if the resolution has been set via an attribute or
	 *         is already loaded
	 */
	waitForMetaCheck: function( playerElement ){
		var waitForMeta = false;

		// Don't wait for metadata for non html5 media elements
		if( !playerElement ){
			return false;
		}
		if( !playerElement.tagName || ( playerElement.tagName.toLowerCase() != 'audio'  && playerElement.tagName.toLowerCase() != 'video' ) ){
			return false;
		}
		// If we don't have a native player don't wait for metadata
		if( !mw.EmbedTypes.getMediaPlayers().isSupportedPlayer( 'oggNative') &&
			!mw.EmbedTypes.getMediaPlayers().isSupportedPlayer( 'mp3Native') &&
			!mw.EmbedTypes.getMediaPlayers().isSupportedPlayer( 'webmNative') &&
			!mw.EmbedTypes.getMediaPlayers().isSupportedPlayer( 'h264Native' ) )
		{
			return false;
		}


		var width = $( playerElement ).css( 'width' );
		var height = $( playerElement ).css( 'height' );

		// Css video defaults ( firefox )
		if( $( playerElement ).css( 'width' ) == '300px' &&
				$( playerElement ).css( 'height' ) == '150px'
		){
			waitForMeta = true;
		} else {
			// Check if we should wait for duration:
			if( $( playerElement ).attr( 'duration') ||
				$( playerElement ).attr('durationHint')
			){
				// height, width and duration set; do not wait for meta data:
				return false;
			} else {
				waitForMeta = true;
			}
		}

		// Firefox ~ sometimes ~ gives -1 for unloaded media
		if ( $(playerElement).attr( 'width' ) == -1 || $(playerElement).attr( 'height' ) == -1 ) {
			waitForMeta = true;
		}

		// Google Chrome / safari gives 0 width height for unloaded media
		if( $(playerElement).attr( 'width' ) === 0 ||
			$(playerElement).attr( 'height' ) === 0
		) {
			waitForMeta = true;
		}

		// Firefox default width height is ~sometimes~ 150 / 300
		if( this.height == 150 && this.width == 300 ){
			waitForMeta = true;
		}

		// Make sure we have a src attribute or source child
		// ( i.e not a video tag to be dynamically populated or looked up from
		// xml resource description )
		if( waitForMeta &&
			(
				$( playerElement ).attr('src') ||
				$( playerElement ).find("source[src]").length !== 0
			)
		) {
			// Detect src type ( if no type set )
			return true;
		} else {
			// playerElement is not likely to update its meta data ( no src )
			return false;
		}
	},

	/**
	 * swapEmbedPlayerElement
	 * 
	 * Takes a video element as input and swaps it out with an embed player
	 * interface
	 * 
	 * @param {Element}
	 *            targetElement Element to be swapped
	 * @param {Object}
	 *            playerInterface Interface to swap into the target element
	 */
	swapEmbedPlayerElement: function( targetElement, playerInterface ) {
		mw.log( 'EmbedPlayer::swapEmbedPlayerElement: ' + targetElement.id );
		// Create a new element to swap the player interface into
		var swapPlayerElement = document.createElement('div');

		// Get properties / methods from playerInterface:
		for ( var method in playerInterface ) {
			if ( method != 'readyState' ) { // readyState crashes IE ( don't include )
				swapPlayerElement[ method ] = playerInterface[ method ];
			}
		}

		// Copy over any data attributes applied to the targetElement to the swapTarget
		$( swapPlayerElement ).data( $( targetElement ).data() );
		
		
		// Check if we are using native controls or Persistent player ( should keep the video embed around )
		if( playerInterface.useNativePlayerControls() || playerInterface.isPersistentNativePlayer() ) {
			$( targetElement )
			.attr( 'id', playerInterface.pid )
			.addClass( 'nativeEmbedPlayerPid' )
			.show()
			.after(
				$( swapPlayerElement ).css( 'display', 'none' )
			);
		} else {
			$( targetElement ).replaceWith( swapPlayerElement );
		}

		// Set swapPlayerElement has height / width set and set to loading:
		$( swapPlayerElement ).css( {
			'width' : playerInterface.width + 'px',
			'height' : playerInterface.height + 'px',
			'overflow': 'hidden',
			'top' : '0px'
		} );
		

		// If we don't already have a loadSpiner add one:
		if( $('#loadingSpinner_' + playerInterface.id ).length == 0 ){
			if( playerInterface.useNativePlayerControls() || playerInterface.isPersistentNativePlayer() ) {
				var $spinner = $( targetElement )
					.getAbsoluteOverlaySpinner();
			}else{
				var $spinner = $( swapPlayerElement ).getAbsoluteOverlaySpinner();
			}
			$spinner.attr('id', 'loadingSpinner_' + playerInterface.id );
		}
		return swapPlayerElement;
	},
	
	addCallback:function( callback ){
		this.callbackFunctions.push( callback );
	},

	/**
	 * Player ready will run the global callbacks once players are "ready"
	 * 
	 * This enables mw.ready event to expose video tag elements as if the
	 * videotag was supported natively.
	 * 
	 * @param {Object}
	 *            player The EmbedPlayer object
	 */
	playerReady: function( player ) {
		var _this = this;
		mw.log( 'EmbedPlayer::ReadyToPlay callback player:' + player.id );
		player.readyToPlay = true;		

		// Remove the player loader spinner:
		player.hidePlayerSpinner();

		// Run the player ready trigger
		$( player ).trigger( 'playerReady' );

		var is_ready = true;
		for ( var i = 0; i < this.playerList.length; i++ ) {
			var currentPlayer = $( '#' + this.playerList[i] ).get( 0 );
			if ( player ) {
				// Check if the current video is ready ( or has an error out )
				is_ready = ( player.readyToPlay || player.loadError ) ? is_ready : false;
			}
		}
		if ( is_ready ) {
			// Be sure to remove any player loader spinners
			$('.loadingSpinner,.playerLoadingSpinner').remove();

			mw.log( "EmbedPlayer::All on-page players ready run playerManager callbacks:" +  this.callbackFunctions.length );			
			while( this.callbackFunctions.length ){
				 this.callbackFunctions.shift()();
			}
		}
	}
};

/**
 * Base embedPlayer object
 * 
 * @param {Element}
 *            element, the element used for initialization.
 * @param {Object}
 *            customAttributes Attributes for the video interface that are not
 *            already element attributes
 * @constructor
 */
mw.EmbedPlayer = function( element, customAttributes ) {
	return this.init( element, customAttributes );
};

mw.EmbedPlayer.prototype = {

	// The mediaElement object containing all mediaSource objects
	'mediaElement' : null,

	// Object that describes the supported feature set of the underling plugin /
	// Support list is described in PlayerControlBuilder components
	'supports': { },

	// Preview mode flag,
	// some plugins don't seek accurately but in preview mode we need
	// accurate seeks so we do tricks like hide the image until its ready
	'previewMode' : false,

	// Ready to play
	// NOTE: we should switch over to setting the html5 video ready state
	'readyToPlay' : false,

	// Stores the loading errors
	'loadError' : false,

	// Thumbnail updating flag ( to avoid rewriting an thumbnail thats already
	// being updated)
	'thumbnail_updating' : false,

	// Poster display flag
	'posterDisplayed' : true,

	// Local variable to hold CMML meeta data about the current clip
	// for more on CMML see: http://wiki.xiph.org/CMML
	'cmmlData': null,

	// Stores the seek time request, Updated by the doSeek function
	'serverSeekTime' : 0,

	// If the embedPlayer is current 'seeking'
	'seeking' : false,

	// Percent of the clip buffered:
	'bufferedPercent' : 0,

	// Holds the timer interval function
	'monitorTimerId' : null,

	// Buffer flags
	'bufferStartFlag' : false,
	'bufferEndFlag' : false,

	// For supporting media fragments stores the play end time
	'pauseTime' : null,

	// On done playing
	'donePlayingCount' : 0
	,
	// if player events should be Propagated
	'_propagateEvents': true,

	// If the onDone interface should be displayed
	'onDoneInterfaceFlag': true,


	/**
	 * embedPlayer
	 * 
	 * @constructor
	 * 
	 * @param {Element}
	 *            element DOM element that we are building the player interface
	 *            for.
	 * @param {Object}
	 *            customAttributes Attributes supplied via argument (rather than
	 *            applied to the element)
	 */
	init: function( element, customAttributes ) {
		var _this = this;
		mw.log('EmbedPlayer: initEmbedPlayer: width:' + $(element).width() );
		// Set customAttributes if unset:
		if ( !customAttributes ) {
			customAttributes = { };
		}
		var playerAttributes = mw.getConfig( 'EmbedPlayer.Attributes' );

		// Setup the player Interface from supported attributes:
		for ( var attr in playerAttributes ) {
			if ( customAttributes[ attr ] || customAttributes[ attr ] === false ) {
				this[ attr ] = customAttributes[ attr ];
			} else if ( element.getAttribute( attr ) != null ) {
				// boolean attributes
				if( element.getAttribute( attr ) == '' ){
					this[ attr ] = true;
				} else {
					this[ attr ] = element.getAttribute( attr );
				}
			} else {
				this[attr] = playerAttributes[attr];
			}
			// string -> boolean
			if( this[ attr ] == "false" ) this[attr] = false;
			if( this[ attr ] == "true" ) this[attr] = true;
		}
		// Set the plugin id
		this.pid = 'pid_' + this.id;

		// move to mediaWiki support
		if( this.apiTitleKey ){
			this.apiTitleKey = decodeURI( this.apiTitleKey );
		}

		// Set the poster:
		if ( $( element ).attr( 'thumbnail' ) ) {
			_this.poster = $( element ).attr( 'thumbnail' );
		}
		if ( $( element ).attr( 'poster' ) ) {
			_this.poster = $( element ).attr( 'poster' );
		}

		// Set the skin name from the class
		var	sn = $(element).attr( 'class' );

		if ( sn && sn != '' ) {
			for ( var n = 0; n < mw.validSkins.length; n++ ) {
				if ( sn.indexOf( mw.validSkins[n].toLowerCase() ) !== -1 ) {
					this.skinName = mw.validSkins[ n ];
				}
			}
		}

		// Set the default skin if unset:
		if ( !this.skinName ) {
			this.skinName = mw.getConfig( 'EmbedPlayer.SkinName' );
		}

		if( !this.monitorRate ){
			this.monitorRate = mw.getConfig( 'EmbedPlayer.MonitorRate' );
		}

		// Make sure startOffset is cast as an float:
		if ( this.startOffset && this.startOffset.split( ':' ).length >= 2 ) {
			this.startOffset = parseFloat( mw.npt2seconds( this.startOffset ) );
		}

		// Make sure offset is in float:
		this.startOffset = parseFloat( this.startOffset );

		// Set the source duration ( if provided in the element metaData or
		// durationHint )
		if ( $( element ).attr( 'duration' ) ) {
			_this.duration = $( element ).attr( 'duration' );
		}

		if ( !_this.duration && $( element ).attr( 'durationHint' ) ) {
			_this.durationHint = $( element ).attr( 'durationHint' );
			// Convert duration hint if needed:
			_this.duration = mw.npt2seconds( _this.durationHint );
		}

		// Make sure duration is a float:
		this.duration = parseFloat( this.duration );
		mw.log( 'EmbedPlayer::mediaElement:' + this.id + " duration is: " + this.duration );

		// Set the player size attributes based loaded video element:
		this.loadPlayerSize( element );

		// Grab any innerHTML and set it to missing_plugin_html
		// NOTE: we should strip "source" tags instead of checking and skipping
		if ( element.innerHTML != '' && element.getElementsByTagName( 'source' ).length == 0 ) {
			// mw.log( 'innerHTML: ' + element.innerHTML );
			this.user_missing_plugin_html = element.innerHTML;
		}

		// Add the mediaElement object with the elements sources:
		this.mediaElement = new mw.MediaElement( element );

		// Process attribute "sources" for dynamic embedding
		if( customAttributes.sources && customAttributes.sources.length ){
			for( var i =0; i < customAttributes.sources.length ; i ++ ){
				var customSource = customAttributes.sources[i];
				if( customSource.src ){
					var $source = $('<source />')
						.attr( 'src', customSource.src );
					// xxx todo pull list of valid source attributes from
					// mediaSource prototype
					if( customSource.type ){
						$source.attr('type', customSource.type );
					}
					if( customSource.title ){
						$source.attr('title', customSource.title );
					}
					this.mediaElement.tryAddSource( $source.get(0) );
				}
			}
		}
	},

	stopEventPropagation: function(){
		this._propagateEvents = false;
	},
	restoreEventPropagation: function(){
		this._propagateEvents = true;
		this.startMonitor();
	},

	enableSeekBar: function(){
		if( this.useNativePlayerControls() )
			return ;
		this.controlBuilder.enableSeekBar();
		$( this ).trigger( 'onEnableSeekBar');
	},
	disableSeekBar: function(){
		if( this.useNativePlayerControls() ){
			return ;
		}
		this.controlBuilder.disableSeekBar();
		$( this ).trigger( 'onDisableSeekBar');
	},

	/**
	 * For plugin-players to update supported features
	 */
	updateFeatureSupport: function(){
		$( this ).trigger('updateFeatureSupportEvent', this.supports );
		return ;
	},
	
	applyIntrinsicAspect: function(){
		// check if a image thumbnail is present:
		if( this.$interface.find('.playerPoster').length ){
			var img = this.$interface.find('.playerPoster').get(0);
			var pHeight = $( this ).height();
			// Check for intrinsic width and maintain aspect ratio
			if( img.naturalWidth && img.naturalHeight ){
				var pWidth = parseInt(  img.naturalWidth / img.naturalHeight * pHeight);
				if( pWidth > $( this ).width() ){
					pWidth = $( this ).width();
					pHeight =  parseInt( img.naturalHeight / img.naturalWidth * pWidth );
				}
				$( img ).css({
					'height' : pHeight + 'px',
					'width':  pWidth + 'px',
					'left': ( ( $( this ).width() - pWidth ) * .5 ) + 'px',
					'top': ( ( $( this ).height() - pHeight ) * .5 ) + 'px',
					'position' : 'absolute'
				});
			}
		}
	},
	/**
	 * Set the width & height from css style attribute, element attribute, or by
	 * default value if no css or attribute is provided set a callback to
	 * resize.
	 * 
	 * Updates this.width & this.height
	 * 
	 * @param {Element}
	 *            element Source element to grab size from
	 */
	loadPlayerSize: function( element ) {
		this.height = $(element).css( 'height' );
		this.width = $(element).css( 'width' );
		mw.log('EmbedPlayer::loadPlayerSize: css size:' + this.width + ' h: '  + this.height);


		// Set to parent size ( resize events will cause player size updates)
		if( this.height.indexOf('100%') != -1 || this.width.indexOf('100%') != -1 ){
			$relativeParent = $(element).parents().filter(function() {
				// Reduce to only relative position or "body" elements
				return $(this).is('body') || $(this).css('position') == 'relative';
			}).slice(0,1); // grab only the "first"
			this.width = $relativeParent.width();
			this.height = $relativeParent.height();
		}
		// Make sure height and width are a number
		this.height = parseInt( this.height );
		this.width = parseInt( this.width );

		// Set via attribute if CSS is zero or NaN and we have an attribute
		// value:
		this.height = ( this.height==0 || isNaN( this.height )
				&& $(element).attr( 'height' ) ) ?
						parseInt( $(element).attr( 'height' ) ): this.height;
		this.width = ( this.width == 0 || isNaN( this.width )
				&& $(element).attr( 'width' ) )?
						parseInt( $(element).attr( 'width' ) ): this.width;


		// Special case for audio
		// Firefox sets audio height to "0px" while webkit uses 32px .. force
		if( element.tagName.toLowerCase() == 'audio' && this.height == '32' ) {
			this.height = 0;
		}

		// Use default aspect ration to get height or width ( if rewriting a
		// non-audio player )
		if( element.tagName.toLowerCase() != 'audio' && this.videoAspect ) {
			var aspect = this.videoAspect.split( ':' );
			if( this.height && !this.width ) {
				this.width = parseInt( this.height * ( aspect[0] / aspect[1] ) );
			}
			if( this.width && !this.height ) {
				var apectRatio = ( aspect[1] / aspect[0] );
				this.height = parseInt( this.width * ( aspect[1] / aspect[0] ) );
			}
		}

		// On load sometimes attr is temporally -1 as we don't have video
		// metadata yet. or in IE we get NaN for width / height
		//
		// NOTE: browsers that do support height width should set "waitForMeta"
		// flag in addElement
		if( ( isNaN( this.height )|| isNaN( this.width ) ) ||
			( this.height == -1 || this.width == -1 ) ||
				// Check for firefox defaults
				// Note: ideally firefox would not do random guesses at css
				// values
				( (this.height == 150 || this.height == 64 ) && this.width == 300 )
			) {
			var defaultSize = mw.getConfig( 'EmbedPlayer.DefaultSize' ).split( 'x' );
			if( isNaN( this.width ) ){
				this.width = defaultSize[0];
			}

			// Special height default for audio tag ( if not set )
			if( element.tagName.toLowerCase() == 'audio' ) {
				this.height = 0;
			}else{
				this.height = defaultSize[1];
			}
		}
	},
	/**
	 * Resize the player to a new size preserving aspect ratio Wraps the
	 * controlBuilder.resizePlayer function
	 */
	resizePlayer: function( size , animate, callback){
		mw.log("EmbedPlayer::resizePlayer:" + size.width + ' x ' + size.height );
		var _this = this;
		// Check if we are native display then resize the playerElement directly
		if( this.useNativePlayerControls() ){
			if( animate ){
				$( this.getPlayerElement() ).animate( size , callback);
			} else {
				$( this.getPlayerElement() ).css( size );
				callback();
			}
		} else {
			this.controlBuilder.resizePlayer( size, animate, callback);
		}
		$( this ).trigger( 'onResizePlayer', [size, animate] );
	},

	/**
	 * Get the player pixel width not including controls
	 * 
	 * @return {Number} pixel height of the video
	 */
	getPlayerWidth: function() {
		return $( this ).width();
	},

	/**
	 * Get the player pixel height not including controls
	 * 
	 * @return {Number} pixel height of the video
	 */
	getPlayerHeight: function() {
		return $( this ).height();
	},

	/**
	 * Check player for sources. If we need to get media sources form an
	 * external file that request is issued here
	 */
	checkPlayerSources: function() {
		mw.log( 'EmbedPlayer::checkPlayerSources: ' + this.id );
		var _this = this;

		// Scope the end of check for player sources so it can be called in a
		var finishCheckPlayerSources = function(){
			// Run embedPlayer sources hook
			$( _this ).triggerQueueCallback( 'checkPlayerSourcesEvent', function(){
				_this.setupSourcePlayer();
			});
		};

		// NOTE: Should could be moved to mediaWiki Api support module
		// only load from api if sources are empty:
		if ( _this.apiTitleKey && this.mediaElement.sources.length == 0) {
			// Load media from external data
			mw.log( 'EmbedPlayer::checkPlayerSources: loading apiTitleKey:' + _this.apiTitleKey );
			_this.loadSourceFromApi( function(){
				finishCheckPlayerSources();
			} );
			return ;
		} else {
			finishCheckPlayerSources();
		}
	},
	/**
	 * Check if the embedPlayer has text tracks
	 * 
	 * @return
	 */
	hasTextTracks: function(){
		if( !this.mediaElement ){
			return false;
		}
		return ( this.mediaElement.getTextTracks().length > 0 );
	},
	/**
	 * Get text tracks from the mediaElement
	 */
	getTextTracks: function(){
		if( !this.mediaElement ){
			return [];
		}
		return this.mediaElement.getTextTracks();
	},
	/**
	 * Empty the player sources
	 */
	emptySources: function(){
		if( this.mediaElement ){
			this.mediaElement.sources = [];
			this.mediaElement.selectedSource = null;
		}
		this.selectedPlayer =null;

	},

	/**
	 * Insert and play a video source ( useful for ads or bumper videos )	 
	 */
	switchPlaySrc: function( src ){
		// do nothing ( must be implemented by player )
	},

	/**
	 * Load Source video info from mediaWiki Api title key ( this.apiTitleKey )
	 * 
	 * @@todo move this to mediaWiki 'api' module
	 * @param {Function}
	 *            callback Function called once loading is complete
	 */
	loadSourceFromApi: function( callback ){
		var _this = this;
		if( !_this.apiTitleKey ){
			mw.log( 'Error no apiTitleKey');
			return false;
		}

		// Set local apiProvider via config if not defined
		if( !_this.apiProvider ) {
			_this.apiProvider = mw.getConfig( 'EmbedPlayer.ApiProvider' );
		}

		// Setup the request
		var request = {
			'prop': 'imageinfo',
			// In case the user added File: or Image: to the apiKey:
			'titles': 'File:' + unescape( this.apiTitleKey ).replace( /^(File:|Image:)/ , '' ),
			'iiprop': 'url|size|dimensions|metadata',
			'iiurlwidth': _this.width,
			'redirects' : true // automatically resolve redirects
		};

		// Run the request:
		mw.getJSON( mw.getApiProviderURL( _this.apiProvider ), request, function( data ){
			if ( data.query.pages ) {
				for ( var i in data.query.pages ) {
					if( i == '-1' ) {
						callback( false );
						return ;
					}
					var page = data.query.pages[i];
				}
			}	else {
				callback( false );
				return ;
			}
			// Make sure we have imageinfo:
			if( ! page.imageinfo || !page.imageinfo[0] ){
				callback( false );
				return ;
			}
			var imageinfo = page.imageinfo[0];

			// Set the poster
			_this.poster = imageinfo.thumburl;

			// Add the media src
			_this.mediaElement.tryAddSource(
				$('<source />')
				.attr( 'src', imageinfo.url )
				.get( 0 )
			);

			// Set the duration
			if( imageinfo.metadata[2]['name'] == 'length' ) {
				_this.duration = imageinfo.metadata[2]['value'];
			}

			// Set the width height
			// Make sure we have an accurate aspect ratio
			if( imageinfo.height != 0 && imageinfo.width != 0 ) {
				_this.height = parseInt( _this.width * ( imageinfo.height / imageinfo.width ) );
			}

			// Update the css for the player interface
			$( _this ).css( 'height', _this.height);

			callback();
		});
	},

	/**
	 * Set up the select source player
	 * 
	 * issues autoSelectSource call
	 * 
	 * Sets load error if no source is playable
	 */
	setupSourcePlayer: function( callback ) {
		mw.log("EmbedPlayer::setupSourcePlayer: " + this.id + ' sources: ' + this.mediaElement.sources.length );
		var prevPlayer = this.selectedPlayer;
		// Autoseletct the media source
		this.mediaElement.autoSelectSource();
		
		// Auto select player based on default order
		if ( !this.mediaElement.selectedSource ) {
			mw.log( 'setupSourcePlayer:: no sources, type:' + this.type );
		} else {
			this.selectedPlayer = mw.EmbedTypes.getMediaPlayers().defaultPlayer( this.mediaElement.selectedSource.mimeType );
		}
		if( !this.selectedPlayer ){
			this.showPluginMissingHTML();
			if( callback ){
				callback();
			}
			return ;
		}
		if ( prevPlayer != this.selectedPlayer ) {
			// Inherit the playback system of the selected player:
			this.inheritEmbedPlayer( callback );
		} else {
			// Show the interface: 
			this.$interface.find( '.control-bar,.play-btn-large').show();
		}
		
	},

	/**
	 * Load and inherit methods from the selected player interface
	 * 
	 * @param {Function}
	 *            callback Function to be called once playback-system has been
	 *            inherited
	 */
	inheritEmbedPlayer: function( callback ) {
		mw.log( "EmbedPlayer::inheritEmbedPlayer:duration is: " + this.getDuration() + ' p: ' + this.id );

		// Clear out any non-base embedObj methods:
		if ( this.instanceOf ) {
			eval( 'var tmpObj = mw.EmbedPlayer' + this.instanceOf );
			for ( var i in tmpObj ) { // for in loop oky for object
				if ( this[ 'parent_' + i ] ) {
					this[i] = this[ 'parent_' + i];
				} else {
					this[i] = null;
				}
			}
		}

		// Set up the new embedObj
		mw.log( 'EmbedPlayer::inheritEmbedPlayer: embedding with ' + this.selectedPlayer.library );
		var _this = this;

		// Load the selected player
		this.selectedPlayer.load( function() {
			mw.log( 'EmbedPlayer::inheritEmbedPlayer ' + _this.selectedPlayer.library + " player loaded for " + _this.id );

			// Get embed library player Interface
			var playerInterface = mw[ 'EmbedPlayer' + _this.selectedPlayer.library ];

			for ( var method in playerInterface ) {
				if ( _this[method] && !_this['parent_' + method] ) {
					_this['parent_' + method] = _this[method];
				}
				_this[ method ] = playerInterface[method];
			}

			// Update feature support
			_this.updateFeatureSupport();

			_this.getDuration();

			// Run player display with timeout to avoid function stacking
			setTimeout(function(){
				_this.showPlayer();
				// Run the callback if provided
				if ( typeof callback == 'function' ){
					callback();
				}
			}, 0);

		} );
	},

	/**
	 * Select a player playback system
	 * 
	 * @param {Object}
	 *            player Player playback system to be selected player playback
	 *            system include vlc, native, java etc.
	 */
	selectPlayer: function( player ) {
		var _this = this;
		if ( this.selectedPlayer.id != player.id ) {
			this.selectedPlayer = player;
			this.inheritEmbedPlayer( function(){
				// Hide / remove track container
				_this.$interface.find( '.track' ).remove();
				// We have to re-bind hoverIntent ( has to happen in this scope )
				if( !this.useNativePlayerControls() && _this.controls && _this.controlBuilder.isOverlayControls() ){
					_this.controlBuilder.showControlBar();
					_this.$interface.hoverIntent({
						'sensitivity': 4,
						'timeout' : 2000,
						'over' : function(){
							_this.controlBuilder.showControlBar();
						},
						'out' : function(){
							_this.controlBuilder.hideControlBar();
						}
					});
				}
			});
		}
	},

	/**
	 * Get a time range from the media start and end time
	 * 
	 * @return start_npt and end_npt time if present
	 */
	getTimeRange: function() {
		var end_time = (this.controlBuilder.longTimeDisp)? '/' + mw.seconds2npt( this.getDuration() ) : '';
		var default_time_range = '0:00' + end_time;
		if ( !this.mediaElement )
			return default_time_range;
		if ( !this.mediaElement.selectedSource )
			return default_time_range;
		if ( !this.mediaElement.selectedSource.end_npt )
			return default_time_range;
		return this.mediaElement.selectedSource.start_npt + this.mediaElement.selectedSource.end_npt;
	},

	/**
	 * Get the duration of the embed player
	 */
	getDuration: function() {
		if ( isNaN(this.duration)  &&  this.mediaElement && this.mediaElement.selectedSource &&
		     typeof this.mediaElement.selectedSource.durationHint != 'undefined' ){
			this.duration = this.mediaElement.selectedSource.durationHint;
		}
		return this.duration;
	},

	/**
	 * Get the player height
	 */
	getHeight: function() {
		return this.height;
	},

	/**
	 * Get the player width
	 */
	getWidth: function(){
		return this.width;
	},

	/**
	 * Check if the selected source is an audio element:
	 */
	isAudio: function(){
		return ( this.mediaElement.selectedSource.mimeType.indexOf('audio/') !== -1 );
	},

	/**
	 * Get the plugin embed html ( should be implemented by embed player
	 * interface )
	 */
	doEmbedHTML: function() {
		return 'Error: function doEmbedHTML should be implemented by embed player interface ';
	},

	/**
	 * Seek function ( should be implemented by embedPlayer interface
	 * playerNative, playerKplayer etc. ) embedPlayer doSeek only handles URL
	 * time seeks
	 */
	doSeek: function( percent ) {
		var _this = this;
		this.seeking = true;
		
		// Do some bounds checking:
		if( percent < 0 )
			percent = 0;
		
		if( percent > 1 )
			percent = 1;
		// set the playhead to the target position
		this.updatePlayHead( percent );

		// See if we should do a server side seek ( player independent )
		if ( this.supportsURLTimeEncoding() ) {
			mw.log( 'EmbedPlayer::doSeek:: updated serverSeekTime: ' + mw.seconds2npt ( this.serverSeekTime ) +
					' currentTime: ' + _this.currentTime );
			// make sure we need to seek:
			if( _this.currentTime == _this.serverSeekTime ){
				return ;
			}

			this.stop();
			this.didSeekJump = true;
			// Make sure this.serverSeekTime is up-to-date:
			this.serverSeekTime = mw.npt2seconds( this.start_npt ) + parseFloat( percent * this.getDuration() );
			// Update the slider
		}

		// Do play request in 100ms ( give the dom time to swap out the embed
		// player )
		setTimeout( function() {
			_this.seeking = false;
			_this.play();
		}, 100 );

		// Run the onSeeking interface update
		// NOTE controlBuilder should really bind to html5 events rather
		// than explicitly calling it or inheriting stuff.
		this.controlBuilder.onSeek();
	},

	/**
	 * Seeks to the requested time and issues a callback when ready (should be
	 * overwritten by client that supports frame serving)
	 */
	setCurrentTime: function( time, callback ) {
		mw.log( 'Error: base embed setCurrentTime can not frame serve (override via plugin)' );
	},

	/**
	 * On clip done action. Called once a clip is done playing
	 */
	onClipDone: function() {
		var _this = this;
		mw.log( 'EmbedPlayer::onClipDone: propagate:' +  _this._propagateEvents + ' id:' + this.id + ' doneCount:' + this.donePlayingCount + ' stop state:' +this.isStopped() );
		// don't run onclipdone if _propagateEvents is off
		if( !_this._propagateEvents ){
			return ;
		}
		// Only run stopped once:
		if( !this.isStopped() ){
			
			// Show the control bar:
			this.controlBuilder.showControlBar();

			// Update the clip done playing count:
			this.donePlayingCount ++;

			// TOOD we should improve the end event flow
			this.stopEventPropagation();
			$( this ).trigger( 'ended' );
			this.restoreEventPropagation();
			
			mw.log("EmbedPlayer::onClipDone:Trigged ended, reset playhead? " + this.onDoneInterfaceFlag);
			
			// if the ended event did not trigger more timeline actions run the
			// actual stop:
			if( this.onDoneInterfaceFlag ){
				mw.log("EmbedPlayer::onDoneInterfaceFlag=true do interface done");
				this.stop();
				// restore event propagation
				
				// Check if we have the "loop" property set
				if( this.loop ) {
					this.play();
					return;
				}

				// Stop the clip (load the thumbnail etc)
				this.serverSeekTime = 0;
				this.updatePlayHead( 0 );

				// Make sure we are not in preview mode( no end clip actions in
				// preview mode)
				if ( this.previewMode ) {
					return ;
				}

				// Do the controlBuilder onClip done interface
				this.controlBuilder.onClipDone();

				// An event for once the all ended events are done.
				$( this ).trigger( 'onEndedDone' );
			}
		}
	},


	/**
	 * Shows the video Thumbnail, updates pause state
	 */
	showThumbnail: function() {
		var _this = this;
		mw.log( 'EmbedPlayer::showThumbnail' + this.posterDisplayed );

		// Close Menu Overlay:
		this.controlBuilder.closeMenuOverlay();

		// update the thumbnail html:
		this.updatePosterHTML();

		this.paused = true;
		this.posterDisplayed = true;
		// Make sure the controlBuilder bindings are up-to-date
		this.controlBuilder.addControlBindings();

		// Once the thumbnail is shown run the mediaReady trigger (if not using
		// native controls)
		if( !this.useNativePlayerControls() ){
			mw.log("mediaLoaded");
			$( this ).trigger( 'mediaLoaded' );
		}
	},
	/**
	 * Show the player
	 */
	showPlayer: function () {
		mw.log( 'EmbedPlayer:: Show player: ' + this.id + ' interace: w:' + this.width + ' h:' + this.height );
		var _this = this;
		// Remove the player loader spinner if it exists
		this.hidePlayerSpinner();
		// Set-up the local controlBuilder instance:
		this.controlBuilder = new mw.PlayerControlBuilder( this );
		var _this = this;

		// Set up local jQuery object reference to "mwplayer_interface"
		this.getPlayerInterface();
		// if a isPersistentNativePlayer ( overlay the controls )
		if( !this.useNativePlayerControls() && this.isPersistentNativePlayer() ){
			this.$interface.css({
				'position' : 'absolute',
				'top' : '0px',
				'left' : '0px',
				'background': null
			});

			if( this.isPersistentNativePlayer() && !_this.controlBuilder.isOverlayControls() ){
				// if Persistent native player always give it the player height
				$('#' + this.pid ).css('height', this.height - _this.controlBuilder.height );
			}
			$( this ).show();
		}
		if(  !this.useNativePlayerControls() && !this.isPersistentNativePlayer() && !_this.controlBuilder.isOverlayControls() ){
			// Update the video size per available control space.
			$(this).css('height', this.height - _this.controlBuilder.height );
		}

		// Update Thumbnail for the "player"
		this.updatePosterHTML();

		// Add controls if enabled:
		if ( this.useNativePlayerControls() ) {
			// Need to think about this some more...
			// Interface is hidden if controls are "off"
			this.$interface.hide();
		} else {
			if( this.controls ){
				this.controlBuilder.addControls();
			}
		}

		// Update temporal url if present
		this.updateTemporalUrl();
		
		// Check for intrinsic width and maintain aspect ratio
		setTimeout(function(){
			_this.applyIntrinsicAspect();
		}, 10);

		mw.playerManager.playerReady( this );
		
		// Right before player autoplay ... check if there are any errors that prevent playback or player:
		if( this['data-playerError'] ){
			this.showErrorMsg( this['data-playerError'] );
			return ;
		}
		// auto play does not work on iPad > 3 
		if ( this.autoplay && ( !mw.isIpad() || mw.isIpad3() ) ) {
			mw.log( 'EmbedPlayer::showPlayer::Do autoPlay' );			
			_this.play();
		}
	},
	getPlayerInterface: function(){
		if( !this.$interface ){
			var posObj = {
					'width' : this.width + 'px',
					'height' : this.height + 'px'
			};
			if( !mw.getConfig( 'EmbedPlayer.IsIframeServer' ) ){
				posObj['position'] = 'relative';
			}
			// Make sure we have mwplayer_interface
			$( this ).wrap(
				$('<div>')
				.addClass( 'mwplayer_interface ' + this.controlBuilder.playerClass )
				.css( posObj )
			)
			// position the "player" absolute inside the relative interface
			// parent:
			.css('position', 'absolute');
		}
		this.$interface = $( this ).parent( '.mwplayer_interface' );
		return this.$interface;
	},
	/**
	 * Media framgments handler based on:
	 * http://www.w3.org/2008/WebVideo/Fragments/WD-media-fragments-spec/#fragment-dimensions
	 * 
	 * We support seconds and npt ( normal play time )
	 * 
	 * Updates the player per fragment url info if present
	 * 
	 */
	updateTemporalUrl: function(){
		var sourceHash = /[^\#]+$/.exec( this.getSrc() ).toString();
		if( sourceHash.indexOf('t=') === 0 ){
			// parse the times
			var times = sourceHash.substr(2).split(',');
			if( times[0] ){
				// update the current time
				this.currentTime = mw.npt2seconds( times[0].toString() );
			}
			if( times[1] ){
				this.pauseTime = mw.npt2seconds( times[1].toString() );
				// ignore invalid ranges:
				if( this.pauseTime < this.currentTime ){
					this.pauseTime = null;
				}
			}
			// Update the play head
			this.updatePlayHead( this.currentTime / this.duration );

			// Update status:
			this.controlBuilder.setStatus( mw.seconds2npt( this.currentTime ) );
		}
	},

	/**
	 * Show an error msg
	 * 
	 * @param {string}
	 *            errorMsg
	 */
	showErrorMsg: function( errorMsg ){
		if( this.$interface ){
			$target = this.$interface;
		} else{
			$target = $(this);
		}
		$target.append(
			$('<div />').addClass('error').text(
				errorMsg
			)
		)
		// Hide the interface components
		.find( '.control-bar,.play-btn-large').hide();		
		return ;
	},
	
	/**
	 * Get missing plugin html (check for user included code)
	 * 
	 * @param {String}
	 *            [misssingType] missing type mime
	 */
	showPluginMissingHTML: function( ) {
		mw.log("EmbedPlayer::showPluginMissingHTML");
		// Hide loader
		this.hidePlayerSpinner();
		// Set the top level container to relative position:
		$(this).css('position', 'relative');
		
		// Control builder ( for play button )
		this.controlBuilder = new mw.PlayerControlBuilder( this );					
		
		// Make sure interface is available
		this.getPlayerInterface();
		
		// Update the poster and html:
		this.updatePosterHTML();

		// on iOS devices don't try to add warnings
		if( !this.mediaElement.sources.length || mw.isIOS() ){
			var noSourceMsg = gM('mwe-embedplayer-missing-source');
			$( this ).trigger( 'NoSourcesCustomError', function( customErrorMsg ){
				if( customErrorMsg){
					noSourceMsg = customErrorMsg;
				}
        	});
			
			// Add the no sources error:
			this.$interface.append( 
				$('<div />')
				.css({
					'position' : 'absolute',
					'top' : ( this.height /2 ) - 10, 
					'left': this.left/2
				})
				.addClass('error')
				.html( noSourceMsg )
			);
			$( this ).find('.play-btn-large').remove();
		} else {
			// Add the warning
			this.controlBuilder.doWarningBindinng( 'EmbedPlayer.DirectFileLinkWarning',
				gM( 'mwe-embedplayer-download-warn', mw.getConfig('EmbedPlayer.FirefoxLink') )
			);
			// Make sure we have a play btn:
			if( $( this ).find('.play-btn-large').length == 0) {
				this.$interface.append(
						this.controlBuilder.getComponent( 'playButtonLarge' )
				);
			}
			
			// Set the play button to the first available source:
			this.$interface.find('.play-btn-large')
			.unbind('click')
			.wrap(
				$('<a />').attr( {
					'href': this.mediaElement.sources[0].getSrc(),
					'title' : gM('mwe-embedplayer-play_clip')
				} )
			);
		}
		// TODO we should have a smart done Loading system that registers player
		// states
		// http://www.whatwg.org/specs/web-apps/current-work/#media-element
		this.doneLoading = true;
		//mw.playerManager.playerReady( this );
	},

	/**
	 * Update the video time request via a time request string
	 * 
	 * @param {String}
	 *            time_req
	 */
	updateVideoTimeReq: function( time_req ) {
		mw.log( 'EmbedPlayer::updateVideoTimeReq:' + time_req );
		var time_parts = time_req.split( '/' );
		this.updateVideoTime( time_parts[0], time_parts[1] );
	},

	/**
	 * Update Video time from provided start_npt and end_npt values
	 * 
	 * @param {String}
	 *            start_npt the new start time in npt format
	 * @pamra {String} end_npt the new end time in npt format
	 */
	updateVideoTime: function( start_npt, end_npt ) {
		// update media
		this.mediaElement.updateSourceTimes( start_npt, end_npt );

		// update mv_time
		this.controlBuilder.setStatus( start_npt + '/' + end_npt );

		// reset slider
		this.updatePlayHead( 0 );

		// reset seek_offset:
		if ( this.mediaElement.selectedSource && this.mediaElement.selectedSource.URLTimeEncoding ) {
			this.serverSeekTime = 0;
		} else {
			this.serverSeekTime = mw.npt2seconds( start_npt );
		}
	},


	/**
	 * Update Thumb time with npt formated time
	 * 
	 * @param {String}
	 *            time NPT formated time to update thumbnail
	 */
	updateThumbTimeNPT: function( time ) {
		this.updateThumbTime( mw.npt2seconds( time ) - parseInt( this.startOffset ) );
	},

	/**
	 * Update the thumb with a new time
	 * 
	 * @param {Float}
	 *            floatSeconds Time to update the thumb to
	 */
	updateThumbTime:function( floatSeconds ) {
		// mw.log('updateThumbTime:'+floatSeconds);
		var _this = this;
		if ( typeof this.org_thum_src == 'undefined' ) {
			this.org_thum_src = this.poster;
		}
		if ( this.org_thum_src.indexOf( 't=' ) !== -1 ) {
			this.last_thumb_url = mw.replaceUrlParams( this.org_thum_src,
				{
					't' : mw.seconds2npt( floatSeconds + parseInt( this.startOffset ) )
				}
			);
			if ( !this.thumbnail_updating ) {
				this.updatePoster( this.last_thumb_url , false );
				this.last_thumb_url = null;
			}
		}
	},

	/**
	 * Updates the displayed thumbnail via percent of the stream
	 * 
	 * @param {Float}
	 *            percent Percent of duration to update thumb
	 */
	updateThumbPerc:function( percent ) {
		return this.updateThumbTime( ( this.getDuration() * percent ) );
	},
	// update the video poster:
	updatePosterSrc: function( posterSrc ){
		this.poster = posterSrc;
		this.updatePosterHTML();
		this.applyIntrinsicAspect();
	},
	/**
	 * Called after sources are updated, and your ready for the player to change media
	 * @return
	 */
	changeMedia: function( callback ){
		var _this = this;
		// onChangeMedia): triggered at the start of the change media commands
		$( this ).trigger( 'onChangeMedia' );
		// setup flag for change media
		var chnagePlayingMedia = this.isPlaying();
		
		// Reset first play to true, to count that play event
		this.firstPlay = true;
		
		// Add a loader to the embed player: 
		this.pauseLoading();
		
		// Clear out any player error:
		this['data-playerError'] = null;
		// Clear out the player error div:
		this.$interface.find('.error').remove();
		// restore the control bar:
		this.$interface.find('.control-bar').show();
		
		if( this.$interface ){
			this.$interface.find('.play-btn-large').hide(); // hide the play btn
		}
		
		//If we are change playing media add a ready binding: 
		var bindName = 'playerReady.changeMedia';
		$( this ).unbind( bindName ).bind( bindName, function(){
			// Always show the control bar on switch:
			if( _this.controlBuilder ){
				_this.controlBuilder.showControlBar();
			}
			
			if( chnagePlayingMedia ){
				// Make sure the play button is not displayed:
				if( _this.$interface ){
					_this.$interface.find( '.play-btn-large' ).hide();
				}
				if( _this.isPersistentNativePlayer() ){
					// If switching a Persistent native player update the source:
					// ( stop and play won't refresh the source  )
					_this.switchPlaySrc( _this.getSrc(), function(){
						$( _this ).trigger( 'onChangeMediaDone' );
						if( callback ) callback()
					});
					// we are handling trigger and callback asynchronously return here. 
					return ;
				} else {
					//stop should unload the native player
					_this.stop();
					// reload the player
					_this.play();
				}
			} 
			$( _this ).trigger( 'onChangeMediaDone' );
			if( callback ) callback();
		});

		// Load new sources per the entry id via the checkPlayerSourcesEvent hook:
		$( this ).triggerQueueCallback( 'checkPlayerSourcesEvent', function(){
			_this.hidePlayerSpinner();
			if( _this.$interface && !chnagePlayingMedia ){
				_this.$interface.find( '.play-btn-large' ).show(); // show the play btn
			}
			// Start player events leading to playerReady
			_this.setupSourcePlayer();
		});
	},
	
	/**
	 * Returns the HTML code for the video when it is in thumbnail mode.
	 * playing, configuring the player, inline cmml display, HTML 
	 * download, and embed code.
	 */
	updatePosterHTML: function () {
		mw.log( 'EmbedPlayer:updatePosterHTML::' + this.id );
		var _this = this;
		var thumb_html = '';
		var class_atr = '';
		var style_atr = '';
		
		if( this.useNativePlayerControls() && this.mediaElement.selectedSource ){
			this.showNativePlayer();
			return ;
		}

		// Set by default thumb value if not found
		var posterSrc = ( this.poster ) ? this.poster :
						mw.getConfig( 'imagesPath' ) + 'vid_default_thumb.jpg';

		// Update PersistentNativePlayer poster:
		if( this.isPersistentNativePlayer() ){
			var $vid = $( '#' + this.pid );
			$vid.attr( 'poster', posterSrc );
			// Add a quick timeout hide / show ( firefox 4x bug with native poster updates )
			if( $.browser.mozilla ){
				$vid.hide();
				setTimeout(function(){
					$vid.show();
				},1);
			}
		} else {
			// Poster support is not very consistent in browsers use a jpg poster image:
			$( this ).html(
				$( '<img />' )
				.css({
					'position' : 'relative',
					'width' : '100%',
					'height' : '100%'
				})
				.attr({
					'id' : 'img_thumb_' + this.id,
					'src' : posterSrc
				})
				.addClass( 'playerPoster' )
			);
		}
		if ( !this.useNativePlayerControls()  && this.controlBuilder
			&& this.height > this.controlBuilder.getComponentHeight( 'playButtonLarge' )
			&& $( this ).find('.play-btn-large').length == 0
		) {
			
			$( this ).append(
				this.controlBuilder.getComponent( 'playButtonLarge' )
			);
		}
	},
	
	/**
	 * Checks if native controls should be used
	 * 
	 * @param [player]
	 *            Object Optional player object to check controls attribute
	 * @returns boolean true if the mwEmbed player interface should be used
	 *          false if the mwEmbed player interface should not be used
	 */
	useNativePlayerControls: function() {

		if( this.usenativecontrols === true ){
			return true;
		}
		
		if( mw.getConfig('EmbedPlayer.NativeControls') === true ) {
			return true;
		}

		// Do some device detection devices that don't support overlays
		// and go into full screen once play is clicked:
		if( mw.isAndroid2() || mw.isIpod()  || mw.isIphone() ){
			return true;
		}
		// iPad can use html controls if its a persistantPlayer in the dom
		// before loading )
		// else it needs to use native controls:
		if( mw.isIpad() ){
			if( this.isPersistentNativePlayer() && mw.getConfig('EmbedPlayer.EnableIpadHTMLControls') === true){
				return false;
			} else {
				// Set warning that your trying to do iPad controls without
				// persistent native player:
				return true;
			}
		}
		return false;
	},

	isPersistentNativePlayer: function(){
		// Since we check this early on sometimes the pid has not yet been
		// updated:
		if( $('#' + this.pid ).length == 0 ){
			return $('#' + this.id ).hasClass('persistentNativePlayer');
		}
		return $('#' + this.pid ).hasClass('persistentNativePlayer');
	},


	/**
	 * Show the native player embed code
	 * 
	 * This is for cases where the main library needs to "get out of the way"
	 * since the device only supports a limited subset of the html5 and won't
	 * work with an html javascirpt interface
	 */
	showNativePlayer: function(){
		var _this = this;
		// Empty the player of any child nodes
		$(this).empty();

		// Remove the player loader spinner if it exists
		this.hidePlayerSpinner();

		// Get the selected source:
		var source = this.mediaElement.selectedSource;
		// Setup videoAttribues
		var videoAttribues = {
			'poster': _this.poster,
			'src' : source.getSrc()
		};
		if( this.controls ){
			videoAttribues.controls = 'true';
		}
		if( this.loop ){
			videoAttribues.loop = 'true';
		}
		var cssStyle = {
			'width' : _this.width,
			'height' : _this.height
		};

		$( '#' + this.pid ).replaceWith(
			_this.getNativePlayerHtml( videoAttribues, cssStyle )
		);

		// Bind native events:
		this.applyMediaElementBindings();

		// Android only can play with a special play button, android 2x has no native controls
		if( mw.isAndroid2() ){
			this.addPlayBtnLarge();
		}
		return ;
	},
	addPlayBtnLarge:function(){
		var _this = this;
		var $pid = $( '#' + _this.pid );
		$pid.siblings('.play-btn-large').remove();
		$playButton = this.controlBuilder.getComponent('playButtonLarge');
		$pid.after(
			$playButton
			.css({
				'left' : parseInt( $pid.position().left ) + parseInt( $playButton.css('left') ),
				'top' : parseInt( $pid.position().top ) +  parseInt( $playButton.css('top') )
			})
		);
	},
	/**
	 * Should be set via native embed support
	 */
	getNativePlayerHtml: function(){
		return $('<div />' )
			.css( 'width', this.getWidth() )
			.html( 'Error: Trying to get native html5 player without native support for codec' );
	},
	/**
	 * Should be set via native embed support
	 */
	applyMediaElementBindings: function(){
		return ;
	},

	/**
	 * Gets code to embed the player remotely for "share" this player links
	 */
	getEmbeddingHTML: function() {
		switch( mw.getConfig( 'EmbedPlayer.ShareEmbedMode' ) ){
			case 'iframe':
				return this.getShareIframeObject();
			break;
			case 'videojs':
				return this.getShareEmbedVideoJs();
			break;
		}
	},

	/**
	 * Get the share embed object code
	 * 
	 * NOTE this could probably share a bit more code with getShareEmbedVideoJs
	 */
	getShareIframeObject: function(){

		var iframeUrl = false;
        if (typeof(mw.IA) != 'undefined'){
        	return mw.IA.embedCode();
        } else {
        	$( this ).trigger( 'GetShareIframeSrc', function( localIframeSrc ){
				if( iframeUrl){
					mw.log("Error multiple modules binding GetShareIframeSrc" );
				}
				iframeUrl = localIframeSrc;
        	});
        }
		if( !iframeUrl ){
			iframeUrl = this.getIframeSourceUrl();
		}

		// Set up embedFrame src path
		var embedCode = '&lt;iframe src=&quot;' + mw.escapeQuotesHTML( iframeUrl ) + '&quot; ';

		// Set width / height of embed object
		embedCode += 'width=&quot;' + this.getPlayerWidth() +'&quot; ';
		embedCode += 'height=&quot;' + this.getPlayerHeight() + '&quot; ';
		embedCode += 'frameborder=&quot;0&quot; ';

		// Close up the embedCode tag:
		embedCode+='&gt;&lt/iframe&gt;';

		// Return the embed code
		return embedCode;
	},
	getIframeSourceUrl: function(){
		var iframeUrl = '';

		// old style embed:
		var iframeUrl = mw.getMwEmbedPath() + 'mwEmbedFrame.php?';
		var params = {'src[]':[]};

		// TODO move to mediaWiki Support module
		if( this.apiTitleKey ) {
			params.apiTitleKey = this.apiTitleKey;
			if ( this.apiProvider ) {
				// Commons always uses the commons api provider ( special hack
				// should refactor )
				if( mw.parseUri( document.URL ).host == 'commons.wikimedia.org'){
					 this.apiProvider = 'commons';
				}
				params.apiProvider = this.apiProvider;
			}
		} else {
			// Output all the video sources:
			for( var i=0; i < this.mediaElement.sources.length; i++ ){
				var source = this.mediaElement.sources[i];
				if( source.src ) {
                                      params['src[]'].push(mw.absoluteUrl( source.src ));
				}
			}
			// Output the poster attr
			if( this.poster ){
				params.poster = this.poster;
			}
		}

		// Set the skin if set to something other than default
		if( this.skinName ){
			params.skin = this.skinName;
		}

		if( this.duration ) {
			params.durationHint = parseFloat( this.duration );
		}
		iframeUrl += $.param( params );
		return iframeUrl;
	},
	/**
	 * Get the share embed Video tag code
	 */
	getShareEmbedVideoJs: function(){

		// Set the embed tag type:
		var embedtag = ( this.isAudio() )? 'audio': 'video';

		// Set up the mwEmbed js include:
		var embedCode = '&lt;script type=&quot;text/javascript&quot; ' +
					'src=&quot;' +
					mw.escapeQuotesHTML(
						mw.absoluteUrl(
							mw.getMwEmbedSrc()
						)
					) + '&quot;&gt;&lt;/script&gt' +
					'&lt;' + embedtag + ' ';

		if( this.poster ) {
			embedCode += 'poster=&quot;' +
				mw.escapeQuotesHTML( mw.absoluteUrl( this.poster ) ) +
				'&quot; ';
		}

		// Set the skin if set to something other than default
		if( this.skinName ){
			embedCode += 'class=&quot;' +
				mw.escapeQuotesHTML( this.skinName ) +
				'&quot; ';
		}

		if( this.duration ) {
			embedCode +='durationHint=&quot;' + parseFloat( this.duration ) + '&quot; ';
		}

		if( this.width || this.height ){
			embedCode += 'style=&quot;';
			embedCode += ( this.width )? 'width:' + this.width +'px;': '';
			embedCode += ( this.height )? 'height:' + this.height +'px;': '';
			embedCode += '&quot; ';
		}

		// TODO move to mediaWiki Support module
		if( this.apiTitleKey ) {
			embedCode += 'apiTitleKey=&quot;' + mw.escapeQuotesHTML( this.apiTitleKey ) + '&quot; ';
			if ( this.apiProvider ) {
				embedCode += 'apiProvider=&quot;' + mw.escapeQuotesHTML( this.apiProvider ) + '&quot; ';
			}
			// close the video tag
			embedCode += '&gt;&lt;/video&gt;';

		} else {
			// Close the video attr
			embedCode += '&gt;';

			// Output all the video sources:
			for( var i=0; i < this.mediaElement.sources.length; i++ ){
				var source = this.mediaElement.sources[i];
				if( source.src ) {
					embedCode +='&lt;source src=&quot;' +
						mw.absoluteUrl( source.src ) +
						'&quot; &gt;&lt;/source&gt;';
				}
			}
			// Close the video tag
			embedCode += '&lt;/video&gt;';
		}

		return embedCode;
	},

	/**
	 * Base Embed Controls
	 */

	/**
	 * The Play Action
	 * 
	 * Handles play requests, updates relevant states: seeking =false paused =
	 * false Updates pause button Starts the "monitor"
	 */
	firstPlay : true,
	replayEventCount : 0,
	play: function() {
		var _this = this;
		
		mw.log( "EmbedPlayer:: play: " + this._propagateEvents + ' poster: ' +  this.posterDisplayed + ' native: ' +  this.useNativePlayerControls());
	
		// Hide any overlay:
		if( this.controlBuilder ){
			this.controlBuilder.closeMenuOverlay();
		}
		// Hide any buttons or errors  if present:
		if( this.$interface ){
			this.$interface.find( '.play-btn-large,.error' ).remove();
		}
		
		// Check if thumbnail is being displayed and embed html
		if ( this.posterDisplayed &&  !this.useNativePlayerControls() ) {
			if ( !this.selectedPlayer ) {
				this.showPluginMissingHTML();
				return;
			} else {
				this.posterDisplayed = false;
				this.doEmbedHTML();
			}
		}

		if( this.paused === true ){
			this.paused = false;
			// Check if we should Trigger the play event
			mw.log("EmbedPlayer:: trigger play event::" + !this.paused + ' events:' + this._propagateEvents );
			if(  this._propagateEvents  ) {
				$( this ).trigger( 'onplay' );
			}
			// We need first play event for analytics purpose
			if( this.firstPlay ) {
				this.firstPlay = false;
				$( this ).trigger( 'firstPlay' );
			}
		}
		
		// If we previously finished playing this clip run the "replay hook"
		if( this.donePlayingCount > 0 && !this.paused && this._propagateEvents ) {			
			this.replayEventCount++;
			if( this.replayEventCount <= this.donePlayingCount){
				$( this ).trigger( 'replayEvent' );
			}
		}

		this.$interface.find('.play-btn span')
		.removeClass( 'ui-icon-play' )
		.addClass( 'ui-icon-pause' );
		
		this.hidePlayerSpinner();

		this.$interface.find( '.play-btn' )
		.unbind('click')
		.buttonHover()
		.click( function( ) {
		 	_this.pause();
		 } )
		.attr( 'title', gM( 'mwe-embedplayer-pause_clip' ) );

		// if we have start time defined, start playing from that point
		if( this.currentTime < this.startTime ) {
			var percent = parseFloat( this.startTime ) / this.getDuration();
			this.doSeek( percent );
		}

		// Start the monitor if not already started
		this.monitor();
	},
	/**
	 * Pause player, and display a loading animation
	 * @return
	 */
	pauseLoading: function(){
		this.pause();
		$( this ).getAbsoluteOverlaySpinner()
			.attr( 'id', 'loadingSpinner_' + this.id );
	},
	hidePlayerSpinner: function(){
		$( '#loadingSpinner_' + this.id ).remove();
	},
	/**
	 * Base embed pause Updates the play/pause button state.
	 * 
	 * There is no general way to pause the video must be overwritten by embed
	 * object to support this functionality.
	 */
	pause: function( event ) {
		var _this = this;
		// Trigger the pause event if not already paused and using native controls:
		if( this.paused === false ){
			this.paused = true;
			mw.log('EmbedPlayer:trigger pause:' + this.paused);
			if(  this._propagateEvents ){
				// "pause" will be deprecated in favor of "onpause"
				$( this ).trigger( 'pause' );
				$( this ).trigger( 'onpause' );
			}
		}

		// Update the ctrl "paused state"
		if( this.$interface ){
			this.$interface.find('.play-btn span' )
			.removeClass( 'ui-icon-pause' )
			.addClass( 'ui-icon-play' );
	
			this.$interface.find( '.play-btn' )
			.unbind('click')
			.buttonHover()
			.click( function() {
				_this.play();
			} )
			.attr( 'title', gM( 'mwe-embedplayer-play_clip' ) );
		}
	},

	/**
	 * Maps the html5 load request. There is no general way to "load" clips so
	 * underling plugin-player libs should override.
	 */
	load: function() {
		// should be done by child (no base way to pre-buffer video)
		mw.log( 'baseEmbed:load call' );
	},


	/**
	 * Base embed stop
	 * 
	 * Updates the player to the stop state shows Thumbnail resets Buffer resets
	 * Playhead slider resets Status
	 */
	stop: function() {
		var _this = this;
		mw.log( 'EmbedPlayer::stop:' + this.id );

		// trigger the stop event:
		$( this ).trigger( 'doStop' );
			
		// no longer seeking:
		this.didSeekJump = false;

		// Reset current time and prev time and seek offset
		this.currentTime = this.previousTime = 	this.serverSeekTime = 0;

		this.stopMonitor();

		// Issue pause to update interface (only call this parent)
		if( !this.paused ){
			this.paused = true;
			// update the interface
			if ( this['parent_pause'] ) {
				this.parent_pause();
			} else {
				this.pause();
			}
		}
		// Native player controls:
		if( this.useNativePlayerControls() ){
			this.getPlayerElement().currentTime = 0;
			this.getPlayerElement().pause();
			// If on android when we "stop" we re add the large play button
			if( mw.isAndroid2() ){
				this.addPlayBtnLarge();
			}
		} else {
			// Rewrite the html to thumbnail disp
			this.showThumbnail();
			this.bufferedPercent = 0; // reset buffer state
			this.controlBuilder.setStatus( this.getTimeRange() );

			// Reset the playhead
			mw.log("EmbedPlayer::Stop:: Reset play head")
			this.updatePlayHead( 0 );
		}
	},

	/**
	 * Base Embed mute
	 * 
	 * Handles interface updates for toggling mute. Plug-in / player interface
	 * must handle the actual media player update
	 */
	toggleMute: function() {
		mw.log( 'f:toggleMute:: (old state:) ' + this.muted );
		if ( this.muted ) {
			this.muted = false;
			var percent = this.preMuteVolume;
		} else {
			this.muted = true;
			this.preMuteVolume = this.volume;
			var percent = 0;
		}
		this.setVolume( percent );
		// Update the interface
		this.setInterfaceVolume( percent );
	},

	/**
	 * Update volume function ( called from interface updates )
	 * 
	 * @param {float}
	 *            percent Percent of full volume
	 */
	setVolume: function( percent, triggerChange ) {
		var _this = this;
		// ignore NaN percent:
		if( isNaN( percent ) ){
			return ;
		}
		// Set the local volume attribute
		this.previousVolume = this.volume;
		
		this.volume = percent;

		// Un-mute if setting positive volume
		if( percent != 0 ){
			this.muted = false;
		}

		// Update the playerElement volume
		this.setPlayerElementVolume( percent );

		// mw.log(" setVolume:: " + percent + ' this.volume is: ' +
		// this.volume);
		if( triggerChange ){
			$( _this ).trigger('volumeChanged', percent );
		}
	},

	/**
	 * Updates the interface volume
	 * 
	 * TODO should move to controlBuilder
	 * 
	 * @param {float}
	 *            percent Percentage volume to update interface
	 */
	setInterfaceVolume: function( percent ) {
		if( this.supports[ 'volumeControl' ] &&
			this.$interface.find( '.volume-slider' ).length
		) {
			this.$interface.find( '.volume-slider' ).slider( 'value', percent * 100 );
		}
	},

	/**
	 * Abstract Update volume Method must be override by plug-in / player
	 * interface
	 */
	setPlayerElementVolume: function( percent ) {
		mw.log('Error player does not support volume adjustment' );
	},

	/**
	 * Abstract get volume Method must be override by plug-in / player interface
	 * (if player does not override we return the abstract player value )
	 */
	getPlayerElementVolume: function(){
		// mw.log(' error player does not support getting volume property' );
		return this.volume;
	},

	/**
	 * Abstract get volume muted property must be overwritten by plug-in /
	 * player interface (if player does not override we return the abstract
	 * player value )
	 */
	getPlayerElementMuted: function(){
		// mw.log(' error player does not support getting mute property' );
		return this.muted;
	},

	/**
	 * Passes a fullscreen request to the controlBuilder interface
	 */
	fullscreen: function() {
		this.controlBuilder.toggleFullscreen();
	},

	/**
	 * Abstract method to be run post embedding the player Generally should be
	 * overwritten by the plug-in / player
	 */
	postEmbedJS:function() {
		return ;
	},

	/**
	 * Checks the player state based on thumbnail display & paused state
	 * 
	 * @return {Boolean} true if playing false if not playing
	 */
	isPlaying : function() {
		if ( this.posterDisplayed ) {
			// in stopped state
			return false;
		} else if ( this.paused ) {
			// paused state
			return false;
		} else {
			return true;
		}
	},

	/**
	 * Get paused state
	 * 
	 * @return {Boolean} true if playing false if not playing
	 */
	isPaused: function() {
		return this.paused;
	},

	/**
	 * Get Stopped state
	 * 
	 * @return {Boolean} true if stopped false if playing
	 */
	isStopped: function() {
		return this.posterDisplayed;
	},

	// TODO temporary hack we need a better stop monitor system
	stopMonitor: function(){
		clearInterval( this.monitorInterval );
		this.monitorInterval = 0;
	},
	// TODO temporary hack we need a better stop monitor system
	startMonitor: function(){
		this.monitor();
	},

	/**
	 * Checks if the currentTime was updated outside of the getPlayerElementTime
	 * function
	 */
	checkForCurrentTimeSeek: function(){
		var _this = this;
		// Check if a javascript currentTime change based seek has occurred
		if( _this.previousTime != _this.currentTime && !this.userSlide && !this.seeking){
			// If the time has been updated and is in range issue a seek
			if( _this.getDuration() && _this.currentTime <= _this.getDuration() ){
				var seekPercent = _this.currentTime / _this.getDuration();
				mw.log("MwEmbed::checkForCurrentTimeSeek::" + _this.previousTime + ' != ' +
						 _this.currentTime + " javascript based currentTime update to " +
						 seekPercent + ' == ' + _this.currentTime );
				_this.previousTime = _this.currentTime;
				this.doSeek( seekPercent );
			}
		}
	},

	/**
	 * Monitor playback and update interface components. underling plugin
	 * objects are responsible for updating currentTime
	 */
	monitor: function() {
		var _this = this;

		// Check for current time update outside of embed player
		this.checkForCurrentTimeSeek();

		// Update currentTime via embedPlayer
		_this.currentTime = _this.getPlayerElementTime();
		// Update any offsets from server seek
		if( _this.serverSeekTime && _this.supportsURLTimeEncoding() ){
			_this.currentTime = parseInt( _this.serverSeekTime ) + parseInt( _this.getPlayerElementTime() );
		}

		// Update the previousTime ( so we can know if the user-javascript
		// changed currentTime )
		_this.previousTime = _this.currentTime;

		if( _this.pauseTime && _this.currentTime >  _this.pauseTime ){
			_this.pause();
			_this.pauseTime = null;
		}


		// Check if volume was set outside of embed player function
		// mw.log( ' this.volume: ' + _this.volume + ' prev Volume:: ' +
		// _this.previousVolume );
		if( Math.round( _this.volume * 100 ) != Math.round( _this.previousVolume * 100 ) ) {
			_this.setInterfaceVolume( _this.volume );
			if( _this._propagateEvents ){
				// $( this ).trigger('volumeChanged', _this.volume );
			}
		}

		// Update the previous volume
		_this.previousVolume = _this.volume;

		// Update the volume from the player element
		_this.volume = this.getPlayerElementVolume();

		// update the mute state from the player element
		if( _this.muted != _this.getPlayerElementMuted() && ! _this.isStopped() ){
//			mw.log( "EmbedPlayer::monitor: muted does not mach embed player" );
			_this.toggleMute();
			// Make sure they match:
			_this.muted = _this.getPlayerElementMuted();
		}


		if ( this.currentTime >= 0 && this.duration ) {
			if ( !this.userSlide && !this.seeking ) {
				if ( parseInt( this.startOffset ) != 0 ) {
					// If start offset include that calculation
					this.updatePlayHead( ( this.currentTime - this.startOffset ) / this.duration );
					var et = ( this.controlBuilder.longTimeDisp ) ? '/' + mw.seconds2npt( parseFloat( this.startOffset ) + parseFloat( this.duration ) ) : '';
					this.controlBuilder.setStatus( mw.seconds2npt( this.currentTime ) + et );
				} else {
					this.updatePlayHead( this.currentTime / this.duration );
					// Only include the end time if longTimeDisp is enabled:
					var et = ( this.controlBuilder.longTimeDisp ) ? '/' + mw.seconds2npt( this.duration ) : '';
					this.controlBuilder.setStatus( mw.seconds2npt( this.currentTime ) + et );
				}
			}
			// Check if we are "done"
			var endPresentationTime = ( this.startOffset ) ? ( this.startOffset + this.duration ) : this.duration;
			if ( this.currentTime > endPresentationTime ) {
				// mw.log( "mWEmbedPlayer::should run clip done :: " + this.currentTime + ' > ' + endPresentationTime );
				this.onClipDone();
				return ;
			}
			// End video if we have endTime attribute
			if( this.endTime && (this.currentTime > this.endTime) ) {
				this.pause();
				this.onClipDone();
				return ;
			}

		} else {
			// Media lacks duration just show end time
			if ( this.isStopped() ) {
				this.controlBuilder.setStatus( this.getTimeRange() );
			} else if ( this.isPaused() ) {
				this.controlBuilder.setStatus( gM( 'mwe-embedplayer-paused' ) );
			} else if ( this.isPlaying() ) {
				if ( this.currentTime && ! this.duration )
					this.controlBuilder.setStatus( mw.seconds2npt( this.currentTime ) + ' /' );
				else
					this.controlBuilder.setStatus( " - - - " );
			} else {
				this.controlBuilder.setStatus( this.getTimeRange() );
			}
		}

		// Update buffer information
		this.updateBufferStatus();
		
		// Call monitor at 250ms interval. ( use setInterval to avoid stacking
		// monitor requests )
		if( ! this.isStopped() ) {
			if( !this.monitorInterval ){
				this.monitorInterval = setInterval( function(){
					if( _this.monitor )
						_this.monitor();
				}, this.monitorRate );
			}
		} else {
			// If stopped "stop" monitor:
			this.stopMonitor();
		}

		//mw.log('trigger:monitor:: ' + this.currentTime  + ' propagate events: ' + _this._propagateEvents);
		if( _this._propagateEvents ){
			$( this ).trigger( 'monitorEvent' );
		}
	},

	/**
	 * Abstract getPlayerElementTime function
	 */
	getPlayerElementTime: function(){
		mw.log("Error: getPlayerElementTime should be implemented by embed library");
	},

	/**
	 * Abstract getPlayerElementTime function
	 */
	getPlayerElement: function(){
		mw.log("Error: getPlayerElement should be implemented by embed library, or you may be calling this event too soon");
	},
	
	/**
	 * Update the Buffer status based on the local bufferedPercent var
	 */
	updateBufferStatus: function() {
		// Get the buffer target based for playlist vs clip
		$buffer = this.$interface.find( '.mw_buffer' );

		// mw.log(' set bufferd %:' + this.bufferedPercent );
		// Update the buffer progress bar (if available )
		if ( this.bufferedPercent != 0 ) {
			// mw.log('Update buffer css: ' + ( this.bufferedPercent * 100 ) +
			// '% ' + $buffer.length );
			if ( this.bufferedPercent > 1 ){
				this.bufferedPercent = 1;
			}
			$buffer.css({
				"width" : ( this.bufferedPercent * 100 ) + '%'
			});
			$( this ).trigger( 'updateBufferPercent', this.bufferedPercent );
		} else {
			$buffer.css( "width", '0px' );
		}

		// if we have not already run the buffer start hook
		if( this.bufferedPercent > 0 && !this.bufferStartFlag ) {
			this.bufferStartFlag = true;
			mw.log("bufferStart");
			$( this ).trigger( 'bufferStartEvent' );
		}

		// if we have not already run the buffer end hook
		if( this.bufferedPercent == 1 && !this.bufferEndFlag){
			this.bufferEndFlag = true;
			$( this ).trigger( 'bufferEndEvent' );
		}
	},

	/**
	 * Update the player playhead
	 * 
	 * @param {Float}
	 *            perc Value between 0 and 1 for position of playhead
	 */
	updatePlayHead: function( perc ) {
		//mw.log( 'EmbedPlayer: updatePlayHead: '+ perc);
		$playHead = this.$interface.find( '.play_head' );
		if ( !this.useNativePlayerControls() && $playHead.length != 0 ) {
			var val = parseInt( perc * 1000 );
			$playHead.slider( 'value', val );
		}
		$( this ).trigger('updatePlayHeadPercent', perc);
	},


	/**
	 * Helper Functions for selected source
	 */

	/**
	 * Get the current selected media source or first source
	 * 
	 * @param {Number}
	 *            Requested time in seconds to be passed to the server if the
	 *            server supports supportsURLTimeEncoding
	 * @return src url
	 */
	getSrc: function( serverSeekTime ) {
		if( serverSeekTime ){
			this.serverSeekTime = serverSeekTime;
		}
		if( this.currentTime && !this.serverSeekTime){
			this.serverSeekTime = this.currentTime;
		}

		// No media element we can't return src
		if( !this.mediaElement ){
			return false;
		}

		// If no source selected auto select the source:
		if( !this.mediaElement.selectedSource ){
			this.mediaElement.autoSelectSource();
		};

		// Return selected source:
		if( this.mediaElement.selectedSource ){
			// See if we should pass the requested time to the source generator:
			if( this.supportsURLTimeEncoding() ){
				// get the first source:
				return this.mediaElement.selectedSource.getSrc( this.serverSeekTime );
			} else {
				return this.mediaElement.selectedSource.getSrc();
			}
		}
		// No selected source return false:
		return false;
	},
	
	/**
	 * STATIC ( can move elsewhere ) Uses mediaElement select logic to chose a
	 * video file among a set of sources
	 * 
	 * @param videoFiles
	 * @return
	 */
	getCompatibleSource: function( videoFiles ){
		// Convert videoFiles json into HTML element:
		// TODO mediaElement should probably accept JSON
		$media = $('<video />');
		$.each(videoFiles, function( inx, source){
			$media.append( $('<source />').attr({
				'src' : source.src,
				'type' : source.type
			}));
			mw.log("EmbedPlayer::getCompatibleSource: add " + source.src + ' of type:' + source.type );
		});
		var myMediaElement =  new mw.MediaElement( $media.get(0) );
		var source = myMediaElement.autoSelectSource();
		if( source ){
			mw.log("EmbedPlayer::getCompatibleSource: " + source.getSrc());
			return source.getSrc();
		}
		mw.log("Error:: could not find compatible source");
		return false;
	},
	/**
	 * If the selected src supports URL time encoding
	 * 
	 * @return {Boolean} true if the src supports url time requests false if the
	 *         src does not support url time requests
	 */
	supportsURLTimeEncoding: function() {
		var timeUrls = mw.getConfig('EmbedPlayer.EnableURLTimeEncoding') ;
		if( timeUrls == 'none' ){
			return false;
		} else if( timeUrls == 'always' ){
			return this.mediaElement.selectedSource.URLTimeEncoding;
		} else if( timeUrls == 'flash' ){
			if( this.mediaElement.selectedSource && this.mediaElement.selectedSource.URLTimeEncoding){
				// see if the current selected player is flash:
				return ( this.instanceOf == 'Kplayer' );
			}
		} else {
			mw.log("Error:: invalid config value for EmbedPlayer.EnableURLTimeEncoding:: " + mw.getConfig('EmbedPlayer.EnableURLTimeEncoding') );
		}
		return false;
	}
};

})( mediaWiki, jQuery );
