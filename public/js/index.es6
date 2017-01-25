import 'whatwg-fetch'

mapboxgl.accessToken = 'pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ';
let map;
let offsetInMinutes;
let defaultPosition;
let allPhotos;
let mapLoadedPromise;


function setTime() {
  const localTime = moment().utcOffset(offsetInMinutes);
  document.getElementById("local-time").innerText = localTime.format("HH:mma");
}

function onPhotoFocus(e) {
  e.preventDefault();
  const el = e.currentTarget.querySelector('.js-photo');
  const focussedAlready = el.classList.contains('photo--focussed');
  onPhotoUnfocus();
  if (focussedAlready) return map.flyTo({
      center: defaultPosition,
      zoom: 12,
      bearing: 0,
      speed: 1,
      curve: 1.5
    });
  map.dragPan.disable();
  setTimeout(() => {
    document.querySelector('.photos__list').scrollLeft = el.offsetLeft - (window.outerWidth/2) + 160;
    el.classList.add('photo--focussed');
    document.querySelectorAll('.js-photos-list').forEach(function (el) {
      el.classList.add('photos--focussed');
    });
    const photoId = el.getAttribute('data-photo-id');
    const photoDetails = allPhotos.find(function(p) {
      return p.id === photoId;
    })
    if (photoDetails.location) {
      const latlng = [ photoDetails.location.longitude, photoDetails.location.latitude ];
      const intendedMapCenter = window.outerHeight * 0.7;
      const currentMapCenter = window.outerHeight / 2;

      const offset = intendedMapCenter - currentMapCenter + 22;
      map.flyTo({
        center: latlng,
        zoom: 12,
        bearing: 0,
        speed: 1,
        curve: 1.5,
        offset: [-4, -offset]
      });
      map.once('moveend', () => {
        el.classList.add('photo--highlighted');
      });

      const marker = new mapboxgl.Marker(document.querySelector(".marker--muted"))
        .setLngLat(latlng)
        .addTo(map);
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
  const { currentTimeZone } = profile;
  offsetInMinutes = currentTimeZone.offset / 60;
  setTime();
  setInterval(function () {
    setTime();
  }, 1000)
}

function renderLatestMoves(moves) {
  // only render the moves after the map is done loading
  mapLoadedPromise.then(() => {
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
        const el = document.createElement('div');
        el.className = 'marker';
        const marker = new mapboxgl.Marker(el)
          .setLngLat(latlng)
          .addTo(map);
      });
    });
  });
}

function renderTodayMoves(moves) {
  console.log(moves);
  const lastSeenAt = moment(moves[0].lastUpdate);
  const lastSeenPlace = moves[0].segments[moves[0].segments.length - 1];
  // document.getElementById("last-seen").innerText = lastSeenAt.format("Do MMM HH:mma");
  const location = lastSeenPlace.place.location;
  const latlng = [location.lon, location.lat];
  defaultPosition = latlng;
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jivings/cixd0oqdt00hv2qnvdzlx97xj',
    zoom: 5,
    center: latlng
  });

  mapLoadedPromise = new Promise((resolve, reject) => {
    map.on('load', () => {
      resolve();
    })
  });

  mapLoadedPromise.then(() => {
    setTimeout(() => {
      map.zoomTo(10, { animate: true, duration: 1500 });
    }, 2500);
  })

  const el = document.createElement('div');
  el.className = 'marker marker--primary';

  const marker = new mapboxgl.Marker(el)
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

document.body.setAttribute("data-loaded", true);
fetch("/moves/me")
  .then(body => {
    return body.json();
  })
  .then(({ profile }) => renderProfile(profile))
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

fetch("/moves/latest")
  .then(body => {
    return body.json();
  })
  .then(moves => renderLatestMoves(moves))
  .catch(err => {
    console.error(err);
  });

fetch("/photos")
  .then(body => {
    return body.json();
  })
  .then(images => {
    console.log(images);
    let photos = allPhotos = images.reduce((all, userImages) => {
      return all.concat(userImages.data);
    }, []);
    photos = photos.sort(function (a, b) { return b.created_time - a.created_time });

    document.querySelectorAll('.js-photo').forEach(function (p, i) {
      if (!photos[i]) return;
      p.setAttribute('data-photo-id', photos[i].id);
      p.innerHTML = '<img src="' + photos[i].images.standard_resolution.url + '"/>';
    });
    document.querySelector('.photos__list').scrollLeft = window.outerWidth / 2;

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
    });
  })
  .catch(err => {
    console.error(err);
  });