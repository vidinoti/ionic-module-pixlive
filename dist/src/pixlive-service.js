import { Injectable, NgZone } from '@angular/core';
import { Platform } from 'ionic-angular';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
/**
 * Service for interacting with the PixLive SDK.
 * Call the init() method when starting your application.
 */
var PixliveService = (function () {
    function PixliveService(ngZone, platform) {
        this.ngZone = ngZone;
        this.platform = platform;
        /**
         * BehaviorSubject keeping track of the synchronization progress.
         */
        this.synchronizationProgress = new BehaviorSubject(101);
        this.annotationPresence = new Subject();
        this.eventFromContent = new Subject();
        this.enterContext = new Subject();
        this.exitContext = new Subject();
        this.qrCodeSynchronization = new Subject();
        this.codeRecognition = new Subject();
        this.generatedCoupon = new Subject();
        this.synchronizationRequest = new Subject();
    }
    /**
     * Initializes the SDK. In particular, it registers several listeners for the PixLive events.
     * @param gcmSenderId the Google GCM sender ID for the push notifications. Leave it empty if you do not want to enable it.
     */
    PixliveService.prototype.init = function (gcmSenderId) {
        var _this = this;
        this.platform.ready().then(function () {
            if (window.cordova) {
                if (gcmSenderId) {
                    window.cordova.plugins.PixLive.setNotificationsSupport(true, gcmSenderId);
                }
                // Listen for different PixLive events
                window.cordova.plugins.PixLive.onEventReceived = function (event) {
                    _this.ngZone.run(function () {
                        if (event.type === 'presentAnnotations') {
                            _this.annotationPresence.next(true);
                        }
                        else if (event.type === 'hideAnnotations') {
                            _this.annotationPresence.next(false);
                        }
                        else if (event.type === 'eventFromContent') {
                            _this.onNewEventFromContent(event);
                        }
                        else if (event.type === 'enterContext') {
                            //Example: {"type":"enterContext","context":"q7044o3xhfqkc7q"}
                            _this.enterContext.next(event.context);
                        }
                        else if (event.type === 'exitContext') {
                            //Example: {"type":"exitContext","context":"q7044o3xhfqkc7q"}
                            _this.exitContext.next(event.context);
                        }
                        else if (event.type === 'syncProgress') {
                            _this.synchronizationProgress.next(parseInt('' + (event.progress * 100)));
                        }
                        else if (event.type === 'codeRecognize') {
                            //Example: {"type":"codeRecognize","codeType":"qrcode","code":"pixliveplayer/default"}
                            var code = event.code;
                            if (code.indexOf('pixliveplayer/') === 0) {
                                var tag = code.substring(14);
                                _this.qrCodeSynchronization.next(tag);
                            }
                            else {
                                _this.codeRecognition.next(code);
                            }
                        }
                        else if (event.type === 'requireSync') {
                            var tags = event.tags;
                            _this.synchronizationRequest.next(tags);
                        }
                    });
                };
            }
        });
    };
    PixliveService.prototype.onNewEventFromContent = function (event) {
        //Example: {"type":"eventFromContent","eventName":"multipleChoice","eventParams":"{\"question\":\"Quel est la profondeur du lac de gruyere?\",\"answers\":[\"1m\",\"10m\",\"100m\"],\"correctAnswer\":2,\"hint\":\"On peut se noyer\"}"}
        var eventFromContent = new EventFromContent();
        eventFromContent.name = event.eventName;
        eventFromContent.params = event.eventParams;
        this.eventFromContent.next(eventFromContent);
        if (event.eventName === 'couponGenerated') {
            var params = JSON.parse(event.eventParams);
            var coupon = new GeneratedCoupon(params.contextId, params.url);
            this.generatedCoupon.next(coupon);
        }
    };
    /**
     * Gets an observable that is called when a content requests a synchronization with
     * a list of tags (Context synchronization trigger)
     */
    PixliveService.prototype.getSynchronizationRequestObservable = function () {
        return this.synchronizationRequest.asObservable();
    };
    /**
     * Gets an observable that is called every time a new coupon is generated
     * via a coupon content.
     */
    PixliveService.prototype.getGeneratedCouponObservable = function () {
        return this.generatedCoupon.asObservable();
    };
    /**
     * Gets an observable for listening on synchronization progress. The last known
     * value is given when the listener subscribes to the observable.
     * A value of 100 means that the synchronization is over.
     * A value above 100 means that an error occured during the synchronization.
     */
    PixliveService.prototype.getSynchronizationProgress = function () {
        return this.synchronizationProgress.asObservable();
    };
    /**
     * Gets an observable that is called when the event "presentAnnotations" or
     * "hideAnnotations" (true/false respectively) is called. It informs that
     * an AR annotation is being displayed or not.
     */
    PixliveService.prototype.getAnnotationPresenceObservable = function () {
        return this.annotationPresence.asObservable();
    };
    /**
     * Gets an observable that is called when an event from content is triggered (e.g. coupon)
     */
    PixliveService.prototype.getEventFromContentObservable = function () {
        return this.eventFromContent.asObservable();
    };
    /**
     * Gets an observable that is called when a context is entered (i.e. activated). It gives
     * the public ID of the context.
     */
    PixliveService.prototype.getEnterContextObservable = function () {
        return this.enterContext.asObservable();
    };
    /**
     * Gets an observable that is called when a context is exited. It gives
     * the public ID of the context.
     */
    PixliveService.prototype.getExitContextObservable = function () {
        return this.exitContext.asObservable();
    };
    /**
     * Gets an observable that is called when a code (e.g. QR code) is recognized.
     * It gives the content of the code. See also getQrCodeSynchronizationRequest().
     */
    PixliveService.prototype.getCodeRecognition = function () {
        return this.codeRecognition.asObservable();
    };
    /**
     * Gets an observable that is called when a synchronization QR code is scanned.
     * It gives the tag to synchronize
     */
    PixliveService.prototype.getQrCodeSynchronizationRequest = function () {
        return this.qrCodeSynchronization.asObservable();
    };
    /**
     * Synchronize the PixLive SDK with the web platform.
     * The synchronization can be done in different ways.
     *
     * 1) The synchronization can be done without using the tags, in this case, an empty
     * array is given as parameter.
     *
     * 2) The syncronization can be done with one or more tags. Use an array of strings: ['tag1', 'tag2'].
     * In this case, all contents having one or more of the given tags will be synchronized.
     * Think of it as => (tag1 OR tag2).
     *
     * 3) The synchronization can be done with a combination of tags. Example: [['lang_en', 'tag1'], ['lang_en', 'tag2']].
     * In this case, the contents having tags 'lang_en' AND 'tag1' will be synchonized together with the contents having the 'lang_en' AND 'tag2'.
     * Think of it as => (lang_en AND tag1) OR (lang_en AND tag2).
     *
     * @param tags
     */
    PixliveService.prototype.sync = function (tags) {
        var _this = this;
        this.synchronizationProgress.next(0);
        this.platform.ready().then(function () {
            if (window.cordova) {
                window.cordova.plugins.PixLive.synchronize(tags, function (contexts) {
                    _this.ngZone.run(function () {
                        _this.synchronizationProgress.next(100);
                    });
                }, function (reason) {
                    _this.ngZone.run(function () {
                        _this.synchronizationProgress.next(102);
                    });
                });
            }
            else {
                // The plugin is not available, we simulate a synchronization for development.
                setTimeout(function () {
                    _this.synchronizationProgress.next(25);
                    setTimeout(function () {
                        _this.synchronizationProgress.next(50);
                        setTimeout(function () {
                            _this.synchronizationProgress.next(75);
                            setTimeout(function () {
                                _this.synchronizationProgress.next(103);
                            }, 500);
                        }, 500);
                    }, 500);
                }, 500);
            }
        });
    };
    /**
     * Gets the nearby GPS points
     * @param latitude the current latitude
     * @param longitude the current longitude
     */
    PixliveService.prototype.getNearbyGpsPoints = function (latitude, longitude) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.getNearbyGPSPoints(latitude, longitude, function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('getNearbyGpsPoints failed');
                });
            }
            else {
                reject('getNearbyGpsPoints failed: no cordova plugin');
            }
        });
    };
    /**
     * Checks whether there are beacon contexts.
     */
    PixliveService.prototype.isContainingBeacons = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.isContainingBeacons(function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('isContainingBeacons failed');
                });
            }
            else {
                reject('isContainingBeacons failed: no cordova plugin');
            }
        });
    };
    /**
     * Checks whether there are GPS contexts.
     */
    PixliveService.prototype.isContainingGPSPoints = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.isContainingGPSPoints(function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('isContainingGPSPoints failed');
                });
            }
            else {
                reject('isContainingGPSPoints failed: no cordova plugin');
            }
        });
    };
    /**
     * Gets the nearby beacons
     */
    PixliveService.prototype.getNearbyBeacons = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.getNearbyBeacons(function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('getNearbyBeacons failed');
                });
            }
            else {
                reject('getNearbyBeacons failed: no cordova plugin');
            }
        });
    };
    /**
     * Retrieves the nearby status.
     */
    PixliveService.prototype.getNearbyStatus = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.getNearbyStatus(function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('getNearbyStatus failed');
                });
            }
            else {
                reject('getNearbyStatus failed: no cordova plugin');
            }
        });
    };
    /**
     * Gets all GPS points in the given bounding box.
     * @param minLat the minimum latitude
     * @param minLon the minimum longitude
     * @param maxLat the maximum latitude
     * @param maxLon the maximum longitude
     */
    PixliveService.prototype.getGpsPointsInBoundingBox = function (minLat, minLon, maxLat, maxLon) {
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.getGPSPointsInBoundingBox(minLat, minLon, maxLat, maxLon, function (data) {
                    resolve(data);
                }, function () {
                    reject('Error');
                });
            }
            else {
                reject('No cordova plugin');
            }
        });
    };
    /**
     * Return the specified context
     * @param contextId the ID of the context
     */
    PixliveService.prototype.getContext = function (contextId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.getContext(contextId, function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('getContext failed');
                });
            }
            else {
                reject('getContext failed: no cordova plugin');
            }
        });
    };
    /**
     * Opens the given context
     * @param contextId the ID of the context to open
     */
    PixliveService.prototype.activate = function (contextId) {
        this.getContext(contextId).then(function (context) { return context.activate(); });
    };
    /**
     * Opens the given URL using the SDK browser
     * @param url a link
     */
    PixliveService.prototype.openURLInInternalBrowser = function (url) {
        if (window.cordova) {
            window.cordova.plugins.PixLive.openURLInInternalBrowser(url);
        }
    };
    /**
     * Computes the distance between to GPS points
     * @param latitude1 the latitude of the first point
     * @param longitude1 the longitude of the first point
     * @param latitude2 the latitude of the second point
     * @param longitude2 the longitude of the second point
     */
    PixliveService.prototype.computeDistanceBetweenGPSPoints = function (latitude1, longitude1, latitude2, longitude2) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (window.cordova) {
                window.cordova.plugins.PixLive.computeDistanceBetweenGPSPoints(latitude1, longitude1, latitude2, longitude2, function (data) {
                    _this.ngZone.run(function () {
                        resolve(data);
                    });
                }, function () {
                    reject('computeDistanceBetweenGPSPoints failed');
                });
            }
            else {
                reject('computeDistanceBetweenGPSPoints failed: no cordova plugin');
            }
        });
    };
    PixliveService.decorators = [
        { type: Injectable },
    ];
    /** @nocollapse */
    PixliveService.ctorParameters = function () { return [
        { type: NgZone, },
        { type: Platform, },
    ]; };
    return PixliveService;
}());
export { PixliveService };
/**
 * Class representing a PixLive Maker GPS point.
 */
var GPSPoint = (function () {
    function GPSPoint() {
    }
    return GPSPoint;
}());
export { GPSPoint };
/**
 * Class representing a Context.
 */
var Context = (function () {
    function Context() {
    }
    return Context;
}());
export { Context };
/**
 * Class representing a Event triggered by a content
 */
var EventFromContent = (function () {
    function EventFromContent() {
    }
    return EventFromContent;
}());
export { EventFromContent };
/**
 * Class containing the status of nearby (location permission and location/bluetooth on/off)
 */
var NearbyStatus = (function () {
    function NearbyStatus() {
    }
    return NearbyStatus;
}());
export { NearbyStatus };
/**
 * Coupon received via an "eventFromContent" event
 */
var GeneratedCoupon = (function () {
    function GeneratedCoupon(contextId, couponUrl) {
        this.contextId = contextId;
        this.couponUrl = couponUrl;
    }
    return GeneratedCoupon;
}());
export { GeneratedCoupon };
//# sourceMappingURL=pixlive-service.js.map