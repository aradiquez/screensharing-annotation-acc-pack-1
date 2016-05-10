var AccPackAnnotation = (function() {

    var self;

    /** 
     * @constructor
     * Represents an annotation component which may be used for annotation over video or a shared screen
     * @param {object} options
     * @param {object} options.canvasContainer - The id of the parent element for the annotation canvas
     * @param {object} options.watchForResize - The DOM element to watch for resize
     */
    var Annotation = function(options) {
        self = this;
        self.options = _.omit(options, 'accPack');
        self.accPack = options.accPack;
        self.elements = {};
        _registerEvents();
        _setupUI();
    };

    var _triggerEvent;
    var _registerEvents = function() {
        var events = ['startAnnotation', 'linkAnnotation', 'resizeCanvas', 'annotationWindowClosed', 'endAnnotation'];
        _triggerEvent = self.accPack.registerEvents(events);
    };

    var _setupUI = function() {
        var toolbar = ['<div id="toolbar"></div>'].join('\n');
        $('body').append(toolbar);
    };

    // Toolbar items
    var _defaultToolbarItems = [{
        id: 'OT_pen',
        title: 'Pen',
        icon: '../images/annotation/freehand.png',
        selectedIcon: '../images/annotation/freehand_selected.png'
    }, {
        id: 'OT_line',
        title: 'Line',
        icon: '../images/annotation/line.png',
        selectedIcon: '../images/annotation/line_selected.png'
    }, {
        id: 'OT_text',
        title: 'Text',
        icon: '../images/annotation/text.png',
        selectedIcon: '../images/annotation/text.png'
    }, {
        id: 'OT_shapes',
        title: 'Shapes',
        icon: '../images/annotation/shapes.png',
        items: [{
            id: 'OT_arrow',
            title: 'Arrow',
            icon: '../images/annotation/arrow.png'
        }, {
            id: 'OT_rect',
            title: 'Rectangle',
            icon: '../images/annotation/rectangle.png'
        }, {
            id: 'OT_oval',
            title: 'Oval',
            icon: '../images/annotation/oval.png'
        }, {
            id: 'OT_star',
            title: 'Star',
            icon: '../images/annotation/star.png',
            points: [
                [0.5 + 0.5 * Math.cos(90 * (Math.PI / 180)), 0.5 + 0.5 * Math.sin(90 * (Math.PI / 180))],
                [0.5 + 0.25 * Math.cos(126 * (Math.PI / 180)), 0.5 + 0.25 * Math.sin(126 * (Math.PI / 180))],
                [0.5 + 0.5 * Math.cos(162 * (Math.PI / 180)), 0.5 + 0.5 * Math.sin(162 * (Math.PI / 180))],
                [0.5 + 0.25 * Math.cos(198 * (Math.PI / 180)), 0.5 + 0.25 * Math.sin(198 * (Math.PI / 180))],
                [0.5 + 0.5 * Math.cos(234 * (Math.PI / 180)), 0.5 + 0.5 * Math.sin(234 * (Math.PI / 180))],
                [0.5 + 0.25 * Math.cos(270 * (Math.PI / 180)), 0.5 + 0.25 * Math.sin(270 * (Math.PI / 180))],
                [0.5 + 0.5 * Math.cos(306 * (Math.PI / 180)), 0.5 + 0.5 * Math.sin(306 * (Math.PI / 180))],
                [0.5 + 0.25 * Math.cos(342 * (Math.PI / 180)), 0.5 + 0.25 * Math.sin(342 * (Math.PI / 180))],
                [0.5 + 0.5 * Math.cos(18 * (Math.PI / 180)), 0.5 + 0.5 * Math.sin(18 * (Math.PI / 180))],
                [0.5 + 0.25 * Math.cos(54 * (Math.PI / 180)), 0.5 + 0.25 * Math.sin(54 * (Math.PI / 180))],
                [0.5 + 0.5 * Math.cos(90 * (Math.PI / 180)), 0.5 + 0.5 * Math.sin(90 * (Math.PI / 180))]
            ]
        }]
    }, {
        id: 'OT_colors',
        title: 'Colors',
        icon: '',
        items: { /* Built dynamically */ }
    }, {
        id: 'OT_line_width',
        title: 'Line Width',
        icon: '../images/annotation/line_width.png',
        items: { /* Built dynamically */ }
    }, {
        id: 'OT_clear',
        title: 'Clear',
        icon: '../images/annotation/clear.png'
    }];

    var _palette = [
        '#1abc9c',
        '#2ecc71',
        '#3498db',
        '#9b59b6',
        '#8e44ad',
        '#f1c40f',
        '#e67e22',
        '#e74c3c',
        '#ded5d5'
    ];

    var _aspectRatio = (10 / 6);

    /** Private methods */

    var _listenForResize = function() {
        $(self.elements.resizeSubject).on('resize', resizeCanvas);
    };

    var _createToolbar = function(session, options, externalWindow) {

        var toolbarId = _.property('toolbarId')(options) || 'toolbar';
        var items = _.property('toolbarItems')(options) || _defaultToolbarItems;
        var colors = _.property('colors')(options) || _palette;

        var container = function() {
            var w = !!externalWindow ? externalWindow : window;
            return w.document.getElementById(toolbarId);
        };

        toolbar = new OTSolution.Annotations.Toolbar({
            session: session,
            container: container(),
            colors: colors,
            items: items,
            externalWindow: externalWindow || null
        });

    };

    var _refreshCanvas = _.throttle(function() {
        self.canvas.onResize();
    }, 1000);

    // Create external screen sharing window
    var _createExternalWindow = function() {

        var deferred = $.Deferred();

        var width = screen.width * .80 | 0;
        var height = width / (_aspectRatio);
        var url = ['templates/screenshare.html?opentok-annotation'].join('');

        var windowFeatures = [
            'toolbar=no',
            'location=no',
            'directories=no',
            'status=no',
            'menubar=no',
            'scrollbars=no',
            'resizable=no',
            'copyhistory=no',
            'width=' + width,
            'height=' + height,
            'left=' + ((screen.width / 2) - (width / 2)),
            'top=' + ((screen.height / 2) - (height / 2))
        ].join(',');

        var annotationWindow = window.open(url, '', windowFeatures);
        window.onbeforeunload = function(){annotationWindow.close();}

        // External window needs access to certain globals
        annotationWindow.toolbar = toolbar;
        annotationWindow.OT = OT;
        annotationWindow.$ = $;
        
        annotationWindow.triggerCloseEvent = function() {
            _triggerEvent('annotationWindowClosed')
        };

        // TODO Find something better.
        var windowReady = function() {
            if (!!annotationWindow.createContainerElements) {
                $(annotationWindow.document).ready(function() {
                    deferred.resolve(annotationWindow);
                });
            } else {
                setTimeout(windowReady, 100);
            }
        };

        windowReady();

        return deferred.promise();
    };

    // Remove the toolbar and cancel event listeners
    var _removeToolbar = function() {
        $(self.elements.resizeSubject).off('resize', resizeCanvas);
        toolbar.remove();
    };

    /**
     * Creates an external window (if required) and links the annotation toolbar
     * to the session
     * @param {object} session
     * @param {object} [options]
     * @param {boolean} [options.screensharing] - Using an external window
     * @param {string} [options.toolbarId] - If the container has an id other than 'toolbar'
     * @param {array} [options.items] - Custom set of tools
     * @param {array} [options.colors] - Custom color palette
     * @returns {promise} < Resolve: undefined | {object} Reference to external annotation window >
     */
    var start = function(session, options) {

        var deferred = $.Deferred();

        if (_.property('screensharing')(options)) {
            _createExternalWindow()
                .then(function(externalWindow) {
                    _createToolbar(session, options, externalWindow);
                    toolbar.createPanel(externalWindow);
                    _triggerEvent('startAnnotation', externalWindow);
                    deferred.resolve(externalWindow);
                });
        } else {
            _createToolbar(session, options);
            _triggerEvent('startAnnotation');
            deferred.resolve();
        }

        return deferred.promise();
    };

    /**
     * @param {object} pubSub - Either the publisher(share screen) or subscriber(viewing shared screen)
     * @ param {object} container - The parent container for the canvas element
     * @ param {object} options
     * @param {object} [options.externalWindow] - Reference to the annotation window if publishing
     * @param {object} options.canvasContainer - The id of the parent element for the annotation canvas
     * @param {array} [options.absoluteParent] - Element to reference for dimensions on resize if other than container
     */
    var linkCanvas = function(pubSub, container, options) {

        /**
         * jQuery only allows listening for a resize event on the window or a
         * jQuery resizable element, like #wmsFeedWrap.  windowRefernce is a
         * reference to the popup window created for annotation.  If this doesn't
         * exist, we are watching the canvas belonging to the party viewing the
         * shared screen
         */
        self.elements.resizeSubject = _.property('externalWindow')(options) || window;
        self.elements.externalWindow = _.property('externalWindow')(options) || null;
        self.elements.absoluteParent = _.property('absoluteParent')(options) || null;
        self.elements.canvasContainer = container;


        self.canvas = new OTSolution.Annotations({
            feed: pubSub,
            container: container,
            externalWindow: self.elements.externalWindow
        });

        self.elements.externalWindow

        var context = self.elements.externalWindow ? self.elements.externalWindow : window;

        self.elements.canvas = $(_.first(context.document.getElementsByTagName('canvas')));

        toolbar.addCanvas(self.canvas);

        self.canvas.onScreenCapture(function(dataUrl) {
            var win = window.open(dataUrl, '_blank');
            win.focus();
        });

        _listenForResize();
        resizeCanvas();
        _triggerEvent('linkAnnotation');

    };

    /** Resize the canvas to match the size of its container */
    var resizeCanvas = function() {

        var width, height;

        if (!!self.elements.externalWindow) {

            var windowDimensions = {
                width: self.elements.externalWindow.innerWidth,
                height: self.elements.externalWindow.innerHeight
            };

            var computedHeight = windowDimensions.width / _aspectRatio;

            if (computedHeight <= windowDimensions.height) {
                width = windowDimensions.width;
                height = computedHeight;
            } else {
                height = windowDimensions.height;
                width = height * _aspectRatio;
            }

        } else {
            var el = self.elements.absoluteParent || self.elements.canvasContainer;
            width = $(el).width();
            height = $(el).height();
        }

        $(self.elements.canvasContainer).css({
            width: width,
            height: height
        });

        $(self.elements.canvas).css({
            width: width,
            height: height
        });

        $(self.elements.canvas).attr({
            width: width,
            height: height
        });

        _refreshCanvas();
        _triggerEvent('resizeCanvas');
    };

    /**
     * Stop annotation and clean up components
     */
    var end = function() {
        _removeToolbar();
        delete self.canavs;
        if (!!self.elements.externalWindow) {
            self.elements.externalWindow.close();
            self.elements.externalWindow;
            self.elements.resizeSubject;
        }
        _triggerEvent('endAnnotation');
    };

    Annotation.prototype = {
        constructor: Annotation,
        start: start,
        linkCanvas: linkCanvas,
        resizeCanvas: resizeCanvas,
        end: end
    };

    return Annotation;

})();
var Communication = (function() {

    var self;

    /** 
     * @constructor
     * Represents a one-to-one AV communication layer
     * @param {object} options
     * @param {object} options.session
     * @param {string} options.sessionId
     * @param {string} options.apiKey
     * @param {array} options.subscribers
     * @param {array} options.streams
     * @param {boolean} options.annotation
     */
    var CommunicationComponent = function(options) {
        self = this;

        var nonOptionProps = ['accPack', 'session', 'subscribers', 'streams'];
        self.options = _validateOptions(options, nonOptionProps);
        _.extend(self, _.pick(options, nonOptionProps));

        _registerEvents();
        _setEventListeners();
        _logAnalytics();
    };


    /** Private Methods */

    /**
     * Validates options and returns a filtered hash to be added to the instance
     * @param {object} options
     * @param {array} ignore - Properties that should not be included in options
     */
    var _validateOptions = function(options, ignore) {

        if (!options || !options.session) {
            throw new Error('No session provided.');
        }

        return _.omit(options, ignore);
    };

    var _triggerEvent;
    var _registerEvents = function() {

        var events = [
            'startCall',
            'endCall',
            'startViewingSharedScreen',
            'endViewingSharedScreen'
        ];

        _triggerEvent = self.accPack.registerEvents(events);
    };

    var _setEventListeners = function() {
        self.accPack.registerEventListener('streamCreated', _handleStreamCreated);
        self.accPack.registerEventListener('streamDestroyed', _handleStreamDestroyed);
    };

    var _logAnalytics = function() {

        var _otkanalyticsData = {
            sessionId: self.options.sessionId,
            connectionId: self.session.connection.connectionId,
            partnerId: self.options.apiKey,
            clientVersion: '1.0.0'
        };

        var _otkanalytics = new OTKAnalytics(_otkanalyticsData);

        var _loggingData = {
            action: 'one-to-one-sample-app',
            variation: ''
        };

        _otkanalytics.logEvent(_loggingData);
    };

    var _publish = function(type) {

        currentSource = type;

        var handler = self.onError;

        _initPublisherCamera();

        return self.session.publish(self.publisher, function(error) {
            if (error) {
                console.log("Error starting a call " + error.code + " - " + error.message);
                error.message = "Error starting a call";
                if (error.code === 1010) {
                    var errorStr = error.message + ". Check your network connection.";
                    error.message = errorStr;
                }
                _handleError(error, handler);
            }
        });
    };

    var _unpublish = function() {
        if (self.publisher) {
            self.session.unpublish(self.publisher);
        }
    };

    var _initPublisherCamera = function() {
        if (self.options.user) {
            self.options.localCallProperties.name = self.options.user.name;
        }
        self.publisher = OT.initPublisher('videoHolderSmall', self.options.localCallProperties, function(error) {
            if (error) {
                error.message = "Error starting a call";
                _handleError(error, handler);
            }
            //self.publishers.camera.on('streamDestroyed', self._publisherStreamDestroyed);
        });
    };

    var _publisherStreamDestroyed = function(event) {
        console.log('publisherStreamDestroyed', event);
        event.preventDefault();
    };

    var _subscribeToStream = function(stream) {
        var handler = self.onError;
        if (stream.videoType === 'screen') {
            var options = self.options.localScreenProperties
        } else {
            var options = self.options.localCallProperties
        }

        var videoContainer = stream.videoType === 'screen' ? 'videoHolderSharedScreen' : 'videoHolderBig';

        var subscriber = self.session.subscribe(stream,
            videoContainer,
            options,
            function(error) {
                if (error) {
                    console.log('Error starting a call ' + error.code + ' - ' + error.message);
                    error.message = 'Error starting a call';
                    if (error.code === 1010) {
                        var errorStr = error.message + '. Check your network connection.'
                        error.message = errorStr;
                    }
                    _handleError(error, handler);
                } else {

                    self.streams.push(subscriber);

                    if (stream.videoType === 'screen' && !!self.options.annotation) {
                        _triggerEvent('startViewingSharedScreen', subscriber);
                    }
                }
            });

        self.subscriber = subscriber;
    };

    var _unsubscribeStreams = function() {
        _.each(self.streams, function(stream) {
            self.session.unsubscribe(stream);
        })
    };

    // Private handlers
    var _handleStart = function(event) {

    };

    var _handleEnd = function(event) {

    };

    var _handleStreamCreated = function(event) {
        //TODO: check the joined participant
        self.subscribers.push(event.stream);
        if (self.options.inSession) {
            // TODO Is this required???
            self._remoteParticipant = event.connection;
            _subscribeToStream(event.stream);
        }

    };

    var _handleStreamDestroyed = function(event) {
        console.log('Participant left the call');
        var streamDestroyedType = event.stream.videoType;

        //remove to the subscribers list
        var index = self.subscribers.indexOf(event.stream);
        self.subscribers.splice(index, 1);

        if (streamDestroyedType === 'camera') {
            self.subscriber = null; //to review
            self._remoteParticipant = null;

        } else if (streamDestroyedType === 'screen') {
            _triggerEvent('endViewingSharedScreen');
        } else {
            _.each(self.subscribers, function(subscriber) {
                _subscribeToStream(subscriber);
            });
        }

        //var handler = this.onParticipantLeft(streamDestroyedType);
        // TODO Do we need user date for anything???
        var userData = {
            userId: 'event.stream.connectionId'
        };

    };

    var _handleLocalPropertyChanged = function(event) {

        if (event.changedProperty === 'hasAudio') {
            var eventData = {
                property: 'Audio',
                enabled: event.newValue
            }
        } else {
            var eventData = {
                property: 'Video',
                enabled: event.newValue
            }
        }
    }

    var _handleError = function(error, handler) {
        if (handler && typeof handler === 'function') {
            handler(error);
        }
    };

    // Prototype methods
    CommunicationComponent.prototype = {
        constructor: Communication,
        start: function(recipient) {
            //TODO: Managing call status: calling, startCall,...using the recipient value

            self.options.inSession = true;

            self.publisher = _publish('camera');

            $.when(self.publisher.on('streamCreated'))
                .done(function(event) {
                    _handleStart(event)
                })
                .promise(); //call has been initialized

            self.publisher.on('streamDestroyed', function(event) {
                console.log("stream destroyed");
                _handleEnd(event); //call has been finished
            });

            self.publisher.session.on('streamPropertyChanged', function(event) {
                if (self.publisher.stream === event.stream) {
                    _handleLocalPropertyChanged(event)
                }
            }); //to handle audio/video changes

            _.each(self.subscribers, function(subscriber) {
                _subscribeToStream(subscriber);
            });

            _triggerEvent('startCall');

        },
        end: function() {
            self.options.inSession = false;
            _unpublish('camera');
            _unsubscribeStreams();
            _triggerEvent('endCall');
        },
        enableLocalAudio: function(enabled) {
            self.publisher.publishAudio(enabled);
        },
        enableLocalVideo: function(enabled) {
            self.publisher.publishVideo(enabled);
        },
        enableRemoteVideo: function(enabled) {
            self.subscriber.subscribeToVideo(enabled);
            self.onEnableRemoteMedia({
                media: 'video',
                enabled: enabled
            });
        },
        enableRemoteAudio: function(enabled) {
            self.subscriber.subscribeToAudio(enabled);
            self.onEnableRemoteMedia({
                media: 'audio',
                enabled: enabled
            });
        }
    };

    return CommunicationComponent;

})();
var AccPackScreenSharing = (function() {

  var self;
  var _initialized;
  var _active;

  /** 
   * @constructor
   * Represents a screensharing component
   * @param {object} options
   * @param {string} options.sessionID
   * @param [string] options.extensionID
   * @param [string] options.extentionPathFF
   * @param [string] options.screensharingParent 
   */
  var ScreenSharing = function(options) {

    self = this;

    // Check for required options
    _validateOptions(options);

    // Extend our instance
    var optionsProps = [
      'accPack',
      'session',
      'sessionId',
      'annotation',
      'extensionURL',
      'extensionID',
      'extensionPathFF',
      'screensharingParent',
      'localScreenProperties'
    ];

    _.extend(this, _.defaults(_.pick(options, optionsProps)), {
      screenSharingParent: '#videoContainer',
      screenSharingControls: '#feedControls'
    });

    // Do UIy things
    _setupUI(self.screensharingParent);
    _registerEvents()
    _addScreenSharingListeners();
    _initialized = true;
  };

  var _triggerEvent;
  var _registerEvents = function() {
    var events = ['startScreenSharing', 'endScreenSharing'];
    _triggerEvent = self.accPack.registerEvents(events);
  };

  var _toggleScreenSharingButton = function(show) {
    $('#startScreenSharing')[show ? 'show' : 'hide']();
  };

  var _addScreenSharingListeners = function() {
    $('#startScreenSharing').on('click', function() {
      !!_active ? end() : start();
    });

    /** Handlers for screensharing extension modal */
    $('#btn-install-plugin-chrome').on('click', function() {
      chrome.webstore.install('https://chrome.google.com/webstore/detail/' + self.extensionID,
        function(success) {
          console.log('success', success);
        },
        function(error) {
          console.log('error', error);
        });
      $('#dialog-form-chrome').toggle();
    });

    $('#btn-cancel-plugin-chrome').on('click', function() {
      $('#dialog-form-chrome').toggle();
    });

    $('#btn-install-plugin-ff').prop('href', self.extensionPathFF);

    $('#btn-install-plugin-ff').on('click', function() {
      $('#dialog-form-ff').toggle();
    });

    $('#btn-cancel-plugin-ff').on('click', function() {
      $('#dialog-form-ff').toggle();
    });

    self.accPack.registerEventListener('startCall', function(){
      _toggleScreenSharingButton(true);
    });

    self.accPack.registerEventListener('endCall', function() {
      if ( _active ) {
        end(true);
      } else {
        _toggleScreenSharingButton(false);
      }
    });
    
    self.accPack.registerEventListener('annotationWindowClosed', function() {
      end();
    });
  };

  var _validateExtension = function(extensionID, extensionPathFF) {

    if (OT.$.browser() === 'Chrome') {
      if (!extensionID || !extensionID.length) {
        throw new Error('Error starting the screensharing. Chrome extensionID required');
      } else {
        $('<link/>', {
          rel: 'chrome-webstore-item',
          href: ['https://chrome.google.com/webstore/detail/', extensionID].join('')
        }).appendTo('head');

        OT.registerScreenSharingExtension('chrome', extensionID, 2);
      }
    }

    if (OT.$.browser() === 'Firefox' && (!extensionPathFF || !extensionPathFF.length)) {
      throw new Error('Error starting the screensharing. Firefox screensharing extension required');
    }
  };

  var _validateOptions = function(options) {

    if (!_.property('sessionID', options)) {
      throw new Error('Screen Share Acc Pack requires a session ID');
    }

    _validateExtension(_.property('extensionID')(options), _.property('extensionPathFF')(options));
  };

  var screenSharingControl = ['<div class="video-control circle share-screen" id="startScreenSharing"></div>'].join('\n');
  var screenSharingView = [
    '<div class="hidden" id="screenShareView">',
    '<div class="wms-feed-main-video">',
    '<div class="wms-feed-holder" id="videoHolderScreenShare"></div>',
    '<div class="wms-feed-mask"></div>',
    '<img src="/images/mask/video-mask.png"/>',
    '</div>',
    '<div class="wms-feed-call-controls" id="feedControlsFromScreen">',
    '<button class="wms-icon-screen active hidden" id="endScreenShareBtn"></button>',
    '</div>',
    '</div>'
  ].join('\n');

  var screenDialogsExtensions = [
    '<div id="dialog-form-chrome" class="wms-modal" style="display: none;">',
    '<div class="wms-modal-body">',
    '<div class="wms-modal-title with-icon">',
    '<i class="wms-icon-share-large"></i>',
    '<span>Screen Share<br/>Extension Installation</span>',
    '</div>',
    '<p>You need a Chrome extension to share your screen. Install Screensharing Extension. Once you have installed, please, click the share screen button again.</p>',
    '<button id="btn-install-plugin-chrome" class="wms-btn-install">Accept</button>',
    '<button id="btn-cancel-plugin-chrome" class="wms-cancel-btn-install"></button>',
    '</div>',
    '</div>',
    '<div id="dialog-form-ff" class="wms-modal" style="display: none;">',
    '<div class="wms-modal-body">',
    '<div class="wms-modal-title with-icon">',
    '<i class="wms-icon-share-large"></i>',
    '<span>Screen Share<br/>Extension Installation</span>',
    '</div>',
    '<p>You need a Firefox extension to share your screen. Install Screensharing Extension. Once you have installed, refresh your browser and click the share screen button again.</p>',
    '<a href="#" id="btn-install-plugin-ff" class="wms-btn-install" href="">Install extension</a>',
    '<a href="#" id="btn-cancel-plugin-ff" class="wms-cancel-btn-install"></a>',
    '</div>',
    '</div>'
  ].join('\n');


  /**
   * Create a publisher for the screen.  If we're using annotation, we first need
   * to create the annotion window and get a reference to its annotation container
   * element so that we can pass it to the initPublisher function.
   * @returns {promise} < Resolve: [Object] Container element for annotation in external window >
   */
  var _initPublisher = function() {

    var createPublisher = function(publisherDiv) {

      var innerDeferred = $.Deferred();

      publisherDiv = publisherDiv || $('#videoHolderScreenShare');

      self.publisher = OT.initPublisher(publisherDiv, self.localScreenProperties, function(error) {
        if (error) {
          error.message = 'Error starting the screen sharing';
          innerDeferred.reject(error);
        } else {
          self.publisher.on('streamCreated', function(event) {
            console.log('streamCreated publisher screen', event.stream);
          });
          innerDeferred.resolve();
        }
      });

      return innerDeferred.promise();
    };

    var outerDeferred = $.Deferred();

    if (!!self.annotation) {

      self.accPack.setupExternalAnnotation()
        .then(function(annotationWindow) {
          self.annotationWindow = annotationWindow || null;
          var annotationElements = annotationWindow.createContainerElements();
          createPublisher(annotationElements.publisher)
            .then(function() {
              outerDeferred.resolve(annotationElements.annotation);
            });

        });
    } else {

      createPublisher()
        .then(function() {
          outerDeferred.resolve();
        });

    }

    return outerDeferred.promise();
  };


  /** 
   * Start publishing the screen
   * @param annotationContainer
   */
  var _publish = function(annotationContainer) {

    self.session.publish(self.publisher, function(error) {
      if (error) {
        console.log('Failed to connect: ', error.message);
        if (error.code == 1500 && navigator.userAgent.indexOf('Firefox') != -1) {
          $('#dialog-form-ff').toggle();
        } else {
          error.message = 'Error sharing the screen';
          console.log('Error sharing the screen' + error.code + ' - ' + error.message);
          if (error.code === 1010) {
            var errorStr = error.message + 'Check your network connection';
            error.message = errorStr;
          }
        }
      } else {
        self.accPack.linkAnnotation(self.publisher, annotationContainer, self.annotationWindow);
        _active = true;
        _triggerEvent('startScreenSharing');

      }
    });

  };

  /** 
   * Stop publishing the screen
   */
  var _stopPublishing = function() {
    self.session.unpublish(self.publisher);
    self.publisher = null;
  };

  var extensionAvailable = function(extensionID, extensionPathFF) {

    var deferred = $.Deferred();

    if (window.location.protocol === 'http:') {
      alert("Screensharing only works under 'https', please add 'https://' in front of your debugger url.");
      deferred.reject('https required');
    }

    OT.checkScreenSharingCapability(function(response) {
      console.log('checkScreenSharingCapability', response);
      if (!response.supported || !response.extensionRegistered) {
        alert('This browser does not support screen sharing! Please use Chrome, Firefox or IE!');
        deferred.reject('browser support not available');
      } else if (!response.extensionInstalled) {
        $('#dialog-form-chrome').toggle();
        deferred.reject('screensharing extension not installed');
      } else {
        deferred.resolve();
      }
    });

    return deferred.promise();

  };

  var _setupUI = function(parent) {
    $('body').append(screenDialogsExtensions);
    $(self.screenSharingControls).append(screenSharingControl);
    $(parent).append(screenSharingView);
  };

  var active = function(callActive) {
    console.log('does active ever get called?');
    $(screenSharingControl)[callActive ? 'show' : 'hide']();
  };

  var start = function() {
    extensionAvailable(self.extensionID, self.extensionPathFF)
      .then(_initPublisher)
      .then(_publish)
      .fail(function(error) {
        console.log('Error starting screensharing: ', error);
      });

  };

  var end = function(callEnded) {
    _stopPublishing();
    _active = false;
    callEnded && _toggleScreenSharingButton(false);
    _triggerEvent('endScreenSharing');
  };

  ScreenSharing.prototype = {
    constructor: ScreenSharing,
    active: active,
    extensionAvailable: extensionAvailable,
    start: start,
    end: end,
    onError: function(error) {
      console.log('OT: Screen sharing error: ', error);
    }
  };

  return ScreenSharing;

})();