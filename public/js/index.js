(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],2:[function(require,module,exports){
'use strict';

require('whatwg-fetch');

mapboxgl.accessToken = 'pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ';
var map = void 0;
var offsetInMinutes = void 0;
var defaultPosition = void 0;
var allPhotos = void 0;
var mapLoadedPromise = void 0;

function setTime() {
  var localTime = moment().utcOffset(offsetInMinutes);
  document.getElementById("local-time").innerText = localTime.format("HH:mma");
}

function onPhotoFocus(e) {
  e.preventDefault();
  var el = e.currentTarget.querySelector('.js-photo');
  var focussedAlready = el.classList.contains('photo--focussed');
  onPhotoUnfocus();
  if (focussedAlready) return map.flyTo({
    center: defaultPosition,
    zoom: 12,
    bearing: 0,
    speed: 1,
    curve: 1.5
  });
  map.dragPan.disable();
  setTimeout(function () {
    document.querySelector('.photos__list').scrollLeft = el.offsetLeft - window.outerWidth / 2 + 160;
    el.classList.add('photo--focussed');
    document.querySelectorAll('.js-photos-list').forEach(function (el) {
      el.classList.add('photos--focussed');
    });
    var photoId = el.getAttribute('data-photo-id');
    var photoDetails = allPhotos.find(function (p) {
      return p.id === photoId;
    });
    if (photoDetails.location) {
      var latlng = [photoDetails.location.longitude, photoDetails.location.latitude];
      var intendedMapCenter = window.outerHeight * 0.7;
      var currentMapCenter = window.outerHeight / 2;

      var offset = intendedMapCenter - currentMapCenter + 22;
      map.flyTo({
        center: latlng,
        zoom: 12,
        bearing: 0,
        speed: 1,
        curve: 1.5,
        offset: [-4, -offset]
      });
      map.once('moveend', function () {
        el.classList.add('photo--highlighted');
      });

      var marker = new mapboxgl.Marker(document.querySelector(".marker--muted")).setLngLat(latlng).addTo(map);
    }
  }, 350);

  return false;
}

function onPhotoUnfocus() {
  document.querySelectorAll('.photos--focussed').forEach(function (el) {
    el.classList.remove('photos--focussed');
  });
  document.querySelectorAll('.photo--focussed').forEach(function (el) {
    el.classList.remove('photo--focussed');
  });
  document.querySelectorAll('.photo--highlighted').forEach(function (el) {
    el.classList.remove('photo--highlighted');
  });
  map.dragPan.enable();
}

function renderProfile(profile) {
  var currentTimeZone = profile.currentTimeZone;

  offsetInMinutes = currentTimeZone.offset / 60;
  setTime();
  setInterval(function () {
    setTime();
  }, 1000);
}

function renderLatestMoves(moves) {
  // only render the moves after the map is done loading
  mapLoadedPromise.then(function () {
    console.log(moves);
    var geojsonRoutes = moves.reduce(function (route, move) {
      var geojson = move.segments.filter(function (s) {
        return s.type === 'move';
      }).reduce(function (allMoves, moveSegment) {
        var points = moveSegment.activities[0].trackPoints;
        return allMoves.concat({
          "type": "Feature",
          "properties": {},
          "geometry": {
            "type": "LineString",
            "coordinates": points.map(function (p) {
              return [p.lon, p.lat];
            })
          }
        });
      }, []);
      if (geojson.length) {
        return route.concat(geojson);
      }
      return route;
    }, []);

    geojsonRoutes.forEach(function (route, i) {
      map.addSource('route' + i, {
        "type": "geojson",
        "data": route
      });
      map.addLayer({
        "id": "route" + i,
        "source": "route" + i,
        "type": "line",
        "paint": {
          "line-width": 2,
          "line-color": "rgba(0, 124, 191, 0.3)"
        }
      });
    });

    moves.forEach(function (move) {
      var geojson = move.segments.filter(function (s) {
        return s.type === 'place';
      }).forEach(function (placeSegment) {
        var points = placeSegment.place.location;
        var latlng = [points.lon, points.lat];
        var el = document.createElement('div');
        el.className = 'marker';
        var marker = new mapboxgl.Marker(el).setLngLat(latlng).addTo(map);
      });
    });
  });
}

function renderTodayMoves(moves) {
  console.log(moves);
  var lastSeenAt = moment(moves[0].lastUpdate);
  var lastSeenPlace = moves[0].segments[moves[0].segments.length - 1];
  // document.getElementById("last-seen").innerText = lastSeenAt.format("Do MMM HH:mma");
  var location = lastSeenPlace.place.location;
  var latlng = [location.lon, location.lat];
  defaultPosition = latlng;
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jivings/cixd0oqdt00hv2qnvdzlx97xj',
    zoom: 5,
    center: latlng
  });

  mapLoadedPromise = new Promise(function (resolve, reject) {
    map.on('load', function () {
      resolve();
    });
  });

  mapLoadedPromise.then(function () {
    setTimeout(function () {
      map.zoomTo(10, { animate: true, duration: 1500 });
    }, 2500);
  });

  var el = document.createElement('div');
  el.className = 'marker marker--primary';

  var marker = new mapboxgl.Marker(el).setLngLat(latlng).addTo(map);
  fetch("https://api.mapbox.com/geocoding/v5/mapbox.places/" + latlng + ".json?access_token=pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ").then(function (body) {
    return body.json();
  }).then(function (res) {
    document.getElementById("current-place").innerText = res.features[0].place_name;
  });
}

document.querySelectorAll('.js-photo-link').forEach(function (el) {
  el.addEventListener('click', onPhotoFocus);
});

document.body.setAttribute("data-loaded", true);
fetch("/moves/me").then(function (body) {
  return body.json();
}).then(function (_ref) {
  var profile = _ref.profile;
  return renderProfile(profile);
}).catch(function (err) {
  console.error(err);
});
fetch("/moves/today").then(function (body) {
  return body.json();
}).then(function (moves) {
  return renderTodayMoves(moves);
}).catch(function (err) {
  console.error(err);
});

fetch("/moves/latest").then(function (body) {
  return body.json();
}).then(function (moves) {
  return renderLatestMoves(moves);
}).catch(function (err) {
  console.error(err);
});

fetch("/photos").then(function (body) {
  return body.json();
}).then(function (images) {
  console.log(images);
  var photos = allPhotos = images.reduce(function (all, userImages) {
    return all.concat(userImages.data);
  }, []);
  photos = photos.sort(function (a, b) {
    return b.created_time - a.created_time;
  });

  document.querySelectorAll('.js-photo').forEach(function (p, i) {
    if (!photos[i]) return;
    p.setAttribute('data-photo-id', photos[i].id);
    p.innerHTML = '<img src="' + photos[i].images.standard_resolution.url + '"/>';
  });

  photos.forEach(function (photo) {
    if (!photo.location) return;
    var marker = {
      "type": "Feature",
      "properties": {
        "message": "Baz",
        "iconSize": [20, 20]
      },
      "geometry": {
        "type": "Point",
        "coordinates": [photo.location.longitude, photo.location.latitude]
      }
    };
  });
}).catch(function (err) {
  console.error(err);
});

},{"whatwg-fetch":1}]},{},[2]);
