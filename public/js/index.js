mapboxgl.accessToken = 'pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jivings/cixd0oqdt00hv2qnvdzlx97xj',
    zoom: 5,
    center: [4.899, 52.372]
});

var offsetInMinutes;
var defaultPosition;
var allPhotos;

map.on('load', () => {
  document.body.setAttribute("data-loaded", true);
  fetch("/moves/me")
  .then(body => {
    return body.json();
  })
  .then(({ profile }) => renderProfile(profile))
  .catch(err => {
    console.error(err);
  });

fetch("/moves/latest")
  .then(body => {
    return body.json();
  })
  .then(moves => renderLatestMoves(moves))
  .catch(err => {
    console.error(err);
  });

fetch("/moves/today")
  .then(body => {
    return body.json();
  })
  .then(moves => renderTodayMoves(moves))
  .catch(err => {
    console.error(err);
  });

fetch("/photos")
  .then(body => {
    return body.json();
  })
  .then(images => {
    console.log(images);
    var photos = allPhotos = images.reduce((all, userImages) => {
      return all.concat(userImages.data);
    }, []);
    photos = photos.sort(function (a, b) { return b.created_time - a.created_time });

    document.querySelectorAll('.js-photo').forEach(function (p, i) {
      if (!photos[i]) return;
      p.setAttribute('data-photo-id', photos[i].id);
      p.innerHTML = '<img src="' + photos[i].images.standard_resolution.url + '"/>';
    });

    photos.forEach(photo => {
      if (!photo.location) return;
      const marker = {
        "type": "Feature",
        "properties": {
          "message": "Baz",
          "iconSize": [20, 20]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            photo.location.longitude,
            photo.location.latitude
          ]
        }
      };
      // var el = document.createElement('div');
      // el.className = 'image-marker';
      // el.style.backgroundImage = 'url('+photo.images.thumbnail.url+')';
      // el.style.width = marker.properties.iconSize[0] + 'px';
      // el.style.height = marker.properties.iconSize[1] + 'px';

      // new mapboxgl.Marker(el)
      //   .setLngLat(marker.geometry.coordinates)
      //   .addTo(map);
      // el.addEventListener('click', function() {
      //   window.alert(marker.properties.message);
      // });
    });
  })
  .catch(err => {
    console.error(err);
  });
})


function setTime() {
  const localTime = moment().utcOffset(offsetInMinutes);
  document.getElementById("local-time").innerText = localTime.format("HH:mma");
}

function onPhotoFocus(e) {
  e.preventDefault();
  var el = e.currentTarget.querySelector('.js-photo');
  var focussedAlready = el.classList.contains('photo--focussed');
  onPhotoUnfocus();
  if (focussedAlready) return map.panTo(defaultPosition);
  el.classList.add('photo--focussed');
  document.querySelectorAll('.js-photos-list').forEach(function (el) {
    el.classList.add('photos--focussed');
  });
  var photoId = el.getAttribute('data-photo-id');
  var photoDetails = allPhotos.find(function(p) {
    return p.id === photoId;
  })
  if (photoDetails.location) {
    var latlng = [ photoDetails.location.longitude, photoDetails.location.latitude ];
    map.panTo(latlng);
    var marker = new mapboxgl.Marker(document.querySelector(".marker--muted"))
      .setLngLat(latlng)
      .addTo(map);
  }

  return false;
}

function onPhotoUnfocus() {
  document.querySelectorAll('.photos--focussed').forEach(function (el) {
    el.classList.remove('photos--focussed');
  });
  document.querySelectorAll('.photo--focussed').forEach(function (el) {
    el.classList.remove('photo--focussed');
  });

}

function renderProfile(profile) {
  const { currentTimeZone } = profile;
  offsetInMinutes = currentTimeZone.offset / 60;
  setTime();
  setInterval(function () {
    setTime();
  }, 1000)
}

function renderLatestMoves(moves) {
  console.log(moves);
  const geojsonRoutes = moves.reduce((route, move) => {
    const geojson = move.segments.filter(s => {
      return s.type === 'move';
    }).reduce((allMoves, moveSegment) => {
      const points = moveSegment.activities[0].trackPoints;
      return allMoves.concat({
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": points.map(p => {
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

  geojsonRoutes.forEach((route, i) => {
    map.addSource('route'+i, {
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

  moves.forEach((move) => {
    const geojson = move.segments.filter(s => {
      return s.type === 'place';
    }).forEach((placeSegment) => {
      const points = placeSegment.place.location;
      const latlng = [points.lon, points.lat];
      var el = document.createElement('div');
      el.className = 'marker';
      var marker = new mapboxgl.Marker(el)
        .setLngLat(latlng)
        .addTo(map);
    });
  });
}

function renderTodayMoves(moves) {
  console.log(moves);
  const lastSeenAt = moment(moves[0].lastUpdate);
  const lastSeenPlace = moves[0].segments[moves[0].segments.length - 1];
  // document.getElementById("last-seen").innerText = lastSeenAt.format("Do MMM HH:mma");
  const location = lastSeenPlace.place.location;
  var latlng = [location.lon, location.lat];
  defaultPosition = latlng;
  map.panTo(latlng);
  var el = document.createElement('div');
  el.className = 'marker marker--primary';

  var marker = new mapboxgl.Marker(el)
    .setLngLat(latlng)
    .addTo(map);
  fetch("https://api.mapbox.com/geocoding/v5/mapbox.places/"+latlng+".json?access_token=pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ")
    .then(body => body.json())
    .then(res => {
      document.getElementById("current-place").innerText = res.features[0].place_name;
    })
}

document.querySelectorAll('.js-photo-link').forEach(function (el) {
  el.addEventListener('click', onPhotoFocus);
});